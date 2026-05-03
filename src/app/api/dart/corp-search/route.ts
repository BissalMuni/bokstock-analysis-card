import { searchCorp } from '@/lib/dart';
import { NextRequest, NextResponse } from 'next/server';

/** 종목명으로 DART 고유번호 검색 */
export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: '검색어를 입력하세요' }, { status: 400 });
    }

    const results = await searchCorp(query.trim());
    return NextResponse.json({ data: results });
  } catch (error) {
    console.error('종목 검색 에러:', error);
    const message = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
