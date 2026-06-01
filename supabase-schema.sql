-- ============================================================
-- bokstock-analysis-card Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에서 실행
-- ============================================================

-- 1. 분석 세션 (위자드 1회 실행 = 1 세션)
create table if not exists analysis_sessions (
  id uuid primary key default gen_random_uuid(),
  stock_name text not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  mode text not null default 'wizard' check (mode in ('wizard', 'auto')),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'failed'))
);

-- 2. 분석 각도 (Step 1 결과)
create table if not exists analysis_angles (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references analysis_sessions(id) on delete cascade,
  angle_id text not null,
  label text not null,
  description text not null,
  source text not null check (source in ('news', 'dart')),
  importance int not null default 5,
  selected boolean not null default false,
  created_at timestamptz not null default now()
);

-- 3. 멀티패스 원본 응답 (3~5회 개별 결과 보관)
create table if not exists multipass_raw (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references analysis_sessions(id) on delete cascade,
  step text not null,          -- 'angles' | 'analysis' | 'terms' | 'output'
  pass_index int not null,     -- 0-based (0,1,2,3,4)
  raw_response jsonb not null, -- Claude 원본 JSON 응답
  created_at timestamptz not null default now()
);

-- 4. 분석 결과 (Step 3 — 종합된 최종 결과)
create table if not exists analysis_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references analysis_sessions(id) on delete cascade,
  angle_id text not null,
  title text not null,
  summary text not null,
  key_points jsonb not null default '[]',
  sentiment text not null check (sentiment in ('positive', 'neutral', 'negative')),
  confidence int,  -- 멀티패스 중복 횟수 기반 신뢰도 (1~5)
  sources jsonb,   -- 웹검색 출처 URL 목록
  created_at timestamptz not null default now()
);

-- 5. 용어 해설 (Step 4)
create table if not exists terms (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references analysis_sessions(id) on delete cascade,
  term_id text not null,
  word text not null,
  definition text not null,
  analogy text not null,
  selected boolean not null default false,
  created_at timestamptz not null default now()
);

-- 6. 최종 출력 (Step 6)
create table if not exists final_outputs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references analysis_sessions(id) on delete cascade,
  output_format text not null check (output_format in ('card-news', 'summary-table', 'sns-caption')),
  output_data jsonb not null,
  created_at timestamptz not null default now()
);

-- 7. DART 캐시 (동일 종목 반복 조회 방지)
create table if not exists dart_cache (
  id uuid primary key default gen_random_uuid(),
  stock_name text not null,
  corp_code text,
  company_data jsonb,
  disclosures jsonb,
  fetched_at timestamptz not null default now()
);

-- 인덱스
create index if not exists idx_sessions_stock on analysis_sessions(stock_name);
create index if not exists idx_sessions_created on analysis_sessions(created_at desc);
create index if not exists idx_angles_session on analysis_angles(session_id);
create index if not exists idx_results_session on analysis_results(session_id);
create index if not exists idx_multipass_session on multipass_raw(session_id, step);
create index if not exists idx_dart_cache_stock on dart_cache(stock_name);

-- RLS (Row Level Security) - 공개 접근 허용 (개인 프로젝트)
alter table analysis_sessions enable row level security;
alter table analysis_angles enable row level security;
alter table multipass_raw enable row level security;
alter table analysis_results enable row level security;
alter table terms enable row level security;
alter table final_outputs enable row level security;
alter table dart_cache enable row level security;

-- anon key로 전체 CRUD 허용
create policy "allow_all" on analysis_sessions for all using (true) with check (true);
create policy "allow_all" on analysis_angles for all using (true) with check (true);
create policy "allow_all" on multipass_raw for all using (true) with check (true);
create policy "allow_all" on analysis_results for all using (true) with check (true);
create policy "allow_all" on terms for all using (true) with check (true);
create policy "allow_all" on final_outputs for all using (true) with check (true);
create policy "allow_all" on dart_cache for all using (true) with check (true);

-- 테이블 권한 부여 (RLS 정책과 별개로 GRANT가 없으면 42501 permission denied 발생)
-- SQL Editor에서 create table만으로는 anon/service_role에 권한이 자동 부여되지 않을 수 있다.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

-- 이후 추가되는 테이블/시퀀스에도 자동 부여
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
