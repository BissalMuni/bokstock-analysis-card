import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { enrichWithDart } from '@/lib/dart';
import type { DartEnrichedData } from '@/lib/dart';
import { extractTextAndSources, parseJSON, buildDartSources, mergeSources } from '@/lib/sources';
import type { SourceCitation } from '@/lib/types/stock';
import {
  createSession,
  saveMultipassRaw,
  saveAngles,
  saveAnalysisResults,
  saveFinalOutput,
  saveTerms,
} from '@/lib/supabase';

// DART는 한국 정부 인프라라 미국 리전에서 호출하면 느리거나 멈춘다. 서울 리전에서 실행한다.
export const preferredRegion = 'icn1';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/** Supabase 사용 가능 여부 */
function hasSupabase(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

/** DART 데이터를 프롬프트 컨텍스트로 변환 */
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

/** 각 단계별 시스템 프롬프트 */
const SYSTEM_PROMPTS: Record<string, string> = {
  angles: `당신은 주식 분석 전문가입니다. 주어진 종목에 대해 투자자가 관심을 가질 만한 분석 각도(꼭지)를 제안하세요.

두 가지 소스로 분리하여 제안합니다:
1. "news" — 최근 뉴스/이슈/시장 트렌드 기반 (4~6개)
2. "dart" — 전자공시(DART) 데이터 기반: 실적, 공시 이벤트, 지배구조, 재무 변동 등 (3~5개)

각 꼭지에 "importance" 점수(1~10)를 부여하세요. 기준: 일반 투자자/대중이 얼마나 관심을 가질 것인가.
- 10: 즉시 주가 영향, 핫이슈
- 7~9: 높은 관심, 트렌드 관련
- 4~6: 보통 관심
- 1~3: 전문가만 관심

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트나 <cite> 태그는 포함하지 마세요. description은 짧고 깨끗한 한 줄 텍스트여야 합니다.
[{"id": "영문-kebab-case", "label": "짧은 한글 제목", "description": "한 줄 설명", "source": "news|dart", "importance": 숫자}]`,

  analysis: `당신은 주식 분석 전문가입니다. 주어진 종목과 분석 각도에 대해 상세 분석을 제공하세요.
전자공시(DART) 데이터가 제공되면 이를 근거로 활용하여 실제 기업 정보에 기반한 분석을 작성하세요.
공시 보고서명과 접수일자를 분석 근거로 인용할 수 있습니다.
웹 검색 결과가 제공되면 최신 정보를 분석에 반영하세요.
반드시 아래 JSON 형식으로만 응답하세요. <cite> 태그나 다른 텍스트는 포함하지 마세요.
[{"angleId": "꼭지id", "title": "분석 제목", "summary": "2~3문장 요약", "keyPoints": ["핵심1", "핵심2", "핵심3"], "sentiment": "positive|neutral|negative"}]`,

  terms: `당신은 금융 교육 전문가입니다. 주어진 분석 결과에서 일반인이 이해하기 어려운 전문 용어를 추출하세요.
각 용어에 대해 쉬운 설명과 생활 비유를 제공합니다.
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.
[{"id": "영문-kebab-case", "word": "용어", "definition": "쉬운 설명", "analogy": "생활 비유 (예: 콘덴서는 논 옆 저수지와 같습니다)"}]`,

  output: `당신은 콘텐츠 제작 전문가입니다. 주어진 분석 결과와 용어 해설을 지정된 형식으로 변환하세요.
반드시 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.

출력 형식이 "card-news"인 경우:
배열 형태로 응답: [{"type": "cover|analysis|terms|summary", "title": "제목", "content": "내용", "keyPoints": [...], "sentiment": "positive|neutral|negative", "terms": [{"id":"...", "word":"...", "definition":"...", "analogy":"..."}]}]
구성: 표지(1장) + 꼭지별 분석(꼭지당 1장) + 용어해설(선택 시 1장) + 요약(1장)

출력 형식이 "summary-table"인 경우:
{"content": "마크다운 테이블 문자열"}

출력 형식이 "sns-caption"인 경우:
{"content": "SNS 캡션 텍스트"}`,
};

/** 종합 시스템 프롬프트 (멀티패스 결과 합산용) */
const SYNTHESIZE_PROMPT = `당신은 주식 분석 종합 전문가입니다.
동일한 종목에 대해 여러 번 수행된 분석 결과를 종합합니다.

종합 원칙:
1. **중복된 내용** → 신뢰도가 높은 핵심 포인트 (confidence 높게 표시)
2. **유니크한 내용** → 다양한 관점으로 포함 (confidence 낮게 표시)
3. **상충하는 내용** → 양쪽 관점 모두 포함하되 차이점 명시
4. 각 결과에 confidence 점수 (1~5)를 부여: 5=모든 패스에서 언급, 1=단일 패스에서만 언급

반드시 아래 JSON 형식으로만 응답하세요.`;

/** 각 단계별 사용자 프롬프트 생성 */
function buildUserPrompt(step: string, data: Record<string, unknown>): string {
  const dartContext = data.dartContext ? `\n\n${data.dartContext}` : '';

  switch (step) {
    case 'angles':
      return `종목명: ${data.stockName}${dartContext}\n\n이 종목에 대해 7~10개의 분석 각도를 제안해주세요. 웹 검색을 활용하여 최신 뉴스와 이슈를 반드시 반영하세요.`;

    case 'analysis':
      return `종목명: ${data.stockName}\n선택된 분석 각도:\n${JSON.stringify(data.selectedAngles, null, 2)}${dartContext}\n\n각 각도에 대해 상세 분석해주세요. 웹 검색을 활용하여 최신 정보를 반영하세요.`;

    case 'terms':
      return `분석 결과:\n${JSON.stringify(data.analysisResults, null, 2)}\n\n일반인이 이해하기 어려운 전문 용어를 추출해주세요.`;

    case 'output':
      return `종목명: ${data.stockName}\n출력 형식: ${data.outputFormat}\n분석 결과:\n${JSON.stringify(data.analysisResults, null, 2)}\n선택 용어:\n${JSON.stringify(data.selectedTerms, null, 2)}\n\n위 형식으로 변환해주세요.`;

    default:
      throw new Error(`알 수 없는 단계: ${step}`);
  }
}

/**
 * web_search 툴을 포함한 Claude API 호출
 */
async function callClaudeWithWebSearch(
  system: string,
  userPrompt: string,
): Promise<Anthropic.Message> {
  return anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8192,
    system,
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 5,
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  });
}

