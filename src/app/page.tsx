'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [stockName, setStockName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const name = stockName.trim();
    if (!name || loading) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auto-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockName: name, passCount: 3, angleCount: 5 }),
      });
      const data = await res.json();
      if (data.error) {
        alert(`분석 실패: ${data.error}`);
        return;
      }
      // 분석 완료 후 결과 페이지로 이동
      const code = data.stockCode ?? '000000';
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      router.push(`/stocks/${code}_${today}`);
    } catch (err) {
      alert('분석 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      {/* 상단 여백 + 타이틀 */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <h1 className="text-2xl font-semibold text-zinc-800">
          어떤 종목을 분석할까요?
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          종목명을 입력하면 자동으로 분석을 시작합니다
        </p>
      </div>

      {/* 하단 입력란 */}
      <div className="w-full max-w-2xl pb-8">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={stockName}
            onChange={(e) => setStockName(e.target.value)}
            placeholder="종목명을 입력하세요 (예: 삼성전자)"
            disabled={loading}
            className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 pr-14 text-sm text-zinc-900 shadow-sm outline-none transition-all placeholder:text-zinc-400 focus:border-zinc-400 focus:shadow-md disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!stockName.trim() || loading}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-zinc-900 p-2 text-white transition-colors hover:bg-zinc-700 disabled:bg-zinc-300 disabled:cursor-not-allowed"
          >
            {loading ? (
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-75" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 10h14M12 5l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </form>
        {loading && (
          <p className="mt-3 text-center text-sm text-zinc-400 animate-pulse">
            분석 중입니다... 잠시만 기다려주세요
          </p>
        )}
      </div>
    </div>
  );
}
