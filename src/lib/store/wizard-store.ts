import { create } from 'zustand';
import type { WizardStep, OutputFormat } from '../types/wizard';
import type { AnalysisAngle, AnalysisResult, Term, CardSlide } from '../types/stock';
import type { DartEnrichedData } from '../dart/types';

interface WizardState {
  // 현재 단계
  currentStep: WizardStep;

  // DB 세션 ID (Supabase)
  sessionId: string | null;

  // Step 1: 종목 입력
  stockName: string;

  // DART 전자공시 데이터
  dartData: DartEnrichedData | null;

  // Step 2: 꼭지 선택
  availableAngles: AnalysisAngle[];
  selectedAngles: AnalysisAngle[];

  // Step 3: 분석 결과
  analysisResults: AnalysisResult[];

  // Step 4: 용어 선택
  availableTerms: Term[];
  selectedTerms: Term[];

  // Step 5: 형식 선택
  outputFormat: OutputFormat;

  // Step 6: 최종 출력
  finalOutput: CardSlide[] | string | null;

  // 로딩 상태
  isLoading: boolean;

  // 액션
  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setSessionId: (id: string | null) => void;
  setStockName: (name: string) => void;
  setDartData: (data: DartEnrichedData | null) => void;
  setAvailableAngles: (angles: AnalysisAngle[]) => void;
  setSelectedAngles: (angles: AnalysisAngle[]) => void;
  toggleAngle: (angle: AnalysisAngle) => void;
  setAnalysisResults: (results: AnalysisResult[]) => void;
  setAvailableTerms: (terms: Term[]) => void;
  toggleTerm: (term: Term) => void;
  setOutputFormat: (format: OutputFormat) => void;
  setFinalOutput: (output: CardSlide[] | string) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 1 as WizardStep,
  sessionId: null as string | null,
  stockName: '',
  dartData: null as DartEnrichedData | null,
  availableAngles: [] as AnalysisAngle[],
  selectedAngles: [] as AnalysisAngle[],
  analysisResults: [] as AnalysisResult[],
  availableTerms: [] as Term[],
  selectedTerms: [] as Term[],
  outputFormat: 'card-news' as OutputFormat,
  finalOutput: null as CardSlide[] | string | null,
  isLoading: false,
};

export const useWizardStore = create<WizardState>((set) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),

  nextStep: () =>
    set((state) => ({
      currentStep: Math.min(state.currentStep + 1, 6) as WizardStep,
    })),

  prevStep: () =>
    set((state) => ({
      currentStep: Math.max(state.currentStep - 1, 1) as WizardStep,
    })),

  setSessionId: (id) => set({ sessionId: id }),

  setStockName: (name) => set({ stockName: name }),

  setDartData: (data) => set({ dartData: data }),

  setAvailableAngles: (angles) => set({ availableAngles: angles }),

  setSelectedAngles: (angles) => set({ selectedAngles: angles }),

  toggleAngle: (angle) =>
    set((state) => {
      const exists = state.selectedAngles.find((a) => a.id === angle.id);
      if (exists) {
        return { selectedAngles: state.selectedAngles.filter((a) => a.id !== angle.id) };
      }
      // 최대 5개 제한
      if (state.selectedAngles.length >= 5) return state;
      return { selectedAngles: [...state.selectedAngles, angle] };
    }),

  setAnalysisResults: (results) => set({ analysisResults: results }),

  setAvailableTerms: (terms) => set({ availableTerms: terms }),

  toggleTerm: (term) =>
    set((state) => {
      const exists = state.selectedTerms.find((t) => t.id === term.id);
      if (exists) {
        return { selectedTerms: state.selectedTerms.filter((t) => t.id !== term.id) };
      }
      return { selectedTerms: [...state.selectedTerms, term] };
    }),

  setOutputFormat: (format) => set({ outputFormat: format }),

  setFinalOutput: (output) => set({ finalOutput: output }),

  setLoading: (loading) => set({ isLoading: loading }),

  reset: () => set(initialState),
}));
