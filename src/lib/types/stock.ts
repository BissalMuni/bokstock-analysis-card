/** 분석 각도 데이터 소스 */
export type AngleSource = 'news' | 'dart';

/** 분석 각도(꼭지) */
export interface AnalysisAngle {
  id: string;
  label: string;
  description: string;
  source: AngleSource; // 데이터 출처: 뉴스검색 or DART 공시
  importance: number;  // 중요도 (1~10, 대중 관심도 기준)
}

/** 출처 인용 정보 */
export interface SourceCitation {
  url: string;
  title: string;
  sourceType: 'news' | 'dart';
  date: string | null; // page_age (뉴스) 또는 rcept_dt (DART)
}

/** 분석 결과 감성 태그 */
export type SentimentTag = 'positive' | 'neutral' | 'negative';

/** 분석 결과 카드 */
export interface AnalysisResult {
  angleId: string;
  title: string;
  summary: string;
  keyPoints: string[];
  sentiment: SentimentTag;
  sources?: SourceCitation[]; // 분석 근거 출처
}

/** 용어 해설 */
export interface Term {
  id: string;
  word: string;
  definition: string;
  analogy: string; // 생활 비유
}

/** 카드뉴스 슬라이드 */
export interface CardSlide {
  type: 'cover' | 'analysis' | 'terms' | 'summary';
  title: string;
  content: string;
  keyPoints?: string[];
  sentiment?: SentimentTag;
  terms?: Term[];
}
