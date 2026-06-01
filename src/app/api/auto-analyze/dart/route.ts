import type { NextRequest } from 'next/server';
import { fetchDartStatus } from '@/lib/analyze/steps';

export const maxDuration = 30;
// DART는 한국 정부 인프라라 미국 리전에서 호출하면 느리거나 멈춘다. 서울 리전에서 실행한다.
export const preferredRegion = 'icn1';

// Step 0: DART 상태/공시 목록만 빠르게 조회 (배지 즉시 표시용)
export async function POST(request: NextRequest) {
  try {
    const { stockName } = await request.json();
    if (!stockName) {
      return Response.json({ error: '종목명이 필요합니다' }, { status: 400 });
    }
    const dart = await fetchDartStatus(stockName);
    return Response.json(dart);
  } catch (error) {
    console.error('DART 조회 단계 에러:', error);
    const message = error instanceof Error ? error.message : '알 수 없는 에러';
    return Response.json({ error: message }, { status: 500 });
  }
}
