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
// 빌드 시 생성한 상장사 목록(상장사만, ~300KB). 런타임 3.4MB 다운로드를 대체한다.
// 갱신: pnpm dart:corp-map (scripts/build-corp-map.mjs)
import staticCorpMap from './corp-map.json';

const DART_BASE = 'https://opendart.fss.or.kr/api';

// DART API는 간헐적으로 응답이 느리거나 멈춘다. 타임아웃 없이 fetch하면
// 연결이 무한정 대기하며 서버리스 함수 전체 시간(300s)을 소진하므로 반드시 가드를 둔다.
const DART_TIMEOUT_MS = 10_000;

function getDartKey(): string {
  const key = process.env.DART_KEY;
  if (!key) throw new Error('DART_KEY 환경변수가 설정되지 않았습니다');
  return key;
}

/** AbortController 기반 타임아웃을 적용한 fetch. 시간 초과 시 명확한 에러를 던진다. */
async function fetchWithTimeout(url: string, timeoutMs = DART_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`DART 요청 타임아웃 (${timeoutMs}ms 초과)`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
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
  // 3.4MB 다운로드라 일반 호출보다 넉넉한 타임아웃을 준다.
  const res = await fetchWithTimeout(url, 20_000);

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

/** 항목 배열에서 종목명으로 매칭 (정확 매치 → 포함 매치 순) */
function matchCorp(
  entries: Array<{ corp_code: string; corp_name: string; stock_code: string }>,
  q: string,
): CorpSearchResult[] {
  return entries
    .filter((e) => e.stock_code && e.stock_code.trim() !== '')
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
}

/** 종목명으로 고유번호 검색 (상장사 우선) */
export async function searchCorp(query: string): Promise<CorpSearchResult[]> {
  const q = query.toLowerCase().trim();

  // 1차: 번들된 정적 목록에서 조회 (네트워크 0회)
  const fromStatic = matchCorp(staticCorpMap, q);
  if (fromStatic.length > 0) return fromStatic;

  // 2차: 정적 목록에 없으면(신규 상장 등) 전체 목록 다운로드 폴백
  const entries = await fetchCorpCodeList();
  return matchCorp(entries, q);
}

/** 기업개황 조회 */
export async function getCompanyOverview(corpCode: string): Promise<CompanyOverview> {
  const url = `${DART_BASE}/company.json?crtfc_key=${getDartKey()}&corp_code=${corpCode}`;
  const res = await fetchWithTimeout(url);

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
  const res = await fetchWithTimeout(url);

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
