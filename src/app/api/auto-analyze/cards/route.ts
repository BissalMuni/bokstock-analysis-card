import type { NextRequest } from 'next/server';
import { runCards } from '@/lib/analyze/steps';
import type { AnalysisItem } from '@/lib/analyze/steps';

export const maxDuration = 300;
export const preferredRegion = 'icn1';

// Step 3: 전문 용어 추출 + 카드뉴스 생성
export async function POST(request: NextRequest) {
  try {
    const { stockName, analysis, sessionId } = await request.json();
    if (!stockName || !Array.isArray(analysis) || analysis.length === 0) {
      return Response.json({ error: '종목명과 분석 결과가 필요합니다' }, { status: 400 });
    }
    const result = await runCards(stockName, analysis as AnalysisItem[], sessionId);
    return Response.json(result);
  } catch (error) {
    console.error('카드뉴스 단계 에러:', error);
    const message = error instanceof Error ? error.message : '알 수 없는 에러';
    return Response.json({ error: message }, { status: 500 });
  }
}
