import { describe, it, expect } from 'vitest';
import { executeStep } from '../index';
import { templateRegistry } from '../registry';
import type { AnalysisAngle, AnalysisResult, Term } from '../../types/stock';

describe('프롬프트 파이프라인', () => {
  it('레지스트리에 4개 템플릿 등록', () => {
    expect(Object.keys(templateRegistry)).toHaveLength(4);
  });

  it('step1: 종목명 → 꼭지 배열 반환', async () => {
    const result = await executeStep<AnalysisAngle[]>('step1-stock-angles', {
      stockName: '삼영전자',
    });
    expect(result.templateId).toBe('step1-stock-angles');
    expect(result.data.length).toBeGreaterThanOrEqual(5);
    expect(result.data[0]).toHaveProperty('id');
    expect(result.data[0]).toHaveProperty('label');
  });

  it('step2: 선택 꼭지 → 분석 결과 반환', async () => {
    const angles: AnalysisAngle[] = [
      { id: 'on-device-ai', label: '온디바이스 AI', description: '', source: 'news', importance: 9 },
      { id: 'financials', label: '재무 건전성', description: '', source: 'dart', importance: 8 },
    ];
    const result = await executeStep<AnalysisResult[]>('step2-angle-analysis', {
      stockName: '삼영전자',
      selectedAngles: angles,
    });
    expect(result.data).toHaveLength(2);
    expect(result.data[0].sentiment).toMatch(/positive|neutral|negative/);
  });

  it('step3: 용어 추출', async () => {
    const result = await executeStep<Term[]>('step3-term-extraction', {
      analysisResults: [],
    });
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0]).toHaveProperty('analogy');
  });

  it('존재하지 않는 템플릿 → 에러', async () => {
    await expect(executeStep('nonexistent', {})).rejects.toThrow(
      '템플릿을 찾을 수 없습니다',
    );
  });
});
