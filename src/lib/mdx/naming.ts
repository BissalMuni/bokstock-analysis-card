/** MDX 파일명 생성 */
export function buildMdxFileName(stockCode: string, stockName: string, date: string): string {
  return `${stockCode}_${stockName}_${date}.mdx`;
}

/** 아티팩트 파일명 생성 */
export function buildArtifactFileName(
  stockCode: string,
  stockName: string,
  date: string,
  type: 'slides' | 'report',
): string {
  const ext = type === 'slides' ? 'pdf' : 'md';
  return `${stockCode}_${stockName}_${date}_${type}.${ext}`;
}

/** URL slug 생성 */
export function buildSlug(stockCode: string, stockName: string, date: string): string {
  return `${stockCode}_${stockName}_${date}`;
}

/** 오늘 날짜 YYYYMMDD */
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
