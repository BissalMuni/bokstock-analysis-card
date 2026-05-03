import type { AnalysisAngle } from '../types/stock';

/** 더미 분석 각도 (Phase 1 고정 세트) */
export const mockAngles: AnalysisAngle[] = [
  // 뉴스/이슈 기반
  {
    id: 'on-device-ai',
    label: '온디바이스 AI',
    description: 'AI 기기 내 연산 확대에 따른 부품 수요 수혜',
    source: 'news',
    importance: 9,
  },
  {
    id: 'ev-adas',
    label: '전장·전기차',
    description: 'ADAS, HUD 등 차량 전장 부품 공급 확대',
    source: 'news',
    importance: 8,
  },
  {
    id: '5g-infra',
    label: '5G 통신 인프라',
    description: '5G 기지국 확대에 따른 고신뢰성 부품 수요',
    source: 'news',
    importance: 6,
  },
  {
    id: 'supply-chain',
    label: '공급망·국산화',
    description: '수입 의존 탈피 및 국산화 독점 구조',
    source: 'news',
    importance: 7,
  },
  // DART 공시 기반
  {
    id: 'financials',
    label: '재무 건전성',
    description: '현금 보유, 부채비율, 영업이익률 등 재무 지표 분석',
    source: 'dart',
    importance: 8,
  },
  {
    id: 'valuation',
    label: '자산 저평가',
    description: '시가총액 대비 순자산·현금 보유 비교',
    source: 'dart',
    importance: 7,
  },
  {
    id: 'risk',
    label: '리스크 요인',
    description: '소형주 유동성, 고객 의존도, 경쟁 구도 분석',
    source: 'dart',
    importance: 5,
  },
];
