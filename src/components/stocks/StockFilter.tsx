'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

interface StockEntry {
  slug: string;
  title: string;
  stockCode: string;
  stockName: string;
  date: string;
  angles: number;
  sessionId?: string;
}

interface StockFilterProps {
  entries: StockEntry[];
  stocks: string[];
}

export function StockFilter({ entries, stocks }: StockFilterProps) {
  const [selectedStock, setSelectedStock] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // 고유 월 목록 추출
  const months = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      if (e.date && e.date.length >= 7) {
        set.add(e.date.slice(0, 7)); // YYYY-MM
      }
    }
    return [...set].sort().reverse();
  }, [entries]);

  // 필터링
  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (selectedStock && e.stockName !== selectedStock) return false;
      if (selectedMonth && !e.date.startsWith(selectedMonth)) return false;
      return true;
    });
  }, [entries, selectedStock, selectedMonth]);

  return (
    <div className="flex flex-col gap-6">
      {/* 필터 바 */}
      <div className="flex flex-wrap gap-3">
        <select
          value={selectedStock}
          onChange={(e) => setSelectedStock(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="">전체 종목</option>
          {stocks.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="">전체 기간</option>
          {months.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {(selectedStock || selectedMonth) && (
          <button
            onClick={() => { setSelectedStock(''); setSelectedMonth(''); }}
            className="rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100 transition-colors"
          >
            필터 초기화
          </button>
        )}

        <span className="self-center text-xs text-zinc-400 ml-auto">
          {filtered.length}건
        </span>
      </div>

      {/* 분석 목록 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {filtered.map((entry) => (
          <Link key={entry.slug} href={`/stocks/${entry.slug}`}>
            <Card className="transition-all hover:border-zinc-400 hover:shadow-md cursor-pointer h-full">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">{entry.stockName}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{entry.stockCode}</p>
                </div>
                <span className="shrink-0 text-xs text-zinc-400">{entry.date}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                <span className="rounded bg-zinc-100 px-1.5 py-0.5">
                  {entry.angles}개 꼭지
                </span>
                {entry.sessionId && (
                  <span className="text-zinc-300 truncate max-w-[100px]">
                    {entry.sessionId.slice(0, 8)}...
                  </span>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <p className="text-sm text-zinc-500">필터 조건에 맞는 결과가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