/** web_search 없이 Claude API 호출 */
async function callClaudeSimple(
  system: string,
  userPrompt: string,
): Promise<Anthropic.Message> {
  return anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: userPrompt }],
  });
}

/**
 * 멀티패스 분석: 동일 프롬프트를 N회 병렬 실행 후 종합
 * 각 패스에서 웹검색 출처도 함께 수집
 */
async function multipassAnalyze(
  step: string,
  data: Record<string, unknown>,
  passCount: number = 3,
  sessionId?: string,
): Promise<{ synthesized: unknown; rawResults: unknown[]; allSources: SourceCitation[] }> {
  const system = SYSTEM_PROMPTS[step];
  const userPrompt = buildUserPrompt(step, data);

  const needsSearch = step === 'angles' || step === 'analysis';

  const promises = Array.from({ length: passCount }, () =>
    needsSearch
      ? callClaudeWithWebSearch(system, userPrompt)
      : callClaudeSimple(system, userPrompt),
  );

  const results = await Promise.allSettled(promises);
  const rawResults: unknown[] = [];
  const successTexts: string[] = [];
  const allSources: SourceCitation[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      try {
        // 텍스트 + 출처 동시 추출
        const { text, sources } = extractTextAndSources(result.value);
        allSources.push(...sources);

        const parsed = parseJSON(text);
        rawResults.push(parsed);
        successTexts.push(JSON.stringify(parsed, null, 2));

        if (sessionId && hasSupabase()) {
          await saveMultipassRaw(sessionId, step, i, parsed).catch(() => {});
        }
      } catch (parseErr) {
        console.error(`패스 ${i} 파싱 실패:`, parseErr);
      }
    } else {
      console.error(`패스 ${i} 실패:`, result.reason);
    }
  }

  if (rawResults.length === 1) {
    return { synthesized: rawResults[0], rawResults, allSources };
  }

  if (rawResults.length === 0) {
    throw new Error('모든 멀티패스 분석이 실패했습니다');
  }

  // 종합 프롬프트로 합산
  const synthesizeUserPrompt = `다음은 동일 분석을 ${rawResults.length}회 수행한 결과입니다.
이를 종합하여 하나의 결과로 만들어주세요.

${successTexts.map((t, i) => `=== 패스 ${i + 1} ===\n${t}`).join('\n\n')}

종합 결과를 다음 형식으로 응답하세요:
${step === 'angles'
      ? '[{"id": "...", "label": "...", "description": "...(N회 중 K회 언급)", "source": "news|dart", "importance": 숫자, "confidence": 1~5}]'
      : '[{"angleId": "...", "title": "...", "summary": "...", "keyPoints": ["...", "..."], "sentiment": "positive|neutral|negative", "confidence": 1~5}]'
    }`;

  try {
    const synthResponse = await callClaudeSimple(SYNTHESIZE_PROMPT, synthesizeUserPrompt);
    const { text: synthText } = extractTextAndSources(synthResponse);
    const synthesized = parseJSON(synthText);
    return { synthesized, rawResults, allSources };
  } catch (synthErr) {
    console.error('종합 파싱 실패, 첫 번째 패스 결과 사용:', synthErr);
    return { synthesized: rawResults[0], rawResults, allSources };
  }
}

