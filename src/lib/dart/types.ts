/** DART API 공통 응답 상태 */
export interface DartStatus {
  status: string; // '000' = 성공
  message: string;
}

/** 고유번호 목록 항목 (corpCode.xml에서 파싱) */
export interface CorpCodeEntry {
  corp_code: string; // 고유번호 (8자리)
  corp_name: string; // 정식명칭
  stock_code: string; // 종목코드 (6자리, 상장사만)
  modify_date: string; // 최종변경일 (YYYYMMDD)
}

/** 기업개황 응답 */
export interface CompanyOverview extends DartStatus {
  corp_name: string; // 정식명칭
  corp_name_eng: string; // 영문명칭
  stock_name: string; // 종목명
  stock_code: string; // 종목코드
  ceo_nm: string; // 대표자명
  corp_cls: string; // 법인구분 (Y/K/N/E)
  jurir_no: string; // 법인등록번호
  bizr_no: string; // 사업자등록번호
  adres: string; // 주소
  hm_url: string; // 홈페이지
  ir_url: string; // IR 홈페이지
  phn_no: string; // 전화번호
  fax_no: string; // 팩스번호
  induty_code: string; // 업종코드
  est_dt: string; // 설립일 (YYYYMMDD)
  acc_mt: string; // 결산월 (MM)
}

/** 공시 유형 코드 */
export type DisclosureType =
  | 'A' // 정기공시
  | 'B' // 주요사항보고
  | 'C' // 발행공시
  | 'D' // 지분공시
  | 'E' // 기타공시
  | 'F' // 외부감사관련
  | 'G' // 펀드공시
  | 'H' // 자산유동화
  | 'I' // 거래소공시
  | 'J'; // 공정위공시

/** 공시검색 결과 항목 */
export interface DisclosureItem {
  corp_cls: string; // 법인구분
  corp_name: string; // 종목명
  corp_code: string; // 고유번호
  stock_code: string; // 종목코드
  report_nm: string; // 보고서명
  rcept_no: string; // 접수번호
  flr_nm: string; // 공시 제출인명
  rcept_dt: string; // 접수일자 (YYYYMMDD)
  rm: string; // 비고
}

/** 공시검색 응답 */
export interface DisclosureListResponse extends DartStatus {
  page_no: number;
  page_count: number;
  total_count: number;
  total_page: number;
  list: DisclosureItem[];
}

/** 종목 검색 결과 (클라이언트용) */
export interface CorpSearchResult {
  corpCode: string;
  corpName: string;
  stockCode: string;
}

/** DART 데이터 통합 결과 (분석 파이프라인에 전달) */
export interface DartEnrichedData {
  company: CompanyOverview | null;
  recentDisclosures: DisclosureItem[];
  corpCode: string;
  stockCode: string;
}
