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

async function callSimple(system: string, prompt: string) {
  return anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: prompt }],
  });
}

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const { stockName, passCount = 3, angleCount = 5 } = await request.json();

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
            } catch { /* 파싱 실패 무시 */ }
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
            );
            const { text } = extractTextAndSources(synthResp);
            angles = parseJSON(text) as typeof angles;
          } catch (synthErr) {
            console.error('각도 종합 실패, 첫 번째 패스 결과 사용:', synthErr);
            angles = rawAngles[0] as typeof angles;
          }
        }

        // 상위 N개 자동 선택
        const sorted = [...angles].sort((a, b) => b.importance - a.importance);
        const selectedAngles = sorted.slice(0, angleCount);
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
            } catch { /* 파싱 실패 무시 */ }
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
        const termsResp = await callSimple(
          `금융 전문 용어를 추출하세요. JSON 배열로만 응답: [{"id":"...","word":"...","definition":"...","analogy":"..."}]`,
          `분석 결과:\n${JSON.stringify(analysis, null, 2)}\n\n일반인이 어려워할 전문 용어를 추출하세요.`,
        );
        const { text: termsText } = extractTextAndSources(termsResp);
        const terms = parseJSON(termsText) as Array<{ id: string; word: string; definition: string; analogy: string }>;

        if (sessionId && hasSupabase()) {
          await saveTerms(sessionId, terms as never[], terms.map((t) => t.id)).catch(() => {});
        }

        send('progress', { step: 5, total: 5, label: '카드뉴스 생성 중...' });

        // ─── Step 5: 카드뉴스 생성 ───
        const outputResp = await callSimple(
          `콘텐츠 제작 전문가. 분석 결과를 카드뉴스로 변환. JSON 배열로만 응답.
[{"type":"cover|analysis|terms|summary","title":"...","content":"...","keyPoints":[...],"sentiment":"...","terms":[...]}]
구성: 표지(1) + 꼭지별 분석(각 1장) + 용어(1장) + 요약(1장)`,
          `종목명: ${stockName}\n출력 형식: card-news\n분석 결과:\n${JSON.stringify(analysis, null, 2)}\n용어:\n${JSON.stringify(terms, null, 2)}\n\n카드뉴스로 변환하세요.`,
        );
        const { text: outputText } = extractTextAndSources(outputResp);
        const output = parseJSON(outputText);

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
