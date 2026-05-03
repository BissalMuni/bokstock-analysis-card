import JSZip from 'jszip';
import {
  type CompanyOverview,
  type CorpCodeEntry,
  type CorpSearchResult,
  type DartEnrichedData,
  type DisclosureItem,
  type DisclosureListResponse,
  type DisclosureType,
} from './types';

const DART_BASE = 'https://opendart.fss.or.kr/api';

function getDartKey(): string {
  const key = process.env.DART_KEY;
  if (!key) throw new Error('DART_KEY 환경변수가 설정되지 않았습니다');
  return key;
}

// ─── 고유번호 캐시 (메모리) ─────────────────────────────────────
let corpCodeCache: CorpCodeEntry[] | null = null;
let corpCodeCacheTime = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

/** 고유번호 전체 목록 다운로드 및 파싱 */
async function fetchCorpCodeList(): Promise<CorpCodeEntry[]> {
  const now = Date.now();
  if (corpCodeCache && now - corpCodeCacheTime < CACHE_TTL) {
    return corpCodeCache;
  }

  const url = `${DART_BASE}/corpCode.xml?crtfc_key=${getDartKey()}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`고유번호 목록 다운로드 실패: ${res.status}`);
  }

  const buffer = await res.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  // ZIP 내부 XML 파일 찾기
  const xmlFile = Object.values(zip.files).find((f) => f.name.endsWith('.xml'));
  if (!xmlFile) throw new Error('ZIP 내 XML 파일을 찾을 수 없습니다');

  const xmlText = await xmlFile.async('text');

  // XML 파싱 (간단한 정규식 기반 - 서버 환경)
  const entries: CorpCodeEntry[] = [];
  const listRegex = /<list>([\s\S]*?)<\/list>/g;
  let match;

  while ((match = listRegex.exec(xmlText)) !== null) {
    const item = match[1];
    const getValue = (tag: string) => {
      const m = item.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
      return m ? m[1].trim() : '';
    };

    entries.push({
      corp_code: getValue('corp_code'),
      corp_name: getValue('corp_name'),
      stock_code: getValue('stock_code'),
      modify_date: getValue('modify_date'),
    });
  }

  corpCodeCache = entries;
  corpCodeCacheTime = now;
  return entries;
}

/** 종목명으로 고유번호 검색 (상장사 우선) */
export async function searchCorp(query: string): Promise<CorpSearchResult[]> {
  const entries = await fetchCorpCodeList();
  const q = query.toLowerCase().trim();

  // 상장사만 필터 (stock_code가 있는 것)
  const listed = entries.filter((e) => e.stock_code && e.stock_code.trim() !== '');

  // 정확 매치 → 포함 매치 순으로 정렬
  const results = listed
    .filter((e) => e.corp_name.toLowerCase().includes(q))
    .sort((a, b) => {
      const aExact = a.corp_name.toLowerCase() === q ? 0 : 1;
      const bExact = b.corp_name.toLowerCase() === q ? 0 : 1;
      return aExact - bExact;
    })
    .slice(0, 10)
    .map((e) => ({
      corpCode: e.corp_code,
      corpName: e.corp_name,
      stockCode: e.stock_code,
    }));

  return results;
}

/** 기업개황 조회 */
export async function getCompanyOverview(corpCode: string): Promise<CompanyOverview> {
  const url = `${DART_BASE}/company.json?crtfc_key=${getDartKey()}&corp_code=${corpCode}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`기업개황 조회 실패: ${res.status}`);
  }

  const data = await res.json();
  if (data.status !== '000') {
    throw new Error(`DART API 에러: ${data.message} (${data.status})`);
  }

  return data as CompanyOverview;
}

/** 공시검색 */
export async function getDisclosures(options: {
  corpCode: string;
  startDate?: string; // YYYYMMDD
  endDate?: string; // YYYYMMDD
  disclosureType?: DisclosureType;
  pageCount?: number;
}): Promise<DisclosureItem[]> {
  const params = new URLSearchParams({
    crtfc_key: getDartKey(),
    corp_code: options.corpCode,
    page_count: String(options.pageCount ?? 20),
    sort: 'date',
    sort_mth: 'desc',
  });

  if (options.startDate) params.set('bgn_de', options.startDate);
  if (options.endDate) params.set('end_de', options.endDate);
  if (options.disclosureType) params.set('pblntf_ty', options.disclosureType);

  const url = `${DART_BASE}/list.json?${params.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`공시검색 실패: ${res.status}`);
  }

  const data: DisclosureListResponse = await res.json();

  // '013' = 조회된 데이터가 없음 (정상 케이스)
  if (data.status === '013') return [];
  if (data.status !== '000') {
    throw new Error(`DART API 에러: ${data.message} (${data.status})`);
  }

  return data.list ?? [];
}

/** 종목명으로 DART 데이터 통합 조회 (분석 파이프라인용) */
export async function enrichWithDart(stockName: string): Promise<DartEnrichedData | null> {
  try {
    // 1. 종목명으로 고유번호 검색
    const results = await searchCorp(stockName);
    if (results.length === 0) return null;

    const { corpCode, stockCode } = results[0];

    // 2. 기업개황 + 최근 공시 동시 조회
    const [company, disclosures] = await Promise.all([
      getCompanyOverview(corpCode).catch(() => null),
      getDisclosures({
        corpCode,
        pageCount: 15,
        disclosureType: 'A', // 정기공시 (사업보고서, 분기보고서 등)
      }).catch(() => []),
    ]);

    return { company, recentDisclosures: disclosures, corpCode, stockCode };
  } catch (error) {
    console.error('DART 데이터 조회 실패:', error);
    return null;
  }
}
