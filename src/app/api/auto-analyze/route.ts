import type { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { enrichWithDart } from '@/lib/dart';
import type { DartEnrichedData } from '@/lib/dart';
import { extractTextAndSources, parseJSON, buildDartSources, mergeSources } from '@/lib/sources';
import type { SourceCitation } from '@/lib/types/stock';
import {
  createSession,
  completeSession,
  failSession,
  saveMultipassRaw,
  saveAngles,
  saveAnalysisResults,
  saveTerms,
  saveFinalOutput,
} from '@/lib/supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
    lines.push('\n[최근 정기공시]');
    for (const d of dart.recentDisclosures.slice(0, 10)) {
      lines.push(`- ${d.rcept_dt} | ${d.report_nm} (접수번호: ${d.rcept_no})`);
    }
  }
  return lines.join('\n');
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
function buildFallbackCards(
  stockName: string,
  analysis: Array<{ title: string; summary: string; keyPoints: string[]; sentiment: string }>,
  terms: Array<{ word: string; definition: string }>,
) {
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

export const maxDuration = 300;
// DART는 한국 정부 인프라라 미국 리전에서 호출하면 느리거나 멈춘다. 서울 리전에서 실행한다.
export const preferredRegion = 'icn1';

// 각도 선정 기준: 중요도가 이 값 이상이면 모두 선택 (개수 고정 X)
const IMPORTANCE_THRESHOLD = 7;
// 토큰/시간 폭주 방지를 위한 안전 상한
const MAX_ANGLES = 10;

export async function POST(request: NextRequest) {
  const { stockName, passCount = 3 } = await request.json();

  if (!stockName) {
    return Response.json({ error: '종목명이 필요합니다' }, { status: 400 });
  }

  // SSE 스트림으로 진행 상황 전달
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let sessionId: string | undefined;

      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      try {
        send('progress', { step: 1, total: 5, label: 'DART 공시 조회 중...' });

        if (hasSupabase()) {
          sessionId = await createSession(stockName, 'auto').catch(() => undefined);
        }

        // ─── Step 1: DART 데이터 조회 ───
        const dartData = await enrichWithDart(stockName);
        const dartContext = dartData ? buildDartContext(dartData) : '';
        const dartSources = dartData ? buildDartSources(dartData.recentDisclosures) : [];

        // DART 조회 결과를 화면에 표시할 수 있도록 상태 + 공시 목록 전송
        send('dart', {
          found: !!dartData,
          corpName: dartData?.company?.corp_name ?? null,
          stockCode: dartData?.stockCode ?? null,
          disclosureCount: dartData?.recentDisclosures.length ?? 0,
          disclosures: (dartData?.recentDisclosures ?? []).map((d) => ({
            reportNm: d.report_nm,
            receiptDate: d.rcept_dt,
            url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${d.rcept_no}`,
          })),
        });

        send('progress', { step: 2, total: 5, label: `분석 각도 생성 중... (${passCount}회 멀티패스 + 웹검색)` });

        // ─── Step 2: 멀티패스 각도 생성 (web_search) ───
        const anglesSystem = `당신은 주식 분석 전문가입니다. 종목에 대해 분석 각도를 제안하세요.
두 가지 소스로 분리: "news" (뉴스/이슈 기반 4~6개), "dart" (전자공시 기반 3~5개).
각 꼭지에 importance(1~10)를 부여. 반드시 JSON 배열로만 응답. <cite> 태그 금지.
[{"id":"kebab-case","label":"한글제목","description":"설명","source":"news|dart","importance":숫자}]`;

        const anglesPrompt = `종목명: ${stockName}${dartContext ? '\n\n' + dartContext : ''}\n\n7~10개의 분석 각도를 제안해주세요. 웹 검색으로 최신 뉴스를 반드시 반영하세요.`;

        const anglesResults = await Promise.allSettled(
          Array.from({ length: passCount }, (_, i) => {
            const p = callWithSearch(anglesSystem, anglesPrompt);
            p.then(() => send('sub-progress', { step: 2, done: i + 1, total: passCount }));
            return p;
          }),
        );

        const rawAngles: unknown[] = [];
        const allAngleSources: SourceCitation[] = [];

        for (let i = 0; i < anglesResults.length; i++) {
          const r = anglesResults[i];
          if (r.status === 'fulfilled') {
            try {
              const { text, sources } = extractTextAndSources(r.value);
              allAngleSources.push(...sources);
              const parsed = parseJSON(text);
              rawAngles.push(parsed);
              if (sessionId && hasSupabase()) {
                await saveMultipassRaw(sessionId, 'angles', i, parsed).catch(() => {});
              }
            } catch (parseErr) {
              // 한 패스가 실패해도 나머지로 진행하되, 원인은 로그로 남긴다
              console.error(`각도 패스 ${i} 파싱 실패:`, parseErr);
            }
          }
        }

        if (rawAngles.length === 0) throw new Error('각도 생성 실패');

        send('progress', { step: 2, total: 5, label: '각도 종합 중...' });

        // 각도 종합
        let angles: Array<{ id: string; label: string; description: string; source: string; importance: number; confidence?: number }>;
        if (rawAngles.length === 1) {
          angles = rawAngles[0] as typeof angles;
        } else {
          try {
            const synthResp = await callSimple(
              '여러 번 수행된 분석 각도를 종합하세요. 중복=confidence 높게. 반드시 JSON 배열로만 응답하세요. 다른 텍스트 금지.',
              `다음 ${rawAngles.length}개 결과를 종합하세요:\n\n${rawAngles.map((r, i) => `=== 패스 ${i + 1} ===\n${JSON.stringify(r, null, 2)}`).join('\n\n')}\n\nJSON 배열로만 응답: [{"id":"...","label":"...","description":"...","source":"news|dart","importance":숫자,"confidence":1~5}]`,
              8192,
            );
            const { text } = extractTextAndSources(synthResp);
            angles = parseJSON(text) as typeof angles;
          } catch (synthErr) {
            console.error('각도 종합 실패, 첫 번째 패스 결과 사용:', synthErr);
            angles = rawAngles[0] as typeof angles;
          }
        }

        // 중요도 임계값 기반 선택 (고정 N개 한정 X)
        // 1) 중요도 내림차순, 동점이면 신뢰도(멀티패스 일치도) 높은 순
        // 2) 임계값 이상을 모두 선택하되, 토큰/시간 보호를 위해 안전 상한을 둔다
        const sorted = [...angles].sort((a, b) => {
          if (b.importance !== a.importance) return b.importance - a.importance;
          return (b.confidence ?? 0) - (a.confidence ?? 0);
        });
        const qualified = sorted.filter((a) => a.importance >= IMPORTANCE_THRESHOLD);
        // 임계값을 넘는 각도가 하나도 없으면 상위 일부라도 분석한다
        const selectedAngles = (qualified.length > 0 ? qualified : sorted).slice(0, MAX_ANGLES);
        const selectedIds = selectedAngles.map((a) => a.id);

        if (sessionId && hasSupabase()) {
          await saveAngles(sessionId, angles as never[], selectedIds).catch(() => {});
        }

        send('progress', { step: 3, total: 5, label: `상세 분석 진행 중... (${passCount}회 멀티패스 + 웹검색)` });

        // ─── Step 3: 멀티패스 분석 (web_search) ───
        const analysisSystem = `당신은 주식 분석 전문가입니다. 각 분석 각도에 대해 상세 분석하세요.
DART 데이터와 웹 검색 결과를 근거로 활용하세요. <cite> 태그 금지.
JSON 배열로만 응답: [{"angleId":"...","title":"...","summary":"...","keyPoints":["..."],"sentiment":"positive|neutral|negative"}]`;

        const analysisPrompt = `종목명: ${stockName}\n분석 각도:\n${JSON.stringify(selectedAngles, null, 2)}${dartContext ? '\n\n' + dartContext : ''}\n\n각 각도를 상세 분석하세요. 웹 검색으로 최신 정보를 반영하세요.`;

        const analysisResults = await Promise.allSettled(
          Array.from({ length: passCount }, (_, i) => {
            const p = callWithSearch(analysisSystem, analysisPrompt);
            p.then(() => send('sub-progress', { step: 3, done: i + 1, total: passCount }));
            return p;
          }),
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
              // 한 패스가 실패해도 나머지로 진행하되, 원인은 로그로 남긴다
              console.error(`분석 패스 ${i} 파싱 실패:`, parseErr);
            }
          }
        }

        if (rawAnalysis.length === 0) throw new Error('분석 실패');

        send('progress', { step: 3, total: 5, label: '분석 결과 종합 중...' });

        // 분석 종합
        let analysis: Array<{ angleId: string; title: string; summary: string; keyPoints: string[]; sentiment: string; confidence?: number; sources?: SourceCitation[] }>;
        if (rawAnalysis.length === 1) {
          analysis = rawAnalysis[0] as typeof analysis;
        } else {
          try {
            const synthResp = await callSimple(
              '여러 번 수행된 분석 결과를 종합하세요. 중복 포인트=confidence 높게. 반드시 JSON 배열로만 응답하세요. 다른 텍스트 금지.',
              `다음 ${rawAnalysis.length}개 결과를 종합하세요:\n\n${rawAnalysis.map((r, i) => `=== 패스 ${i + 1} ===\n${JSON.stringify(r, null, 2)}`).join('\n\n')}\n\nJSON 배열로만 응답: [{"angleId":"...","title":"...","summary":"...","keyPoints":["..."],"sentiment":"positive|neutral|negative","confidence":1~5}]`,
              8192,
            );
            const { text } = extractTextAndSources(synthResp);
            analysis = parseJSON(text) as typeof analysis;
          } catch (synthErr) {
            console.error('분석 종합 실패, 첫 번째 패스 결과 사용:', synthErr);
            analysis = rawAnalysis[0] as typeof analysis;
          }
        }

        // 분석 결과에 출처 첨부
        const webSources = mergeSources(allAngleSources, allAnalysisSources);
        analysis = analysis.map((a) => {
          const angle = selectedAngles.find((sa) => sa.id === a.angleId);
          const isDart = angle?.source === 'dart';
          return { ...a, sources: isDart ? dartSources.slice(0, 5) : webSources.slice(0, 5) };
        });

        if (sessionId && hasSupabase()) {
          await saveAnalysisResults(sessionId, analysis as never[]).catch(() => {});
        }

        send('progress', { step: 4, total: 5, label: '전문 용어 추출 중...' });

        // ─── Step 4: 용어 추출 ───
        // 용어는 부가 정보이므로 파싱이 실패해도 전체 파이프라인을 중단하지 않고 건너뛴다.
        let terms: Array<{ id: string; word: string; definition: string; analogy: string }> = [];
        try {
          const termsResp = await callSimple(
            `금융 전문 용어를 추출하세요. JSON 배열로만 응답: [{"id":"...","word":"...","definition":"...","analogy":"..."}]`,
            `분석 결과:\n${JSON.stringify(analysis, null, 2)}\n\n일반인이 어려워할 전문 용어를 추출하세요.`,
          );
          const { text: termsText } = extractTextAndSources(termsResp);
          terms = parseJSON(termsText) as typeof terms;
        } catch (termsErr) {
          console.error('용어 추출 파싱 실패, 용어 생략:', termsErr);
        }

        if (sessionId && hasSupabase()) {
          await saveTerms(sessionId, terms as never[], terms.map((t) => t.id)).catch(() => {});
        }

        send('progress', { step: 5, total: 5, label: '카드뉴스 생성 중...' });

        // ─── Step 5: 카드뉴스 생성 ───
        // 각도가 많으면 출력이 길어져 4096 토큰을 넘겨 잘리고 JSON 파싱이 실패한다.
        // 토큰을 넉넉히 주고, 실패 시 더 엄격한 지시로 1회 재시도, 그래도 안 되면 분석 결과로 폴백 카드를 만든다.
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

        // ─── 최종 결과 전송 ───
        send('result', {
          sessionId,
          stockName,
          stockCode: dartData?.stockCode ?? null,
          dartData: dartData ?? null,
          angles,
          selectedAngles,
          analysis,
          terms,
          output,
          sources: mergeSources(webSources, dartSources),
        });
      } catch (error) {
        console.error('Auto-analyze 에러:', error);
        if (sessionId && hasSupabase()) {
          await failSession(sessionId).catch(() => {});
        }
        const message = error instanceof Error ? error.message : '알 수 없는 에러';
        send('error', { error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
