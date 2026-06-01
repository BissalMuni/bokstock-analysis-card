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

interface DartStatus {
  found: boolean;
  corpName: string | null;
  stockCode: string | null;
  disclosureCount: number;
  disclosures: Array<{ reportNm: string; receiptDate: string; url: string }>;
}

// DART 접수일자(YYYYMMDD) → YYYY.MM.DD 표시
function formatDate(yyyymmdd: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(0, 4)}.${yyyymmdd.slice(4, 6)}.${yyyymmdd.slice(6, 8)}`;
}

// 파이프라인을 3개의 짧은 함수 호출로 분리(각 <300초). 클라이언트가 순차 호출한다.
const STEP_LABELS = [
  '', // 0 (미사용)
  '각도 생성',
  '상세 분석',
  '카드뉴스',
];
const TOTAL_STEPS = 3;

export default function AutoPage() {
  const [stockName, setStockName] = useState('');
  const [passCount, setPassCount] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [dartStatus, setDartStatus] = useState<DartStatus | null>(null);
  const [result, setResult] = useState<AutoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = useCallback(async () => {
    if (!stockName.trim()) return;
    const name = stockName.trim();

    setIsLoading(true);
    setError(null);
    setResult(null);
    setDartStatus(null);
    setProgress({ step: 0, total: TOTAL_STEPS, label: 'DART 전자공시 조회 중...' });

    // 각 단계는 별도 함수 호출(별도 라우트)이라 한 호출이 300초를 넘지 않는다.
    async function postJSON(url: string, body: unknown) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let data: { error?: string } & Record<string, unknown>;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`서버 에러 (${res.status})`);
      }
      if (!res.ok) throw new Error(data.error || `서버 에러 (${res.status})`);
      return data;
    }

    try {
      // ─── Step 0: DART 조회 (빠름, 배지 즉시 표시) ───
      const dart = await postJSON('/api/auto-analyze/dart', { stockName: name });
      setDartStatus(dart as unknown as DartStatus);

      // ─── Step 1: 각도 생성 (웹검색 멀티패스, 1~3분) ───
      setProgress({ step: 1, total: TOTAL_STEPS, label: '분석 각도 생성 중... (웹검색 멀티패스, 1~3분 소요)' });
      const a = await postJSON('/api/auto-analyze/angles', { stockName: name, passCount });

      // ─── Step 2: 상세 분석 ───
      setProgress({ step: 2, total: TOTAL_STEPS, label: '상세 분석 진행 중... (웹검색 멀티패스, 1~3분 소요)' });
      const d = await postJSON('/api/auto-analyze/details', {
        stockName: name,
        selectedAngles: a.selectedAngles,
        passCount,
        sessionId: a.sessionId,
      });

      // ─── Step 3: 용어 + 카드뉴스 ───
      setProgress({ step: 3, total: TOTAL_STEPS, label: '용어 추출 + 카드뉴스 생성 중...' });
      const c = await postJSON('/api/auto-analyze/cards', {
        stockName: name,
        analysis: d.analysis,
        sessionId: a.sessionId,
      });

      setResult({
        sessionId: a.sessionId as string | undefined,
        stockName: name,
        angles: a.angles as AutoResult['angles'],
        selectedAngles: a.selectedAngles as AutoResult['selectedAngles'],
        analysis: d.analysis as AutoResult['analysis'],
        terms: c.terms as AutoResult['terms'],
        output: c.output,
      });
      setProgress(null);
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

      {/* DART 조회 결과 표시 (분석 중·완료 모두 유지) */}
      {dartStatus && (
        <Card className={`mb-6 ${dartStatus.found ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className="flex items-center gap-3">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${dartStatus.found ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'}`}>
              {dartStatus.found ? '✓' : '!'}
            </span>
            <div className="min-w-0 text-sm">
              {dartStatus.found ? (
                <p className="text-emerald-800">
                  <span className="font-semibold">DART 전자공시 연동됨</span>
                  {dartStatus.corpName && <> · {dartStatus.corpName}</>}
                  {dartStatus.stockCode && <span className="text-emerald-600"> ({dartStatus.stockCode})</span>}
                  {' · '}공시 <span className="font-semibold">{dartStatus.disclosureCount}건</span> 반영
                </p>
              ) : (
                <p className="text-amber-800">
                  <span className="font-semibold">DART 데이터 없음</span> · 웹검색 결과만으로 분석합니다
                </p>
              )}
            </div>
          </div>

          {/* 불러온 공시 목록 */}
          {dartStatus.found && dartStatus.disclosures.length > 0 && (
            <ul className="mt-3 divide-y divide-emerald-100 border-t border-emerald-100 pt-2">
              {dartStatus.disclosures.map((d, i) => (
                <li key={i} className="py-1.5">
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-baseline gap-2 text-sm text-emerald-900 hover:underline"
                  >
                    <span className="shrink-0 font-mono text-xs text-emerald-600">{formatDate(d.receiptDate)}</span>
                    <span className="min-w-0 truncate">{d.reportNm}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
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
