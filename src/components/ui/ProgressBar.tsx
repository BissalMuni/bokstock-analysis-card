'use client';

import type { WizardStep } from '@/lib/types/wizard';
import { STEP_LABELS } from '@/lib/types/wizard';

interface ProgressBarProps {
  currentStep: WizardStep;
}

const steps: WizardStep[] = [1, 2, 3, 4, 5, 6];

export function ProgressBar({ currentStep }: ProgressBarProps) {
  return (
    <nav aria-label="위자드 진행 상태" className="w-full">
      <ol className="flex items-center gap-1">
        {steps.map((step) => {
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;

          return (
            <li key={step} className="flex-1">
              <div className="flex flex-col items-center gap-1">
                {/* 진행 바 */}
                <div
                  className={`h-1.5 w-full rounded-full transition-colors ${
                    isCompleted
                      ? 'bg-zinc-900'
                      : isCurrent
                        ? 'bg-zinc-400'
                        : 'bg-zinc-200'
                  }`}
                  role="progressbar"
                  aria-valuenow={isCompleted ? 100 : isCurrent ? 50 : 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
                {/* 라벨 (모바일에서는 현재 단계만 표시) */}
                <span
                  className={`hidden text-[10px] sm:block ${
                    isCurrent
                      ? 'font-semibold text-zinc-900'
                      : isCompleted
                        ? 'text-zinc-600'
                        : 'text-zinc-400'
                  }`}
                >
                  {STEP_LABELS[step]}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      {/* 모바일: 현재 단계 텍스트 표시 */}
      <p className="mt-1 text-center text-xs text-zinc-500 sm:hidden">
        {currentStep}/6 · {STEP_LABELS[currentStep]}
      </p>
    </nav>
  );
}
