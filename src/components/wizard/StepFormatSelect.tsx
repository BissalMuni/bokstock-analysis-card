'use client';

import { useWizardStore } from '@/lib/store/wizard-store';
import { executeStep } from '@/lib/prompts';
import { Button } from '@/components/ui/Button';
import type { OutputFormat } from '@/lib/types/wizard';
import { OUTPUT_FORMAT_LABELS } from '@/lib/types/wizard';
import type { CardSlide } from '@/lib/types/stock';

const formatOptions: { value: OutputFormat; desc: string }[] = [
  { value: 'card-news', desc: '슬라이드 형태로 넘기며 확인하는 카드뉴스' },
  { value: 'summary-table', desc: '한눈에 보는 마크다운 요약 표' },
  { value: 'sns-caption', desc: 'SNS에 바로 붙여넣기 가능한 짧은 텍스트' },
];

export function StepFormatSelect() {
  const {
    stockName,
    outputFormat,
    setOutputFormat,
    analysisResults,
    selectedTerms,
    setFinalOutput,
    nextStep,
    setLoading,
    isLoading,
  } = useWizardStore();

  const handleNext = async () => {
    setLoading(true);
    try {
      const result = await executeStep<CardSlide[] | Record<string, string>>('step4-format-output', {
        stockName,
        outputFormat,
        analysisResults,
        selectedTerms,
      });

      // API 응답 형식에 따라 적절한 데이터 추출
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = result.data as any;
      if (Array.isArray(data)) {
        // 직접 배열로 온 경우
        setFinalOutput(data as CardSlide[]);
      } else if (typeof data === 'object' && data !== null) {
        if ('cardNews' in data && Array.isArray(data.cardNews)) {
          // {cardNews: [...], summaryTable, snsCaption} 형태
          setFinalOutput(data.cardNews as CardSlide[]);
        } else if ('summaryTable' in data && typeof data.summaryTable === 'string') {
          setFinalOutput(data.summaryTable);
        } else if ('snsCaption' in data && typeof data.snsCaption === 'string') {
          setFinalOutput(data.snsCaption);
        } else if ('content' in data && typeof data.content === 'string') {
          setFinalOutput(data.content);
        } else {
          setFinalOutput(JSON.stringify(data, null, 2));
        }
      } else if (typeof data === 'string') {
        setFinalOutput(data);
      } else {
        setFinalOutput(JSON.stringify(data, null, 2));
      }
      nextStep();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">출력 형식 선택</h2>
        <p className="mt-1 text-sm text-zinc-500">결과물의 형식을 선택하세요</p>
      </div>

      <div className="flex flex-col gap-2">
        {formatOptions.map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
              outputFormat === opt.value
                ? 'border-zinc-900 bg-zinc-50'
                : 'border-zinc-200 hover:border-zinc-400'
            }`}
          >
            <input
              type="radio"
              name="output-format"
              value={opt.value}
              checked={outputFormat === opt.value}
              onChange={() => setOutputFormat(opt.value)}
              className="accent-zinc-900"
            />
            <div>
              <span className="text-sm font-medium text-zinc-900">
                {OUTPUT_FORMAT_LABELS[opt.value]}
              </span>
              <p className="text-xs text-zinc-500">{opt.desc}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={isLoading}>
          {isLoading ? '생성 중...' : '결과 보기 →'}
        </Button>
      </div>
    </div>
  );
}
