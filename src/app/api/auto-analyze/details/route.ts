import type { NextRequest } from 'next/server';
import { runDetails } from '@/lib/analyze/steps';
import type { Angle } from '@/lib/analyze/steps';

export const maxDuration = 300;
// DART는 한국 정부 인프라라 미국 리전에서 호출하면 느리거나 멈춘다. 서울 리전에서 실행한다.
export const preferredRegion = 'icn1';

// Step 2: 선정된 각도에 대한 멀티패스 상세분석
export async function POST(request: NextRequest) {
  try {
    const { stockName, selectedAngles, passCount = 3, sessionId } = await request.json();
    if (!stockName || !Array.isArray(selectedAngles) || selectedAngles.length === 0) {
      return Response.json({ error: '종목명과 선정된 각도가 필요합니다' }, { status: 400 });
    }
    const result = await runDetails(stockName, selectedAngles as Angle[], passCount, sessionId);
    return Response.json(result);
  } catch (error) {
    console.error('상세 분석 단계 에러:', error);
    const message = error instanceof Error ? error.message : '알 수 없는 에러';
    return Response.json({ error: message }, { status: 500 });
  }
}
