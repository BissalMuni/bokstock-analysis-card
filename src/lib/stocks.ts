import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

export interface StockEntry {
  slug: string;
  title: string;
  stockCode: string;
  stockName: string;
  date: string;
  angles: number;
  sessionId?: string;
}

/** content/stocks/ 디렉토리에서 모든 MDX 파일 읽기 */
export async function getStockEntries(): Promise<StockEntry[]> {
  const dir = path.join(process.cwd(), 'content', 'stocks');

  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }

  const mdxFiles = files.filter((f) => f.endsWith('.mdx'));
  const entries: StockEntry[] = [];

  for (const file of mdxFiles) {
    try {
      const content = await fs.readFile(path.join(dir, file), 'utf-8');
      const { data } = matter(content);
      entries.push({
        slug: file.replace('.mdx', ''),
        title: data.title ?? file,
        stockCode: data.stockCode ?? '',
        stockName: data.stockName ?? '',
        date: data.date ?? '',
        angles: data.angles ?? 0,
        sessionId: data.sessionId,
      });
    } catch {
      // 파싱 실패 파일 무시
    }
  }

  // 날짜 내림차순 정렬
  entries.sort((a, b) => b.date.localeCompare(a.date));
  return entries;
}
