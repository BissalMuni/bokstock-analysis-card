'use client';

import { useWizardStore } from '@/lib/store/wizard-store';
import { Button } from '@/components/ui/Button';

export function StepTermSelect() {
  const { availableTerms, selectedTerms, toggleTerm, nextStep } = useWizardStore();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">용어 해설 선택</h2>
        <p className="mt-1 text-sm text-zinc-500">
          카드뉴스에 포함할 용어를 선택하세요 (선택사항)
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {availableTerms.map((term) => {
          const isSelected = selectedTerms.some((t) => t.id === term.id);
          return (
            <label
              key={term.id}
              className={`flex cursor-pointer gap-3 rounded-lg border-2 p-3 transition-colors ${
                isSelected
                  ? 'border-zinc-900 bg-zinc-50'
                  : 'border-zinc-200 hover:border-zinc-400'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleTerm(term)}
                className="mt-0.5 shrink-0 accent-zinc-900"
              />
              <div>
                <span className="text-sm font-medium text-zinc-900">{term.word}</span>
                <p className="mt-0.5 text-xs text-zinc-600">{term.definition}</p>
                <p className="mt-0.5 text-xs text-zinc-400 italic">
                  비유: {term.analogy}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={nextStep}>
          건너뛰기
        </Button>
        <Button onClick={nextStep}>
          다음 → {selectedTerms.length > 0 && `(${selectedTerms.length}개 선택)`}
        </Button>
      </div>
    </div>
  );
}
