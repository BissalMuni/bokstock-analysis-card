'use client';

import { useState, useCallback } from 'react';
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

interface ProgressState {
  step: number;
  total: number;
  label: string;
  subDone?: number;
  subTotal?: number;
}

const STEP_LABELS = [
  '', // 0 (미사용)
  'DART 공시',
  '각도 생성',
  '상세 분석',
  '용어 추출',
  '카드뉴스',
];

export default function AutoPage() {
  const [stockName, setStockName] = useState('');
  const [passCount, setPassCount] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [result, setResult] = useState<AutoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = useCallback(async () => {
    if (!stockName.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setProgress({ step: 0, total: 5, label: '분석 준비 중...' });

    try {
      const res = await fetch('/api/auto-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockName: stockName.trim(), passCount }),
      });

      if (!res.ok) {
        const text = await res.text();
        let message = '분석 실패';
        try { message = JSON.parse(text).error || message; } catch { message = `서버 에러 (${res.status})`; }
        throw new Error(message);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('스트림을 읽을 수 없습니다');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE 메시지 파싱
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7);
          } else if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (eventType === 'progress') {
              setProgress((prev) => ({
                ...data,
                subDone: data.step === prev?.step ? prev?.subDone : undefined,
                subTotal: data.step === prev?.step ? prev?.subTotal : undefined,
              }));
            } else if (eventType === 'sub-progress') {
              setProgress((prev) => prev ? { ...prev, subDone: data.done, subTotal: data.total } : prev);
            } else if (eventType === 'result') {
              setResult(data);
              setProgress(null);
            } else if (eventType === 'error') {
              throw new Error(data.error);
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 에러');
      setProgress(null);
    } finally {
      setIsLoading(false);
    }
  }, [stockName, passCount]);

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

      {/* 진행 상황 */}
      {isLoading && progress && (
        <Card className="mb-6">
          <div className="space-y-4">
            {/* 스텝 진행 바 */}
            <div className="flex items-center gap-1">
              {Array.from({ length: progress.total }, (_, i) => {
                const stepNum = i + 1;
                const isCompleted = stepNum < progress.step;
                const isCurrent = stepNum === progress.step;
                return (
                  <div key={stepNum} className="flex-1 flex flex-col items-center gap-1.5">
                    <div
                      className={`h-2 w-full rounded-full transition-all duration-500 ${
                        isCompleted
                          ? 'bg-emerald-500'
                          : isCurrent
                            ? 'bg-zinc-800 animate-pulse'
                            : 'bg-zinc-200'
                      }`}
                    />
                    <span
                      className={`text-[10px] leading-none ${
                        isCurrent
                          ? 'font-semibold text-zinc-900'
                          : isCompleted
                            ? 'text-emerald-600'
                            : 'text-zinc-400'
                      }`}
                    >
                      {STEP_LABELS[stepNum]}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 현재 작업 설명 */}
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">{progress.label}</p>
                {progress.subDone !== undefined && progress.subTotal !== undefined && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 flex-1 rounded-full bg-zinc-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-zinc-700 transition-all duration-300"
                        style={{ width: `${(progress.subDone / progress.subTotal) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-500 shrink-0">
                      {progress.subDone}/{progress.subTotal}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 전체 진행률 텍스트 */}
            <p className="text-xs text-zinc-500 text-right">
              {progress.step}/{progress.total} 단계 · 멀티패스 {passCount}회
            </p>
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
