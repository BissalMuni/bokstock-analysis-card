'use client';

import { useState } from 'react';
import { useWizardStore } from '@/lib/store/wizard-store';
import { executeStep } from '@/lib/prompts';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import type { AnalysisAngle } from '@/lib/types/stock';

export function StepStockInput() {
  const { stockName, setStockName, setAvailableAngles, setSessionId, nextStep, setLoading, isLoading } =
    useWizardStore();
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const trimmed = stockName.trim();
    if (!trimmed) {
      setError('종목명을 입력해주세요');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await executeStep<AnalysisAngle[]>('step1-stock-angles', {
        stockName: trimmed,
      });
      setAvailableAngles(result.data);
      if (result.sessionId) setSessionId(result.sessionId);
      nextStep();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 pt-8">
      <h2 className="text-xl font-bold text-zinc-900">종목을 입력하세요</h2>
      <p className="text-sm text-zinc-500">
        분석하고 싶은 종목명을 입력하면 분석 각도를 제안해 드립니다.
      </p>
      <div className="w-full max-w-sm">
        <TextInput
          id="stock-name"
          label="종목명"
          placeholder="예: 삼영전자"
          value={stockName}
          onChange={(e) => setStockName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          error={error}
          disabled={isLoading}
        />
      </div>
      <Button onClick={handleSubmit} disabled={isLoading || !stockName.trim()}>
        {isLoading ? '분석 중...' : '다음 →'}
      </Button>
    </div>
  );
}
