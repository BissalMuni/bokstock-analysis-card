/** 프롬프트 템플릿 정의 */
export interface PromptTemplate {
  id: string;
  name: string;
  /** 시스템 프롬프트 */
  system: string;
  /** 사용자 프롬프트 (변수 치환용 함수) */
  user: (vars: Record<string, unknown>) => string;
}

/** 프롬프트 체인의 단일 스텝 */
export interface PromptChainStep {
  templateId: string;
  /** 이전 스텝 결과에서 변수를 추출하는 함수 */
  extractVars?: (prevResult: unknown) => Record<string, unknown>;
}

/** 프롬프트 체인 (연쇄 실행 파이프라인) */
export interface PromptChain {
  id: string;
  steps: PromptChainStep[];
}

/** 프롬프트 실행 결과 */
export interface PromptResult<T = unknown> {
  templateId: string;
  data: T;
}
