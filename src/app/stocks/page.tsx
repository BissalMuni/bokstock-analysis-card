import { getStockEntries } from '@/lib/stocks';
import Link from 'next/link';

export default async function StocksIndexPage() {
  const entries = await getStockEntries();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-zinc-900 mb-1">분석 아카이브</h1>
      <p className="text-sm text-zinc-500 mb-6">총 {entries.length}건</p>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center">
          <p className="text-sm text-zinc-500">아직 분석 결과가 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((e) => (
            <Link
              key={e.slug}
              href={`/stocks/${e.slug}`}
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 no-underline transition-all hover:border-zinc-400 hover:shadow-sm"
            >
              <div>
                <span className="text-sm font-medium text-zinc-900">{e.stockName}</span>
                <span className="ml-2 text-xs text-zinc-400">{e.stockCode}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span>{e.angles}개 꼭지</span>
                <span>{e.date}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
