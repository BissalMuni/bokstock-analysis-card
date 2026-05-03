/** 위자드 단계 번호 (1~6) */
export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

/** 위자드 단계 라벨 */
export const STEP_LABELS: Record<WizardStep, string> = {
  1: '종목 입력',
  2: '꼭지 선택',
  3: '분석 확인',
  4: '용어 선택',
  5: '형식 선택',
  6: '결과 출력',
};

/** 출력 형식 */
export type OutputFormat = 'card-news' | 'summary-table' | 'sns-caption';

export const OUTPUT_FORMAT_LABELS: Record<OutputFormat, string> = {
  'card-news': '카드뉴스',
  'summary-table': '요약 표',
  'sns-caption': 'SNS 캡션',
};
