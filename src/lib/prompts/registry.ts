import type { PromptTemplate, PromptChain } from './types';
import { step1StockAngles } from './templates/step1-stock-angles';
import { step2AngleAnalysis } from './templates/step2-angle-analysis';
import { step3TermExtraction } from './templates/step3-term-extraction';
import { step4FormatOutput } from './templates/step4-format-output';

/** 모든 프롬프트 템플릿 레지스트리 */
export const templateRegistry: Record<string, PromptTemplate> = {
  'step1-stock-angles': step1StockAngles,
  'step2-angle-analysis': step2AngleAnalysis,
  'step3-term-extraction': step3TermExtraction,
  'step4-format-output': step4FormatOutput,
};

/** 전체 분석 파이프라인 체인 */
export const analysisChain: PromptChain = {
  id: 'stock-analysis',
  steps: [
    {
      templateId: 'step1-stock-angles',
    },
    {
      templateId: 'step2-angle-analysis',
      extractVars: (prev) => ({ selectedAngles: prev }),
    },
    {
      templateId: 'step3-term-extraction',
      extractVars: (prev) => ({ analysisResults: prev }),
    },
    {
      templateId: 'step4-format-output',
      extractVars: (prev) => ({ selectedTerms: prev }),
    },
  ],
};
