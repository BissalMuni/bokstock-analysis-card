import type { AnalysisResult } from '../types/stock';

/** 꼭지 ID → 더미 분석 결과 매핑 */
export const mockAnalysisMap: Record<string, AnalysisResult> = {
  'on-device-ai': {
    angleId: 'on-device-ai',
    title: '온디바이스 AI 수혜',
    summary:
      '온디바이스 AI 확산으로 기기 내 전력 안정화용 하이브리드 콘덴서 수요가 구조적으로 증가하고 있습니다.',
    keyPoints: [
      'AI폰은 고성능 연산 시 순간 전력 소모가 급증하여 전압 안정화 부품 필수',
      '하이브리드 콘덴서는 소형·저발열·고속 충방전으로 AI 기기에 최적화',
      '국내 유일 하이브리드 콘덴서 양산 업체로 경쟁자 부재',
    ],
    sentiment: 'positive',
  },
  'ev-adas': {
    angleId: 'ev-adas',
    title: '전장·전기차 부품 확대',
    summary:
      'ADAS, HUD, 텔레매틱스 등 차량 전장 부품에 125℃ 이상 내열 콘덴서 공급이 가능합니다.',
    keyPoints: [
      '전장용 콘덴서는 IT용 대비 단가가 높아 수익성 개선 효과',
      '일본케미콘 기술 협력으로 장수명 하이브리드 콘덴서 개발 성공',
      '전량 수입 의존 시장에서 국산화 1호 공급자',
    ],
    sentiment: 'positive',
  },
  financials: {
    angleId: 'financials',
    title: '재무 건전성 분석',
    summary:
      '현금성 자산이 시가총액을 상회하며, 2025년 1분기 영업이익이 전년 대비 300% 증가했습니다.',
    keyPoints: [
      '현금 보유액 약 3,023억 원으로 시가총액 초과',
      '2025년 1분기 영업이익 13억 원 (YoY +300%)',
      '부채비율 낮고 안정적인 재무 구조',
    ],
    sentiment: 'positive',
  },
  '5g-infra': {
    angleId: '5g-infra',
    title: '5G 통신 인프라 수요',
    summary:
      '5G 기지국은 외부 노출 환경에서 큰 온도 변화를 견뎌야 하므로 고신뢰성 콘덴서 수요가 있습니다.',
    keyPoints: [
      '통신 인프라 투자 사이클과 직접 연동',
      '고온·저온 환경에서도 안정적으로 작동하는 장수명 제품',
      '기지국 확대 시 수혜 가능하나 투자 사이클 의존성 존재',
    ],
    sentiment: 'neutral',
  },
  'supply-chain': {
    angleId: 'supply-chain',
    title: '공급망·국산화 독점',
    summary:
      '최대주주 일본케미콘과 기술 협력으로 하이브리드 콘덴서 국산화를 추진 중이며, 핵심 소재 해액도 자체 개발했습니다.',
    keyPoints: [
      '그동안 전량 수입에 의존하던 하이브리드 콘덴서 국산화',
      '핵심 자재(해액) 자체 개발로 공급망 내재화',
      '국내 경쟁자 사실상 없는 독점 구조',
    ],
    sentiment: 'positive',
  },
  valuation: {
    angleId: 'valuation',
    title: '자산 저평가 분석',
    summary:
      '순현금만으로 시가총액이 정당화되는 수준이라는 증권가 분석이 반복 제기되고 있습니다.',
    keyPoints: [
      '현금성 자산 > 시가총액 → 사실상 사업 가치를 0원으로 평가',
      '52주 범위 9,840~13,020원, 목표주가 15,000원 (약 +16.5%)',
      '소형주 특성상 유동성 제한으로 저평가 지속 가능성',
    ],
    sentiment: 'neutral',
  },
  risk: {
    angleId: 'risk',
    title: '리스크 요인',
    summary:
      '소형주 유동성, 특정 고객사 의존도, 최대주주 일본 기업이라는 구조적 리스크가 존재합니다.',
    keyPoints: [
      '소형주로 유동성 제한 및 변동성 높음',
      '삼성전자 등 특정 고객사 의존도 높음',
      '최대주주가 일본케미콘(지분 33.4%)으로 경영 독립성 제한 가능',
      '하이브리드 콘덴서 국산화 실적 확대 여부 불확실',
    ],
    sentiment: 'negative',
  },
};
