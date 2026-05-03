'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SourceBadges } from '@/components/ui/SourceBadges';
import type { CardSlide, SentimentTag, SourceCitation } from '@/lib/types/stock';

interface AutoResultProps {
  result: {
    sessionId?: string;
    stockName: string;
    angles: Array<{ id: string; label: string; description: string; source: string; importance: number; confidence?: number }>;
    selectedAngles: Array<{ id: string; label: string; description: string; source: string; importance: number }>;
    analysis: Array<{ angleId: string; title: string; summary: string; keyPoints: string[]; sentiment: string; confidence?: number; sources?: SourceCitation[] }>;
    terms: Array<{ id: string; word: string; definition: string; analogy: string }>;
    output: unknown;
  };
}

const sentimentStyles: Record<SentimentTag, string> = {
  positive: 'bg-green-100 text-green-700',
  neutral: 'bg-zinc-100 text-zinc-600',
  negative: 'bg-red-100 text-red-700',
};

const sentimentLabel: Record<SentimentTag, string> = {
  positive: '긍정',
  neutral: '중립',
  negative: '부정',
};

/** 신뢰도 바 */
function ConfidenceBadge({ confidence }: { confidence?: number }) {
  if (!confidence) return null;
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
      <span className="text-[10px] text-zinc-400 ml-1">{confidence}/5</span>
    </div>
  );
}

/** 카드뉴스 세로 나열 뷰어 */
function SlideViewer({ slides }: { slides: CardSlide[] }) {
  return (
    <div className="flex flex-col gap-4">
      {slides.map((slide, idx) => (
        <Card key={`${slide.type}-${idx}`}>
          {slide.type === 'cover' && (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <h3 className="text-2xl font-bold text-zinc-900">{slide.title}</h3>
              <p className="text-sm text-zinc-500">{slide.content}</p>
            </div>
          )}
          {slide.type === 'analysis' && (
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-bold text-zinc-900">{slide.title}</h3>
                {slide.sentiment && (
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${sentimentStyles[slide.sentiment]}`}>
                    {sentimentLabel[slide.sentiment]}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-zinc-600">{slide.content}</p>
              {slide.keyPoints && (
                <ul className="mt-3 space-y-1.5">
                  {slide.keyPoints.map((p, i) => (
                    <li key={i} className="flex gap-2 text-sm text-zinc-700">
                      <span className="shrink-0 text-zinc-400">•</span>{p}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {slide.type === 'terms' && (
            <div>
              <h3 className="text-lg font-bold text-zinc-900">{slide.title}</h3>
              <p className="mt-1 text-xs text-zinc-500">{slide.content}</p>
              <div className="mt-3 space-y-3">
                {slide.terms?.map((t) => (
                  <div key={t.id} className="rounded-lg bg-zinc-50 p-3">
                    <p className="text-sm font-medium text-zinc-900">{t.word}</p>
                    <p className="mt-0.5 text-xs text-zinc-600">{t.definition}</p>
                    <p className="mt-0.5 text-xs text-zinc-400 italic">비유: {t.analogy}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {slide.type === 'summary' && (
            <div className="flex flex-col justify-center gap-3 py-8">
              <h3 className="text-lg font-bold text-zinc-900">{slide.title}</h3>
              <div className="whitespace-pre-line text-sm text-zinc-700">{slide.content}</div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

export function AutoResultView({ result }: AutoResultProps) {
  const [tab, setTab] = useState<'overview' | 'analysis' | 'cards'>('overview');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const slides = result.output as CardSlide[];
    const text = Array.isArray(slides)
      ? slides.map((s) => `[${s.title}]\n${s.content}`).join('\n\n')
      : JSON.stringify(result.output, null, 2);

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: 'overview' as const, label: '분석 요약' },
    { id: 'analysis' as const, label: '상세 분석' },
    { id: 'cards' as const, label: '카드뉴스' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* 탭 네비게이션 */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 분석 요약 탭 */}
      {tab === 'overview' && (
        <div className="flex flex-col gap-4">
          <Card>
            <h3 className="text-lg font-bold text-zinc-900 mb-3">
              {result.stockName} 분석 각도 ({result.selectedAngles.length}개 선택)
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {result.angles.map((a) => {
                const isSelected = result.selectedAngles.some((s) => s.id === a.id);
                return (
                  <div
                    key={a.id}
                    className={`rounded-lg border p-3 ${isSelected ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 opacity-50'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs text-zinc-400 mr-1">
                          {a.source === 'news' ? '📰' : '📋'}
                        </span>
                        <span className="text-sm font-medium text-zinc-900">{a.label}</span>
                      </div>
                      <span className="text-xs text-zinc-400">중요도 {a.importance}</span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">{a.description}</p>
                    <ConfidenceBadge confidence={a.confidence} />
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-bold text-zinc-900 mb-3">
              추출 용어 ({result.terms.length}개)
            </h3>
            <div className="space-y-2">
              {result.terms.map((t) => (
                <div key={t.id} className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-sm font-medium text-zinc-900">{t.word}</p>
                  <p className="text-xs text-zinc-600">{t.definition}</p>
                  <p className="text-xs text-zinc-400 italic">비유: {t.analogy}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* 상세 분석 탭 */}
      {tab === 'analysis' && (
        <div className="flex flex-col gap-4">
          {result.analysis.map((a) => (
            <Card key={a.angleId}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-bold text-zinc-900">{a.title}</h3>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${sentimentStyles[a.sentiment as SentimentTag] ?? sentimentStyles.neutral}`}>
                  {sentimentLabel[a.sentiment as SentimentTag] ?? '중립'}
                </span>
              </div>
              <ConfidenceBadge confidence={a.confidence} />
              <p className="mt-2 text-sm text-zinc-600">{a.summary}</p>
              <ul className="mt-3 space-y-1.5">
                {a.keyPoints.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm text-zinc-700">
                    <span className="shrink-0 text-zinc-400">•</span>{p}
                  </li>
                ))}
              </ul>
              <SourceBadges sources={a.sources} />
            </Card>
          ))}
        </div>
      )}

      {/* 카드뉴스 탭 */}
      {tab === 'cards' && Array.isArray(result.output) && (
        <SlideViewer slides={result.output as CardSlide[]} />
      )}

      {/* 하단 액션 */}
      <div className="flex gap-3">
        <Button onClick={handleCopy} variant="secondary">
          {copied ? '복사됨!' : '전체 복사'}
        </Button>
        {result.sessionId && (
          <span className="self-center text-xs text-zinc-400">
            세션: {result.sessionId.slice(0, 8)}...
          </span>
        )}
      </div>
    </div>
  );
}
