'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AutoResultView } from '@/components/auto/AutoResultView';

interface AutoResult {
  sessionId?: string;
  stockName: string;
  angles: Array<{ id: string; label: string; description: string; source: string; importance: number; confidence?: number }>;
  selectedAngles: Array<{ id: string; label: string; description: string; source: string; importance: number }>;
  analysis: Array<{ angleId: string; title: string; summary: string; keyPoints: string[]; sentiment: string; confidence?: number }>;
  terms: Array<{ id: string; word: string; definition: string; analogy: string }>;
  output: unknown;
}

export default function AutoPage() {
  const [stockName, setStockName] = useState('');
  const [passCount, setPassCount] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<AutoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    if (!stockName.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setProgress('DART 공시 조회 + 멀티패스 분석 시작...');

    try {
      const res = await fetch('/api/auto-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockName: stockName.trim(), passCount }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '분석 실패');
      }

      const data = await res.json();
      setResult(data);
      setProgress('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 에러');
      setProgress('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">자동 분석 모드</h1>
        <p className="mt-1 text-sm text-zinc-500">
          종목명 입력 → DART + 웹검색 + 멀티패스 분석 → 카드뉴스 자동 생성
        </p>
      </div>

      {/* 입력 폼 */}
      <Card className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="stock" className="block text-sm font-medium text-zinc-700 mb-1">
              종목명
            </label>
            <input
              id="stock"
              type="text"
              value={stockName}
              onChange={(e) => setStockName(e.target.value)}
              placeholder="예: 삼성전자"
              disabled={isLoading}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
              onKeyDown={(e) => e.key === 'Enter' && handleRun()}
            />
          </div>
          <div className="w-32">
            <label htmlFor="passes" className="block text-sm font-medium text-zinc-700 mb-1">
              분석 횟수
            </label>
            <select
              id="passes"
              value={passCount}
              onChange={(e) => setPassCount(Number(e.target.value))}
              disabled={isLoading}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
            >
              <option value={1}>1회</option>
              <option value={2}>2회</option>
              <option value={3}>3회 (권장)</option>
              <option value={4}>4회</option>
              <option value={5}>5회</option>
            </select>
          </div>
          <Button onClick={handleRun} disabled={isLoading || !stockName.trim()}>
            {isLoading ? '분석 중...' : '자동 분석 시작'}
          </Button>
        </div>
      </Card>

      {/* 로딩 상태 */}
      {isLoading && (
        <Card className="mb-6">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
            <div>
              <p className="text-sm font-medium text-zinc-900">{progress}</p>
              <p className="text-xs text-zinc-500 mt-1">
                멀티패스 {passCount}회 × 웹검색 — 1~3분 소요될 수 있습니다
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 에러 */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}

      {/* 결과 */}
      {result && <AutoResultView result={result} />}
    </div>
  );
}
