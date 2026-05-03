import type { PromptTemplate } from '../types';

/** 선택된 꼭지 → 분석 결과 생성 */
export const step2AngleAnalysis: PromptTemplate = {
  id: 'step2-angle-analysis',
  name: '꼭지별 분석',
  system: `당신은 주식 분석 전문가입니다. 주어진 종목과 분석 각도에 대해 상세 분석을 제공하세요.
전자공시(DART) 데이터가 제공되면 이를 근거로 활용하여 실제 기업 정보에 기반한 분석을 작성하세요.
각 분석은 title, summary, keyPoints(3~5개), sentiment(positive/neutral/negative)로 구성합니다.
JSON 배열로 응답하세요.`,
  user: (vars) => {
    let prompt = `종목명: ${vars.stockName}\n분석 각도: ${JSON.stringify(vars.selectedAngles)}`;
    if (vars.dartContext) {
      prompt += `\n\n${vars.dartContext}`;
    }
    prompt += '\n\n각 각도에 대해 분석해주세요.';
    return prompt;
  },
};
