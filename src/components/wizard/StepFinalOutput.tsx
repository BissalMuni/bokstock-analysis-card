'use client';

import { useState } from 'react';
import { useWizardStore } from '@/lib/store/wizard-store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { CardSlide, SentimentTag } from '@/lib/types/stock';

const sentimentStyles: Record<SentimentTag, string> = {
  positive: 'bg-green-100 text-green-700',
  neutral: 'bg-zinc-100 text-zinc-600',
  negative: 'bg-red-100 text-red-700',
};

/** 카드뉴스 슬라이드 뷰어 */
function CardNewsViewer({ slides }: { slides: CardSlide[] }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = slides[currentSlide];

  return (
    <div className="flex flex-col gap-4">
      <Card className="min-h-[280px]">
        {/* 슬라이드 타입별 렌더링 */}
        {slide.type === 'cover' && (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-8">
            <h3 className="text-2xl font-bold text-zinc-900">{slide.title}</h3>
            <p className="text-sm text-zinc-500">{slide.content}</p>
          </div>
        )}

        {slide.type === 'analysis' && (
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-bold text-zinc-900">{slide.title}</h3>
              {slide.sentiment && (
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${sentimentStyles[slide.sentiment]}`}
                >
                  {slide.sentiment === 'positive'
                    ? '긍정'
                    : slide.sentiment === 'negative'
                      ? '부정'
                      : '중립'}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-zinc-600">{slide.content}</p>
            {slide.keyPoints && (
              <ul className="mt-3 space-y-1.5">
                {slide.keyPoints.map((point, i) => (
                  <li key={i} className="flex gap-2 text-sm text-zinc-700">
                    <span className="shrink-0 text-zinc-400">•</span>
                    {point}
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
              {slide.terms?.map((term) => (
                <div key={term.id} className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-sm font-medium text-zinc-900">{term.word}</p>
                  <p className="mt-0.5 text-xs text-zinc-600">{term.definition}</p>
                  <p className="mt-0.5 text-xs text-zinc-400 italic">
                    비유: {term.analogy}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {slide.type === 'summary' && (
          <div className="flex h-full flex-col justify-center gap-3 py-8">
            <h3 className="text-lg font-bold text-zinc-900">{slide.title}</h3>
            <div className="whitespace-pre-line text-sm text-zinc-700">
              {slide.content}
            </div>
          </div>
        )}
      </Card>

      {/* 슬라이드 네비게이션 */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setCurrentSlide((p) => p - 1)}
          disabled={currentSlide === 0}
        >
          ← 이전
        </Button>
        <span className="text-xs text-zinc-500">
          {currentSlide + 1} / {slides.length}
        </span>
        <Button
          variant="ghost"
          onClick={() => setCurrentSlide((p) => p + 1)}
          disabled={currentSlide === slides.length - 1}
        >
          다음 →
        </Button>
      </div>
    </div>
  );
}

/** 텍스트 결과 뷰어 (표, SNS 캡션) */
function TextViewer({ content }: { content: string }) {
  return (
    <Card>
      <pre className="whitespace-pre-wrap text-sm text-zinc-700">{content}</pre>
    </Card>
  );
}

export function StepFinalOutput() {
  const { finalOutput, outputFormat, reset } = useWizardStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text =
      typeof finalOutput === 'string'
        ? finalOutput
        : (finalOutput as CardSlide[])
            .map((s) => `[${s.title}]\n${s.content}`)
            .join('\n\n');

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!finalOutput) return null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">결과</h2>
        <p className="mt-1 text-sm text-zinc-500">생성된 분석 결과를 확인하세요</p>
      </div>

      {/* 형식별 뷰어 */}
      {outputFormat === 'card-news' && Array.isArray(finalOutput) ? (
        <CardNewsViewer slides={finalOutput as CardSlide[]} />
      ) : (
        <TextViewer content={finalOutput as string} />
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        <Button onClick={handleCopy} variant="secondary">
          {copied ? '복사됨!' : '복사'}
        </Button>
        <Button variant="ghost" onClick={reset}>
          처음부터 다시하기
        </Button>
      </div>
    </div>
  );
}
