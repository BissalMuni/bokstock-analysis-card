import { getDisclosures } from '@/lib/dart';
import type { DisclosureType } from '@/lib/dart';
import { NextRequest, NextResponse } from 'next/server';

/** 공시검색 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const corpCode = params.get('corp_code');

    if (!corpCode) {
      return NextResponse.json({ error: 'corp_code 파라미터가 필요합니다' }, { status: 400 });
    }

    const data = await getDisclosures({
      corpCode,
      startDate: params.get('bgn_de') ?? undefined,
      endDate: params.get('end_de') ?? undefined,
      disclosureType: (params.get('pblntf_ty') as DisclosureType) ?? undefined,
      pageCount: params.get('page_count') ? Number(params.get('page_count')) : undefined,
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('공시검색 에러:', error);
    const message = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
