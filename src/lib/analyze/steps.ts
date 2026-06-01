// 자동 분석 파이프라인을 3단계로 분리한 공유 모듈.
// Vercel 함수는 maxDuration 300초가 하드 캡이라, 웹검색이 들어가는 무거운 단계를
// 각각 별도의 함수 호출(별도 API 라우트)로 실행해야 한 호출이 300초를 넘지 않는다.
//   1) runAngles  : DART 조회 + 멀티패스 각도 생성 + 종합 + 중요도 임계값 선정
//   2) runDetails : 선정된 각도 멀티패스 상세분석 + 종합 + 출처 첨부
//   3) runCards   : 전문 용어 추출 + 카드뉴스 생성(폴백 포함)
import Anthropic from '@anthropic-ai/sdk';
import { enrichWithDart } from '@/lib/dart';
import type { DartEnrichedData } from '@/lib/dart';
import { extractTextAndSources, parseJSON, buildDartSources, mergeSources } from '@/lib/sources';
import type { SourceCitation } from '@/lib/types/stock';
import {
  createSession,
  completeSession,
  saveMultipassRaw,
  saveAngles,
  saveAnalysisResults,
  saveTerms,
  saveFinalOutput,
} from '@/lib/supabase';

// ─── 공용 타입 ──────────────────────────────────────────────
export interface Angle {
  id: string;
  label: string;
  description: string;
  source: string;
  importance: number;
  confidence?: number;
}

export interface AnalysisItem {
  angleId: string;
  title: string;
  summary: string;
  keyPoints: string[];
  sentiment: string;
  confidence?: number;
  sources?: SourceCitation[];
}

export interface Term {
  id: string;
  word: string;
  definition: string;
  analogy: string;
}

export interface DartStatus {
  found: boolean;
  corpName: string | null;
  stockCode: string | null;
  disclosureCount: number;
  disclosures: Array<{ reportNm: string; receiptDate: string; url: string }>;
}

