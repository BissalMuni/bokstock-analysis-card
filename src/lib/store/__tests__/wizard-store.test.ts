import { describe, it, expect, beforeEach } from 'vitest';
import { useWizardStore } from '../wizard-store';

describe('wizard-store', () => {
  beforeEach(() => {
    useWizardStore.getState().reset();
  });

  it('초기 상태는 Step 1', () => {
    expect(useWizardStore.getState().currentStep).toBe(1);
  });

  it('nextStep으로 단계 진행', () => {
    useWizardStore.getState().nextStep();
    expect(useWizardStore.getState().currentStep).toBe(2);
  });

  it('prevStep으로 이전 단계 이동', () => {
    useWizardStore.getState().setStep(3);
    useWizardStore.getState().prevStep();
    expect(useWizardStore.getState().currentStep).toBe(2);
  });

  it('Step 1 이하로는 이동 불가', () => {
    useWizardStore.getState().prevStep();
    expect(useWizardStore.getState().currentStep).toBe(1);
  });

  it('Step 6 이상으로는 이동 불가', () => {
    useWizardStore.getState().setStep(6);
    useWizardStore.getState().nextStep();
    expect(useWizardStore.getState().currentStep).toBe(6);
  });

  it('꼭지 선택 토글 (추가/제거)', () => {
    const angle = { id: 'test', label: 'Test', description: 'desc', source: 'news' as const, importance: 7 };
    useWizardStore.getState().toggleAngle(angle);
    expect(useWizardStore.getState().selectedAngles).toHaveLength(1);

    useWizardStore.getState().toggleAngle(angle);
    expect(useWizardStore.getState().selectedAngles).toHaveLength(0);
  });

  it('꼭지 최대 5개 제한', () => {
    const angles = [
      { id: 'a', label: 'A', description: '', source: 'news' as const, importance: 9 },
      { id: 'b', label: 'B', description: '', source: 'news' as const, importance: 8 },
      { id: 'c', label: 'C', description: '', source: 'dart' as const, importance: 7 },
      { id: 'd', label: 'D', description: '', source: 'dart' as const, importance: 6 },
      { id: 'e', label: 'E', description: '', source: 'news' as const, importance: 5 },
      { id: 'f', label: 'F', description: '', source: 'dart' as const, importance: 4 },
    ];
    angles.forEach((a) => useWizardStore.getState().toggleAngle(a));
    expect(useWizardStore.getState().selectedAngles).toHaveLength(5);
  });

  it('setSelectedAngles로 선택 덮어쓰기', () => {
    const angles = [
      { id: 'a', label: 'A', description: '', source: 'news' as const, importance: 9 },
      { id: 'b', label: 'B', description: '', source: 'dart' as const, importance: 8 },
    ];
    angles.forEach((a) => useWizardStore.getState().toggleAngle(a));
    expect(useWizardStore.getState().selectedAngles).toHaveLength(2);

    useWizardStore.getState().setSelectedAngles([]);
    expect(useWizardStore.getState().selectedAngles).toHaveLength(0);
  });

  it('용어 선택 토글', () => {
    const term = { id: 't1', word: 'Test', definition: 'def', analogy: 'ana' };
    useWizardStore.getState().toggleTerm(term);
    expect(useWizardStore.getState().selectedTerms).toHaveLength(1);

    useWizardStore.getState().toggleTerm(term);
    expect(useWizardStore.getState().selectedTerms).toHaveLength(0);
  });

  it('reset으로 초기 상태 복원', () => {
    useWizardStore.getState().setStockName('삼영전자');
    useWizardStore.getState().setStep(4);
    useWizardStore.getState().reset();

    const state = useWizardStore.getState();
    expect(state.currentStep).toBe(1);
    expect(state.stockName).toBe('');
    expect(state.selectedAngles).toHaveLength(0);
  });
});
