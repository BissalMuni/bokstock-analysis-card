import type { AnalysisAngle, AnalysisResult, Term, CardSlide } from '../types/stock';
import type { OutputFormat } from '../types/wizard';
import { mockAngles } from './angles';
import { mockAnalysisMap } from './analysis';
import { mockTerms } from './terms';

/**
 * Mock 리졸버: templateId + vars → 더미 데이터 반환
 * Phase 2에서 이 함수를 Claude API 호출로 교체
 */
export async function mockResolver<T>(
  templateId: string,
  vars: Record<string, unknown>,
): Promise<T> {
  // 비동기 시뮬레이션 (UI 로딩 상태 테스트용)
  await new Promise((r) => setTimeout(r, 300));

  switch (templateId) {
    case 'step1-stock-angles':
      return mockAngles as T;

    case 'step2-angle-analysis': {
      const selectedAngles = vars.selectedAngles as AnalysisAngle[];
      const results: AnalysisResult[] = selectedAngles
        .map((angle) => mockAnalysisMap[angle.id])
        .filter(Boolean);
      return results as T;
    }

    case 'step3-term-extraction':
      return mockTerms as T;

    case 'step4-format-output': {
      const results = vars.analysisResults as AnalysisResult[];
      const terms = vars.selectedTerms as Term[];
      const format = vars.outputFormat as OutputFormat;
      return buildOutput(vars.stockName as string, results, terms, format) as T;
    }

    default:
      throw new Error(`알 수 없는 템플릿: ${templateId}`);
  }
}

/** 최종 출력 데이터 생성 */
function buildOutput(
  stockName: string,
  results: AnalysisResult[],
  terms: Term[],
  format: OutputFormat,
): CardSlide[] | string {
  if (format === 'sns-caption') {
    const points = results.map((r) => `${r.title}: ${r.summary}`).join('\n');
    return `📊 ${stockName} 분석\n\n${points}\n\n⚠️ 투자 참고용 정보입니다.`;
  }

  if (format === 'summary-table') {
    const header = '| 분석 항목 | 요약 | 판단 |\n|---|---|---|';
    const rows = results
      .map((r) => `| ${r.title} | ${r.summary} | ${r.sentiment} |`)
      .join('\n');
    return `${header}\n${rows}`;
  }

  // 카드뉴스: 표지 + 꼭지별 + 용어(선택) + 요약
  const slides: CardSlide[] = [];

  slides.push({
    type: 'cover',
    title: `${stockName} 분석`,
    content: `${results.length}가지 관점으로 살펴보는 ${stockName}`,
  });

  for (const result of results) {
    slides.push({
      type: 'analysis',
      title: result.title,
      content: result.summary,
      keyPoints: result.keyPoints,
      sentiment: result.sentiment,
    });
  }

  if (terms.length > 0) {
    slides.push({
      type: 'terms',
      title: '용어 해설',
      content: '어려운 용어를 쉽게 풀어봤습니다',
      terms,
    });
  }

  slides.push({
    type: 'summary',
    title: '한 줄 요약',
    content: results.map((r) => `• ${r.title}: ${r.summary}`).join('\n'),
  });

  return slides;
}
