import { getCompanyOverview } from '@/lib/dart';
import { NextRequest, NextResponse } from 'next/server';

/** 기업개황 조회 */
export async function GET(request: NextRequest) {
  try {
    const corpCode = request.nextUrl.searchParams.get('corp_code');

    if (!corpCode) {
      return NextResponse.json({ error: 'corp_code 파라미터가 필요합니다' }, { status: 400 });
    }

    const data = await getCompanyOverview(corpCode);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('기업개황 조회 에러:', error);
    const message = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
