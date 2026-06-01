import { notFound } from 'next/navigation';
import { getFullSession, hasSupabase } from '@/lib/supabase';
import { AutoResultView } from '@/components/auto/AutoResultView';

// 세션은 항상 최신 상태로 조회 (정적 캐시 X)
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface AngleRow { angle_id: string; label: string; description: string; source: string; importance: number; selected: boolean }
interface ResultRow { angle_id: string; title: string; summary: string; key_points: string[]; sentiment: string; confidence?: number; sources?: unknown }
interface TermRow { term_id: string; word: string; definition: string; analogy: string }
interface OutputRow { output_format: string; output_data: unknown }

export default async function SessionPage({ params }: PageProps) {
  const { id } = await params;
  if (!hasSupabase()) notFound();

  let full;
  try {
    full = await getFullSession(id);
  } catch {
    notFound();
  }

  const session = full.session as { stock_name?: string } | null;
  if (!session) notFound();

  // Supabase row → AutoResultView가 기대하는 형태로 복원
  const angles = (full.angles as AngleRow[]).map((a) => ({
    id: a.angle_id,
    label: a.label,
    description: a.description,
    source: a.source,
    importance: a.importance,
  }));
  const selectedAngles = (full.angles as AngleRow[])
    .filter((a) => a.selected)
    .map((a) => ({ id: a.angle_id, label: a.label, description: a.description, source: a.source, importance: a.importance }));
  const analysis = (full.results as ResultRow[]).map((r) => ({
    angleId: r.angle_id,
    title: r.title,
    summary: r.summary,
    keyPoints: r.key_points ?? [],
    sentiment: r.sentiment,
    confidence: r.confidence,
    sources: (r.sources ?? undefined) as never,
  }));
  const terms = (full.terms as TermRow[]).map((t) => ({
    id: t.term_id,
    word: t.word,
    definition: t.definition,
    analogy: t.analogy,
  }));
  const outputs = full.outputs as OutputRow[];
  const output = outputs.find((o) => o.output_format === 'card-news')?.output_data ?? outputs[0]?.output_data ?? null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <AutoResultView
        result={{
          sessionId: id,
          stockName: session.stock_name ?? '',
          angles,
          selectedAngles,
          analysis,
          terms,
          output,
        }}
      />
    </div>
  );
}
