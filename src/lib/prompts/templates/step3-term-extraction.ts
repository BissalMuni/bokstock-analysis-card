import type { PromptTemplate } from '../types';

/** 분석 결과 → 어려운 용어 추출 + 생활 비유 */
export const step3TermExtraction: PromptTemplate = {
  id: 'step3-term-extraction',
  name: '용어 추출',
  system: `당신은 금융 교육 전문가입니다. 주어진 분석 결과에서 일반인이 이해하기 어려운 용어를 추출하세요.
각 용어에 대해 id, word(용어), definition(쉬운 설명), analogy(생활 비유)를 제공합니다.
JSON 배열로 응답하세요.`,
  user: (vars) =>
    `분석 결과:\n${JSON.stringify(vars.analysisResults)}\n\n어려운 용어를 추출해주세요.`,
};
