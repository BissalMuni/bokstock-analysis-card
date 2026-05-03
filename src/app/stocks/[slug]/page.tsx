import fs from 'fs/promises';
import path from 'path';
import { notFound } from 'next/navigation';
import matter from 'gray-matter';
import { parseMdxContent } from '@/lib/mdx/parse';
import { StockAnalysisView } from '@/components/stocks/StockAnalysisView';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function StockAnalysisPage({ params }: PageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const filePath = path.join(process.cwd(), 'content', 'stocks', `${decodedSlug}.mdx`);

  let fileContent: string;
  try {
    fileContent = await fs.readFile(filePath, 'utf-8');
  } catch {
    notFound();
  }

  const { content, data } = matter(fileContent);
  const { analyses, terms } = parseMdxContent(content);

  // PDF 슬라이드 존재 확인
  const pdfFileName = `${decodedSlug}_slides.pdf`;
  const pdfFilePath = path.join(process.cwd(), 'content', 'stocks', 'artifacts', pdfFileName);
  let pdfPath: string | null = null;
  try {
    await fs.access(pdfFilePath);
    pdfPath = `/api/pdf/${decodedSlug}`;
  } catch {
    // PDF 없음
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <StockAnalysisView
        stockName={data.stockName ?? decodedSlug}
        stockCode={data.stockCode ?? ''}
        date={data.date ?? ''}
        analyses={analyses}
        terms={terms}
        pdfPath={pdfPath}
      />
    </div>
  );
}