// ─── 설정값 ────────────────────────────────────────────────
// 각도 선정: 중요도가 이 값 이상이면 모두 선택 (개수 고정 X)
const IMPORTANCE_THRESHOLD = 7;
// 토큰/시간 폭주 방지를 위한 안전 상한
const MAX_ANGLES = 10;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function hasSupabase(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

function buildDartContext(dart: DartEnrichedData): string {
  const lines: string[] = ['[전자공시 데이터 (DART)]'];
  if (dart.company) {
    const c = dart.company;
    lines.push(`- 정식명칭: ${c.corp_name}`);
    lines.push(`- 종목코드: ${c.stock_code}`);
    lines.push(`- 대표자: ${c.ceo_nm}`);
    lines.push(`- 법인구분: ${c.corp_cls === 'Y' ? '유가증권' : c.corp_cls === 'K' ? '코스닥' : c.corp_cls === 'N' ? '코넥스' : '기타'}`);
    lines.push(`- 업종코드: ${c.induty_code}`);
    lines.push(`- 설립일: ${c.est_dt}`);
    lines.push(`- 결산월: ${c.acc_mt}월`);
    if (c.adres) lines.push(`- 주소: ${c.adres}`);
    if (c.hm_url) lines.push(`- 홈페이지: ${c.hm_url}`);
  }
  if (dart.recentDisclosures.length > 0) {
    lines.push('\n[최근 공시]');
    for (const d of dart.recentDisclosures.slice(0, 10)) {
      lines.push(`- ${d.rcept_dt} | ${d.report_nm} (접수번호: ${d.rcept_no})`);
    }
  }
  return lines.join('\n');
}

function toDartStatus(dart: DartEnrichedData | null): DartStatus {
  return {
    found: !!dart,
    corpName: dart?.company?.corp_name ?? null,
    stockCode: dart?.stockCode ?? null,
    disclosureCount: dart?.recentDisclosures.length ?? 0,
    disclosures: (dart?.recentDisclosures ?? []).map((d) => ({
      reportNm: d.report_nm,
      receiptDate: d.rcept_dt,
      url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${d.rcept_no}`,
    })),
  };
}

async function callWithSearch(system: string, prompt: string) {
  return anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8192,
    system,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
    messages: [{ role: 'user', content: prompt }],
  });
}

async function callSimple(system: string, prompt: string, maxTokens = 4096) {
  return anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
  });
}

// 카드뉴스 파싱이 끝내 실패해도 분석 결과로 최소한의 카드를 구성해 사용자에게 결과를 보여준다.
function buildFallbackCards(stockName: string, analysis: AnalysisItem[], terms: Term[]) {
  const cards: Array<Record<string, unknown>> = [
    { type: 'cover', title: `${stockName} 분석`, content: `${stockName}에 대한 자동 분석 결과입니다.`, keyPoints: [], sentiment: 'neutral', terms: [] },
  ];
  for (const a of analysis) {
    cards.push({ type: 'analysis', title: a.title, content: a.summary, keyPoints: a.keyPoints ?? [], sentiment: a.sentiment ?? 'neutral', terms: [] });
  }
  if (terms.length > 0) {
    cards.push({ type: 'terms', title: '주요 용어', content: '', keyPoints: terms.map((t) => `${t.word}: ${t.definition}`), sentiment: 'neutral', terms });
  }
  cards.push({ type: 'summary', title: '요약', content: `${stockName} 분석 요약`, keyPoints: analysis.map((a) => a.title), sentiment: 'neutral', terms: [] });
  return cards;
}

// ─── Step 0: DART 상태만 빠르게 조회 (UI 배지 즉시 표시용) ───
// DART 자체는 ~0.3초로 빠른데, 각도 생성(웹검색 1~3분)과 한 호출에 묶이면
// 사용자에게는 "DART 조회"가 오래 걸리는 것처럼 보인다. 분리해 배지를 먼저 띄운다.
export async function fetchDartStatus(stockName: string): Promise<DartStatus> {
  const dartData = await enrichWithDart(stockName);
  return toDartStatus(dartData);
}

// ─── Step 1: DART + 각도 생성 + 선정 ────────────────────────
export interface AnglesResult {
  sessionId?: string;
  stockName: string;
  stockCode: string | null;
  dart: DartStatus;
  angles: Angle[];
  selectedAngles: Angle[];
}

export async function runAngles(stockName: string, passCount = 3): Promise<AnglesResult> {
  let sessionId: string | undefined;
  if (hasSupabase()) {
    sessionId = await createSession(stockName, 'auto').catch(() => undefined);
  }

  // DART 조회
  const dartData = await enrichWithDart(stockName);
  const dartContext = dartData ? buildDartContext(dartData) : '';

  // 멀티패스 각도 생성 (web_search)
  const anglesSystem = `당신은 주식 분석 전문가입니다. 종목에 대해 분석 각도를 제안하세요.
두 가지 소스로 분리: "news" (뉴스/이슈 기반 4~6개), "dart" (전자공시 기반 3~5개).
각 꼭지에 importance(1~10)를 부여. 반드시 JSON 배열로만 응답. <cite> 태그 금지.
[{"id":"kebab-case","label":"한글제목","description":"설명","source":"news|dart","importance":숫자}]`;
  const anglesPrompt = `종목명: ${stockName}${dartContext ? '\n\n' + dartContext : ''}\n\n7~10개의 분석 각도를 제안해주세요. 웹 검색으로 최신 뉴스를 반드시 반영하세요.`;

  const anglesResults = await Promise.allSettled(
    Array.from({ length: passCount }, () => callWithSearch(anglesSystem, anglesPrompt)),
  );

  const rawAngles: unknown[] = [];
  for (let i = 0; i < anglesResults.length; i++) {
    const r = anglesResults[i];
    if (r.status === 'fulfilled') {
      try {
        const { text } = extractTextAndSources(r.value);
        const parsed = parseJSON(text);
        rawAngles.push(parsed);
        if (sessionId && hasSupabase()) {
          await saveMultipassRaw(sessionId, 'angles', i, parsed).catch(() => {});
        }
      } catch (parseErr) {
        console.error(`각도 패스 ${i} 파싱 실패:`, parseErr);
      }
    }
  }

  if (rawAngles.length === 0) throw new Error('각도 생성 실패');

  // 각도 종합
  let angles: Angle[];
  if (rawAngles.length === 1) {
    angles = rawAngles[0] as Angle[];
  } else {
    try {
      const synthResp = await callSimple(
        '여러 번 수행된 분석 각도를 종합하세요. 중복=confidence 높게. 반드시 JSON 배열로만 응답하세요. 다른 텍스트 금지.',
        `다음 ${rawAngles.length}개 결과를 종합하세요:\n\n${rawAngles.map((r, i) => `=== 패스 ${i + 1} ===\n${JSON.stringify(r, null, 2)}`).join('\n\n')}\n\nJSON 배열로만 응답: [{"id":"...","label":"...","description":"...","source":"news|dart","importance":숫자,"confidence":1~5}]`,
        8192,
      );
      const { text } = extractTextAndSources(synthResp);
      angles = parseJSON(text) as Angle[];
    } catch (synthErr) {
      console.error('각도 종합 실패, 첫 번째 패스 결과 사용:', synthErr);
      angles = rawAngles[0] as Angle[];
    }
  }

  // 중요도 임계값 기반 선택: 중요도 내림차순(동점이면 신뢰도 높은 순), 임계값 이상 전부, 안전 상한
  const sorted = [...angles].sort((a, b) => {
    if (b.importance !== a.importance) return b.importance - a.importance;
    return (b.confidence ?? 0) - (a.confidence ?? 0);
  });
  const qualified = sorted.filter((a) => a.importance >= IMPORTANCE_THRESHOLD);
  const selectedAngles = (qualified.length > 0 ? qualified : sorted).slice(0, MAX_ANGLES);

  if (sessionId && hasSupabase()) {
    await saveAngles(sessionId, angles as never[], selectedAngles.map((a) => a.id)).catch(() => {});
  }

  return {
    sessionId,
    stockName,
    stockCode: dartData?.stockCode ?? null,
    dart: toDartStatus(dartData),
    angles,
    selectedAngles,
  };
}

// ─── Step 2: 멀티패스 상세분석 + 종합 + 출처 ─────────────────
export interface DetailsResult {
  analysis: AnalysisItem[];
  sources: SourceCitation[];
}

export async function runDetails(
  stockName: string,
  selectedAngles: Angle[],
  passCount = 3,
  sessionId?: string,
): Promise<DetailsResult> {
  // DART 컨텍스트/출처는 빠른 재조회로 확보 (정적 corp-map + ~1s 호출)
  const dartData = await enrichWithDart(stockName);
  const dartContext = dartData ? buildDartContext(dartData) : '';
  const dartSources = dartData ? buildDartSources(dartData.recentDisclosures) : [];

  const analysisSystem = `당신은 주식 분석 전문가입니다. 각 분석 각도에 대해 상세 분석하세요.
DART 데이터와 웹 검색 결과를 근거로 활용하세요. <cite> 태그 금지.
JSON 배열로만 응답: [{"angleId":"...","title":"...","summary":"...","keyPoints":["..."],"sentiment":"positive|neutral|negative"}]`;
  const analysisPrompt = `종목명: ${stockName}\n분석 각도:\n${JSON.stringify(selectedAngles, null, 2)}${dartContext ? '\n\n' + dartContext : ''}\n\n각 각도를 상세 분석하세요. 웹 검색으로 최신 정보를 반영하세요.`;

  const analysisResults = await Promise.allSettled(
    Array.from({ length: passCount }, () => callWithSearch(analysisSystem, analysisPrompt)),
  );

  const rawAnalysis: unknown[] = [];
  const allAnalysisSources: SourceCitation[] = [];

  for (let i = 0; i < analysisResults.length; i++) {
    const r = analysisResults[i];
    if (r.status === 'fulfilled') {
      try {
        const { text, sources } = extractTextAndSources(r.value);
        allAnalysisSources.push(...sources);
        const parsed = parseJSON(text);
        rawAnalysis.push(parsed);
        if (sessionId && hasSupabase()) {
          await saveMultipassRaw(sessionId, 'analysis', i, parsed).catch(() => {});
        }
      } catch (parseErr) {
        console.error(`분석 패스 ${i} 파싱 실패:`, parseErr);
      }
    }
  }

  if (rawAnalysis.length === 0) throw new Error('분석 실패');

  // 분석 종합
  let analysis: AnalysisItem[];
  if (rawAnalysis.length === 1) {
    analysis = rawAnalysis[0] as AnalysisItem[];
  } else {
    try {
      const synthResp = await callSimple(
        '여러 번 수행된 분석 결과를 종합하세요. 중복 포인트=confidence 높게. 반드시 JSON 배열로만 응답하세요. 다른 텍스트 금지.',
        `다음 ${rawAnalysis.length}개 결과를 종합하세요:\n\n${rawAnalysis.map((r, i) => `=== 패스 ${i + 1} ===\n${JSON.stringify(r, null, 2)}`).join('\n\n')}\n\nJSON 배열로만 응답: [{"angleId":"...","title":"...","summary":"...","keyPoints":["..."],"sentiment":"positive|neutral|negative","confidence":1~5}]`,
        8192,
      );
      const { text } = extractTextAndSources(synthResp);
      analysis = parseJSON(text) as AnalysisItem[];
    } catch (synthErr) {
      console.error('분석 종합 실패, 첫 번째 패스 결과 사용:', synthErr);
      analysis = rawAnalysis[0] as AnalysisItem[];
    }
  }

  // 분석 결과에 출처 첨부 (DART 각도는 공시 출처, 그 외는 웹검색 출처)
  const webSources = allAnalysisSources;
  analysis = analysis.map((a) => {
    const angle = selectedAngles.find((sa) => sa.id === a.angleId);
    const isDart = angle?.source === 'dart';
    return { ...a, sources: isDart ? dartSources.slice(0, 5) : webSources.slice(0, 5) };
  });

  if (sessionId && hasSupabase()) {
    await saveAnalysisResults(sessionId, analysis as never[]).catch(() => {});
  }

  return { analysis, sources: mergeSources(webSources, dartSources) };
}

// ─── Step 3: 용어 추출 + 카드뉴스 생성 ──────────────────────
export interface CardsResult {
  terms: Term[];
  output: unknown;
}

export async function runCards(
  stockName: string,
  analysis: AnalysisItem[],
  sessionId?: string,
): Promise<CardsResult> {
  // 용어는 부가 정보이므로 파싱 실패해도 전체를 중단하지 않고 건너뛴다.
  let terms: Term[] = [];
  try {
    const termsResp = await callSimple(
      `금융 전문 용어를 추출하세요. JSON 배열로만 응답: [{"id":"...","word":"...","definition":"...","analogy":"..."}]`,
      `분석 결과:\n${JSON.stringify(analysis, null, 2)}\n\n일반인이 어려워할 전문 용어를 추출하세요.`,
    );
    const { text: termsText } = extractTextAndSources(termsResp);
    terms = parseJSON(termsText) as Term[];
  } catch (termsErr) {
    console.error('용어 추출 파싱 실패, 용어 생략:', termsErr);
  }

  if (sessionId && hasSupabase()) {
    await saveTerms(sessionId, terms as never[], terms.map((t) => t.id)).catch(() => {});
  }

  // 카드뉴스: 각도가 많으면 출력이 길어져 잘릴 수 있어 토큰을 넉넉히 주고,
  // 실패 시 엄격 모드 1회 재시도 → 그래도 안 되면 분석 결과로 폴백.
  const cardSystem = `콘텐츠 제작 전문가. 분석 결과를 카드뉴스로 변환. JSON 배열로만 응답.
[{"type":"cover|analysis|terms|summary","title":"...","content":"...","keyPoints":[...],"sentiment":"...","terms":[...]}]
구성: 표지(1) + 꼭지별 분석(각 1장) + 용어(1장) + 요약(1장)`;
  const cardPrompt = `종목명: ${stockName}\n출력 형식: card-news\n분석 결과:\n${JSON.stringify(analysis, null, 2)}\n용어:\n${JSON.stringify(terms, null, 2)}\n\n카드뉴스로 변환하세요.`;

  async function generateCards(strict: boolean) {
    const sys = strict
      ? cardSystem + '\n\n반드시 완결된(잘리지 않은) JSON 배열만 출력하세요. 설명·마크다운·코드블록 금지.'
      : cardSystem;
    const resp = await callSimple(sys, cardPrompt, 8192);
    const { text } = extractTextAndSources(resp);
    return parseJSON(text);
  }

  let output: unknown;
  try {
    output = await generateCards(false);
  } catch (firstErr) {
    console.error('카드뉴스 파싱 1차 실패, 엄격 모드로 재시도:', firstErr);
    try {
      output = await generateCards(true);
    } catch (secondErr) {
      console.error('카드뉴스 재시도도 실패, 분석 결과로 폴백:', secondErr);
      output = buildFallbackCards(stockName, analysis, terms);
    }
  }

  if (sessionId && hasSupabase()) {
    await saveFinalOutput(sessionId, 'card-news', output).catch(() => {});
    await completeSession(sessionId).catch(() => {});
  }

  return { terms, output };
}
