import type { NextRequest } from 'next/server';
import { runAngles } from '@/lib/analyze/steps';

export const maxDuration = 300;
// DART는 한국 정부 인프라라 미국 리전에서 호출하면 느리거나 멈춘다. 서울 리전에서 실행한다.
export const preferredRegion = 'icn1';

// Step 1: DART 조회 + 멀티패스 각도 생성 + 선정
export async function POST(request: NextRequest) {
  try {
    const { stockName, passCount = 3 } = await request.json();
    if (!stockName) {
      return Response.json({ error: '종목명이 필요합니다' }, { status: 400 });
    }
    const result = await runAngles(stockName, passCount);
    return Response.json(result);
  } catch (error) {
    console.error('각도 생성 단계 에러:', error);
    const message = error instanceof Error ? error.message : '알 수 없는 에러';
    return Response.json({ error: message }, { status: 500 });
  }
}