/** 분석 결과에 출처 첨부 */
function attachSourcesToResults(
  results: Array<{ angleId: string; [key: string]: unknown }>,
  webSources: SourceCitation[],
  dartSources: SourceCitation[],
  angles: Array<{ id: string; source: string }> | undefined,
): unknown[] {
  return results.map((r) => {
    // 해당 각도의 소스 타입 확인
    const angle = angles?.find((a) => a.id === r.angleId);
    const isDart = angle?.source === 'dart';

    return {
      ...r,
      sources: isDart ? dartSources.slice(0, 5) : webSources.slice(0, 5),
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { step, sessionId: existingSessionId, passCount = 3, ...data } = body;

    if (!step || !SYSTEM_PROMPTS[step]) {
      return NextResponse.json({ error: '유효하지 않은 단계입니다' }, { status: 400 });
    }

    let sessionId = existingSessionId as string | undefined;
    if (!sessionId && hasSupabase() && step === 'angles') {
      sessionId = await createSession(data.stockName as string).catch(() => undefined);
    }

    // DART 데이터 자동 조회
    let dartSources: SourceCitation[] = [];
    if ((step === 'angles' || step === 'analysis') && data.stockName && !data.dartContext) {
      const dartData = await enrichWithDart(data.stockName as string);
      if (dartData) {
        data.dartContext = buildDartContext(dartData);
        data._dartData = dartData;
        dartSources = buildDartSources(dartData.recentDisclosures);
      }
    }

    let parsed: unknown;
    let sources: SourceCitation[] = [];

    if (step === 'angles' || step === 'analysis') {
      const { synthesized, allSources } = await multipassAnalyze(
        step,
        data,
        Math.min(Math.max(passCount, 1), 5),
        sessionId,
      );

      const webSources = mergeSources(allSources);

      if (step === 'analysis') {
        // 분석 결과에 출처 첨부
        parsed = attachSourcesToResults(
          synthesized as Array<{ angleId: string }>,
          webSources,
          dartSources,
          data.selectedAngles as Array<{ id: string; source: string }>,
        );
      } else {
        parsed = synthesized;
      }

      sources = mergeSources(webSources, dartSources);

      if (sessionId && hasSupabase()) {
        if (step === 'angles') {
          await saveAngles(sessionId, parsed as never[]).catch(() => {});
        } else if (step === 'analysis') {
          await saveAnalysisResults(sessionId, parsed as never[]).catch(() => {});
        }
      }
    } else {
      const message = await callClaudeSimple(
        SYSTEM_PROMPTS[step],
        buildUserPrompt(step, data),
      );
      const { text } = extractTextAndSources(message);
      parsed = parseJSON(text);

      if (sessionId && hasSupabase()) {
        if (step === 'terms') {
          await saveTerms(sessionId, parsed as never[]).catch(() => {});
        } else if (step === 'output') {
          await saveFinalOutput(sessionId, data.outputFormat as string, parsed).catch(() => {});
        }
      }
    }

    const response: Record<string, unknown> = { data: parsed, sessionId, sources };
    if (data._dartData) {
      response.dartData = data._dartData;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('API 에러:', error);
    const message = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
