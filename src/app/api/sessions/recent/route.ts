import { getRecentSessions, hasSupabase } from '@/lib/supabase';

// 캐시 없이 항상 최신 세션을 반환 (분석 완료 직후 사이드바 갱신용)
export const dynamic = 'force-dynamic';

interface SessionRow {
  id: string;
  stock_name: string;
  status: string;
  created_at: string;
  completed_at?: string | null;
}

// 완료된 분석 세션 목록 (사이드바 "최근 분석"용)
export async function GET() {
  if (!hasSupabase()) {
    return Response.json({ sessions: [] });
  }
  try {
    const rows = (await getRecentSessions(undefined, 20)) as SessionRow[];
    const sessions = rows
      .filter((r) => r.status === 'completed')
      .map((r) => ({
        id: r.id,
        stockName: r.stock_name,
        date: (r.completed_at ?? r.created_at)?.slice(0, 10) ?? '',
      }));
    return Response.json({ sessions });
  } catch (error) {
    console.error('최근 세션 조회 에러:', error);
    return Response.json({ sessions: [] });
  }
}
