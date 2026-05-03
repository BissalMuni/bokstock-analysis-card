import { getSupabase } from './client';
import type { AnalysisAngle, AnalysisResult, Term, CardSlide } from '../types/stock';

// ─── 세션 ───────────────────────────────────────────────

export async function createSession(stockName: string, mode: 'wizard' | 'auto' = 'wizard') {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('analysis_sessions')
    .insert({ stock_name: stockName, mode })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function completeSession(sessionId: string) {
  const sb = getSupabase();
  await sb
    .from('analysis_sessions')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', sessionId);
}

export async function failSession(sessionId: string) {
  const sb = getSupabase();
  await sb
    .from('analysis_sessions')
    .update({ status: 'failed' })
    .eq('id', sessionId);
}

// ─── 멀티패스 원본 저장 ─────────────────────────────────

export async function saveMultipassRaw(
  sessionId: string,
  step: string,
  passIndex: number,
  rawResponse: unknown,
) {
  const sb = getSupabase();
  const { error } = await sb.from('multipass_raw').insert({
    session_id: sessionId,
    step,
    pass_index: passIndex,
    raw_response: rawResponse,
  });
  if (error) throw error;
}

// ─── 분석 각도 ──────────────────────────────────────────

export async function saveAngles(sessionId: string, angles: AnalysisAngle[], selectedIds: string[] = []) {
  const sb = getSupabase();
  const rows = angles.map((a) => ({
    session_id: sessionId,
    angle_id: a.id,
    label: a.label,
    description: a.description,
    source: a.source,
    importance: a.importance,
    selected: selectedIds.includes(a.id),
  }));

  const { error } = await sb.from('analysis_angles').insert(rows);
  if (error) throw error;
}

// ─── 분석 결과 ──────────────────────────────────────────

export async function saveAnalysisResults(
  sessionId: string,
  results: (AnalysisResult & { confidence?: number; sources?: string[] })[],
) {
  const sb = getSupabase();
  const rows = results.map((r) => ({
    session_id: sessionId,
    angle_id: r.angleId,
    title: r.title,
    summary: r.summary,
    key_points: r.keyPoints,
    sentiment: r.sentiment,
    confidence: r.confidence ?? null,
    sources: r.sources ?? null,
  }));

  const { error } = await sb.from('analysis_results').insert(rows);
  if (error) throw error;
}

// ─── 용어 ───────────────────────────────────────────────

export async function saveTerms(sessionId: string, terms: Term[], selectedIds: string[] = []) {
  const sb = getSupabase();
  const rows = terms.map((t) => ({
    session_id: sessionId,
    term_id: t.id,
    word: t.word,
    definition: t.definition,
    analogy: t.analogy,
    selected: selectedIds.includes(t.id),
  }));

  const { error } = await sb.from('terms').insert(rows);
  if (error) throw error;
}

// ─── 최종 출력 ──────────────────────────────────────────

export async function saveFinalOutput(
  sessionId: string,
  format: string,
  outputData: CardSlide[] | string | unknown,
) {
  const sb = getSupabase();
  const { error } = await sb.from('final_outputs').insert({
    session_id: sessionId,
    output_format: format,
    output_data: outputData,
  });
  if (error) throw error;
}

// ─── DART 캐시 ──────────────────────────────────────────

export async function getDartCache(stockName: string) {
  const sb = getSupabase();
  const { data } = await sb
    .from('dart_cache')
    .select('*')
    .eq('stock_name', stockName)
    .gte('fetched_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function saveDartCache(
  stockName: string,
  corpCode: string | null,
  companyData: unknown,
  disclosures: unknown,
) {
  const sb = getSupabase();
  await sb.from('dart_cache').insert({
    stock_name: stockName,
    corp_code: corpCode,
    company_data: companyData,
    disclosures: disclosures,
  });
}

// ─── 조회 ───────────────────────────────────────────────

export async function getSession(sessionId: string) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('analysis_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) throw error;
  return data;
}

/** 종목별 최근 세션 목록 조회 */
export async function getRecentSessions(stockName?: string, limit = 10) {
  const sb = getSupabase();
  let query = sb
    .from('analysis_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (stockName) {
    query = query.eq('stock_name', stockName);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** 세션의 전체 분석 데이터 조회 */
export async function getFullSession(sessionId: string) {
  const sb = getSupabase();
  const [session, angles, results, termsData, outputs] = await Promise.all([
    sb.from('analysis_sessions').select('*').eq('id', sessionId).single(),
    sb.from('analysis_angles').select('*').eq('session_id', sessionId).order('importance', { ascending: false }),
    sb.from('analysis_results').select('*').eq('session_id', sessionId),
    sb.from('terms').select('*').eq('session_id', sessionId),
    sb.from('final_outputs').select('*').eq('session_id', sessionId),
  ]);

  return {
    session: session.data,
    angles: angles.data ?? [],
    results: results.data ?? [],
    terms: termsData.data ?? [],
    outputs: outputs.data ?? [],
  };
}
