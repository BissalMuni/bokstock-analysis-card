'use client';

import { useWizardStore } from '@/lib/store/wizard-store';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { StepStockInput } from './StepStockInput';
import { StepAngleSelect } from './StepAngleSelect';
import { StepAnalysisReview } from './StepAnalysisReview';
import { StepTermSelect } from './StepTermSelect';
import { StepFormatSelect } from './StepFormatSelect';
import { StepFinalOutput } from './StepFinalOutput';

/** 위자드 단계별 컴포넌트 렌더링 */
function StepContent() {
  const step = useWizardStore((s) => s.currentStep);

  switch (step) {
    case 1:
      return <StepStockInput />;
    case 2:
      return <StepAngleSelect />;
    case 3:
      return <StepAnalysisReview />;
    case 4:
      return <StepTermSelect />;
    case 5:
      return <StepFormatSelect />;
    case 6:
      return <StepFinalOutput />;
  }
}

export function WizardShell() {
  const { currentStep, prevStep, isLoading } = useWizardStore();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <ProgressBar currentStep={currentStep} />

      {/* 단계 콘텐츠 (fade-in 전환 애니메이션) */}
      <div
        key={currentStep}
        className="min-h-[360px] animate-fade-in"
      >
        <StepContent />
      </div>

      {/* 하단 네비게이션 */}
      {currentStep > 1 && currentStep < 6 && (
        <div className="flex justify-start">
          <Button variant="ghost" onClick={prevStep} disabled={isLoading}>
            ← 이전
          </Button>
        </div>
      )}
    </div>
  );
}
