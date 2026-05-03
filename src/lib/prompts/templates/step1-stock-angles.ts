import type { PromptTemplate } from '../types';

/** 종목명 → 분석 각도(꼭지) 5~7개 생성 */
export const step1StockAngles: PromptTemplate = {
  id: 'step1-stock-angles',
  name: '분석 각도 생성',
  system: `당신은 주식 분석 전문가입니다. 주어진 종목에 대해 투자자가 관심을 가질 만한 분석 각도(꼭지)를 5~7개 제안하세요.
전자공시(DART) 데이터가 제공되면 해당 기업의 실제 사업 특성, 최근 공시 이벤트를 반영하세요.
각 꼭지는 id, label(짧은 제목), description(한 줄 설명)으로 구성합니다.
JSON 배열로 응답하세요.`,
  user: (vars) => {
    let prompt = `종목명: ${vars.stockName}`;
    if (vars.dartContext) {
      prompt += `\n\n${vars.dartContext}`;
    }
    prompt += '\n\n이 종목에 대해 5~7개의 분석 각도를 제안해주세요.';
    return prompt;
  },
};
