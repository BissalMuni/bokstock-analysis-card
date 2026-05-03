'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { SourceBadges } from '@/components/ui/SourceBadges';
import type { SentimentTag } from '@/lib/types/stock';
import type { ParsedAnalysis, ParsedTerm } from '@/lib/mdx/parse';

interface StockAnalysisViewProps {
  stockName: string;
  stockCode: string;
  date: string;
  analyses: ParsedAnalysis[];
  terms: ParsedTerm[];
  pdfPath?: string | null;
}

const sentimentStyles: Record<SentimentTag, string> = {
  positive: 'bg-green-100 text-green-700',
  neutral: 'bg-zinc-100 text-zinc-600',
  negative: 'bg-red-100 text-red-700',
};

const sentimentLabel: Record<SentimentTag, string> = {
  positive: '📈 긍정',
  neutral: '➖ 중립',
  negative: '📉 부정',
};

/** 신뢰도 바 */
function ConfidenceBadge({ confidence }: { confidence: number }) {
  const colors = [
    'bg-zinc-200',
    'bg-zinc-300',
    'bg-amber-400',
    'bg-green-400',
    'bg-green-600',
  ];
  return (
    <div className="flex items-center gap-1" title={`신뢰도 ${confidence}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 w-3 rounded-full ${i < confidence ? colors[confidence - 1] : 'bg-zinc-100'}`}
        />
      ))}
      <span className="ml-1 text-[10px] text-zinc-400">{confidence}/5</span>
    </div>
  );
}

export function StockAnalysisView({ stockName, stockCode, date, analyses, terms, pdfPath }: StockAnalysisViewProps) {
  const [tab, setTab] = useState<'analysis' | 'pdf'>('analysis');

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-2xl font-bold text-zinc-900">{stockName} 종합 분석</h1>
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-500">
          <span>종목코드: {stockCode}</span>
          <span>분석일: {date}</span>
          <span>분석 꼭지: {analyses.length}개</span>
        </div>
      </div>

      {/* 탭 */}
      {pdfPath && (
        <div className="flex gap-1 rounded-lg bg-zinc-100 p-1">
          <button
            type="button"
            onClick={() => setTab('analysis')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === 'analysis' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            📊 분석 보기
          </button>
          <button
            type="button"
            onClick={() => setTab('pdf')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === 'pdf' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            📄 슬라이드 보기
          </button>
        </div>
      )}

      {/* 분석 탭 */}
      {tab === 'analysis' && (
        <>
          {/* 분석 요약 카드 */}
          <Card>
            <h2 className="mb-3 text-lg font-bold text-zinc-900">분석 요약</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {analyses.map((a, idx) => (
                <div key={idx} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-1.5">
                      <span className="text-xs">{a.sourceType === 'dart' ? '📋' : '📰'}</span>
                      <span className="text-sm font-medium text-zinc-900">{a.title}</span>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${sentimentStyles[a.sentiment]}`}>
                      {sentimentLabel[a.sentiment]}
                    </span>
                  </div>
                  <div className="mt-2">
                    <ConfidenceBadge confidence={a.confidence} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 상세 분석 */}
          {analyses.map((a, idx) => (
            <Card key={idx}>
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold text-zinc-900">{a.title}</h2>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${sentimentStyles[a.sentiment]}`}>
                  {sentimentLabel[a.sentiment]}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-zinc-400">
                  {a.sourceType === 'dart' ? '📋 DART 공시 기반' : '📰 뉴스/이슈 기반'}
                </span>
                <ConfidenceBadge confidence={a.confidence} />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">{a.summary}</p>
              {a.keyPoints.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {a.keyPoints.map((p, i) => (
                    <li key={i} className="flex gap-2 text-sm text-zinc-700">
                      <span className="shrink-0 text-zinc-400">•</span>{p}
                    </li>
                  ))}
                </ul>
              )}
              <SourceBadges sources={a.sources} />
            </Card>
          ))}

          {/* 용어 해설 */}
          {terms.length > 0 && (
            <Card>
              <h2 className="mb-3 text-lg font-bold text-zinc-900">용어 해설</h2>
              <div className="space-y-2">
                {terms.map((t, idx) => (
                  <div key={idx} className="rounded-lg bg-zinc-50 p-3">
                    <p className="text-sm font-medium text-zinc-900">{t.word}</p>
                    <p className="mt-0.5 text-xs text-zinc-600">{t.definition}</p>
                    <p className="mt-0.5 text-xs italic text-zinc-400">비유: {t.analogy}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 면책 */}
          <p className="text-center text-xs text-zinc-400">
            이 분석은 AI 기반 자동 분석 결과입니다. 투자 판단의 참고용으로만 활용하세요.
          </p>
        </>
      )}

      {/* PDF 탭 */}
      {tab === 'pdf' && pdfPath && (
        <div className="flex flex-col gap-4">
          <iframe
            src={pdfPath}
            className="h-[80vh] w-full rounded-xl border border-zinc-200"
            title="슬라이드"
          />
          <a
            href={pdfPath}
            download
            className="self-center rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white no-underline transition-colors hover:bg-zinc-700"
          >
            PDF 다운로드
          </a>
        </div>
      )}
    </div>
  );
}
