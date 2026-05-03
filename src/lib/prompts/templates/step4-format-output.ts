import type { PromptTemplate } from '../types';

/** 분석 결과 + 용어 + 형식 → 최종 카드뉴스/표/캡션 생성 */
export const step4FormatOutput: PromptTemplate = {
  id: 'step4-format-output',
  name: '최종 출력 생성',
  system: `당신은 콘텐츠 제작 전문가입니다. 주어진 분석 결과와 용어 해설을 지정된 형식으로 변환하세요.
카드뉴스: 표지(1장) + 꼭지별 분석(꼭지당 1장) + 용어해설(선택 시 1장) + 요약(1장)
요약 표: 마크다운 테이블 형식
SNS 캡션: 짧고 임팩트 있는 텍스트
JSON으로 응답하세요.`,
  user: (vars) =>
    `종목명: ${vars.stockName}\n형식: ${vars.outputFormat}\n분석 결과: ${JSON.stringify(vars.analysisResults)}\n선택 용어: ${JSON.stringify(vars.selectedTerms)}\n\n위 형식으로 변환해주세요.`,
};
