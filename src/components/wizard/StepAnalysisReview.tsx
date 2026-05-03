'use client';

import { useWizardStore } from '@/lib/store/wizard-store';
import { executeStep } from '@/lib/prompts';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SourceBadges } from '@/components/ui/SourceBadges';
import type { SentimentTag } from '@/lib/types/stock';
import type { Term } from '@/lib/types/stock';

const sentimentStyles: Record<SentimentTag, { label: string; className: string }> = {
  positive: { label: '긍정', className: 'bg-green-100 text-green-700' },
  neutral: { label: '중립', className: 'bg-zinc-100 text-zinc-600' },
  negative: { label: '부정', className: 'bg-red-100 text-red-700' },
};

export function StepAnalysisReview() {
  const { analysisResults, setAvailableTerms, nextStep, setLoading, isLoading } =
    useWizardStore();

  const handleNext = async () => {
    setLoading(true);
    try {
      const result = await executeStep<Term[]>('step3-term-extraction', {
        analysisResults,
      });
      setAvailableTerms(result.data);
      nextStep();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">분석 결과</h2>
        <p className="mt-1 text-sm text-zinc-500">
          선택한 관점별 분석 결과를 확인하세요
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {analysisResults.map((result) => {
          const style = sentimentStyles[result.sentiment];
          return (
            <Card key={result.angleId}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-zinc-900">{result.title}</h3>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.className}`}
                >
                  {style.label}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-600">{result.summary}</p>
              <ul className="mt-3 space-y-1">
                {result.keyPoints.map((point, i) => (
                  <li key={i} className="flex gap-2 text-sm text-zinc-700">
                    <span className="shrink-0 text-zinc-400">•</span>
                    {point}
                  </li>
                ))}
              </ul>
              <SourceBadges sources={result.sources} />
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={isLoading}>
          {isLoading ? '용어 추출 중...' : '다음 →'}
        </Button>
      </div>
    </div>
  );
}
