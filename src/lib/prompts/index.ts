import type { PromptResult } from './types';
import { templateRegistry } from './registry';
import { mockResolver } from '../mock/resolver';

/** templateId → API step 이름 매핑 */
const TEMPLATE_TO_API_STEP: Record<string, string> = {
  'step1-stock-angles': 'angles',
  'step2-angle-analysis': 'analysis',
  'step3-term-extraction': 'terms',
  'step4-format-output': 'output',
};

/**
 * Claude API를 통해 프롬프트 실행
 * DART 데이터는 서버에서 자동 조회하여 프롬프트에 포함됨
 * 멀티패스 분석 + 웹검색은 서버에서 자동 처리
 */
async function callClaudeAPI<T>(
  templateId: string,
  vars: Record<string, unknown>,
): Promise<{ data: T; dartData?: unknown; sessionId?: string }> {
  const step = TEMPLATE_TO_API_STEP[templateId];
  if (!step) {
    throw new Error(`API 매핑을 찾을 수 없습니다: ${templateId}`);
  }

  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step, ...vars }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'API 호출 실패');
  }

  const json = await res.json();
  return { data: json.data as T, dartData: json.dartData, sessionId: json.sessionId };
}

/**
 * 프롬프트 실행기
 * USE_MOCK=true → mock 데이터, false → Claude API + DART + 웹검색 + 멀티패스
 */
export async function executeStep<T>(
  templateId: string,
  vars: Record<string, unknown>,
): Promise<PromptResult<T> & { dartData?: unknown; sessionId?: string }> {
  const template = templateRegistry[templateId];
  if (!template) {
    throw new Error(`템플릿을 찾을 수 없습니다: ${templateId}`);
  }

  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

  if (useMock) {
    const data = await mockResolver<T>(templateId, vars);
    return { templateId, data };
  }

  const result = await callClaudeAPI<T>(templateId, vars);
  return {
    templateId,
    data: result.data,
    dartData: result.dartData,
    sessionId: result.sessionId,
  };
}
