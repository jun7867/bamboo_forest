create extension if not exists pgcrypto;

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event text not null check (char_length(btrim(event)) between 1 and 120),
  distinct_id text not null check (char_length(distinct_id) between 1 and 120),
  session_id text not null check (char_length(session_id) between 1 and 120),
  user_id text,
  event_time timestamptz not null,
  ingested_at timestamptz not null default timezone('utc', now()),
  properties jsonb not null default '{}'::jsonb,
  context jsonb not null default '{}'::jsonb,
  app_version text,
  sdk_version text
);

create index if not exists analytics_events_event_time_idx
  on public.analytics_events (event, event_time desc);

create index if not exists analytics_events_session_idx
  on public.analytics_events (session_id, event_time);

create index if not exists analytics_events_distinct_id_idx
  on public.analytics_events (distinct_id, event_time desc);

create index if not exists analytics_events_path_idx
  on public.analytics_events ((context ->> 'path'), event_time desc);

create index if not exists analytics_events_properties_idx
  on public.analytics_events using gin (properties);

create table if not exists public.analytics_recording_chunks (
  id uuid primary key default gen_random_uuid(),
  session_id text not null check (char_length(session_id) between 1 and 120),
  distinct_id text not null check (char_length(distinct_id) between 1 and 120),
  -- 한 세션에 탭/새로고침마다 recorder가 새로 붙는다. 청크 번호는 recorder 안에서만 유효하다
  recorder_id text,
  chunk_index integer not null check (chunk_index >= 0),
  storage_path text not null,
  encoding text not null default 'gzip' check (encoding in ('gzip', 'none')),
  event_count integer not null default 0,
  byte_size integer,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists analytics_recording_chunks_storage_path_key
  on public.analytics_recording_chunks (storage_path);

create index if not exists analytics_recording_chunks_session_started_idx
  on public.analytics_recording_chunks (session_id, started_at);

alter table public.analytics_events enable row level security;
alter table public.analytics_recording_chunks enable row level security;

-- 클라이언트는 쓰기만 한다. 조회는 service role(대시보드/SQL 에디터)로만 수행한다.
drop policy if exists "analytics_events_insert_all" on public.analytics_events;
create policy "analytics_events_insert_all"
  on public.analytics_events
  for insert
  with check (true);

drop policy if exists "analytics_recording_chunks_insert_all" on public.analytics_recording_chunks;
create policy "analytics_recording_chunks_insert_all"
  on public.analytics_recording_chunks
  for insert
  with check (true);

-- storage 스키마는 supabase_storage_admin 소유라 프로젝트에 따라 권한 오류가 난다.
-- 여기서 실패해도 뒤쪽 뷰 생성까지 롤백되지 않도록 예외를 흡수하고 안내만 남긴다.
do $$
begin
  insert into storage.buckets (id, name, public)
  values ('session-recordings', 'session-recordings', false)
  on conflict (id) do nothing;
exception
  when insufficient_privilege or undefined_table then
    raise notice '[analytics] storage 버킷 생성 실패. 대시보드에서 session-recordings 버킷을 private으로 만들어 주세요.';
end $$;

do $$
begin
  execute $p$drop policy if exists "session_recordings_insert_all" on storage.objects$p$;
  execute $p$create policy "session_recordings_insert_all" on storage.objects for insert with check (bucket_id = 'session-recordings')$p$;
  execute $p$drop policy if exists "session_recordings_update_all" on storage.objects$p$;
  execute $p$create policy "session_recordings_update_all" on storage.objects for update using (bucket_id = 'session-recordings') with check (bucket_id = 'session-recordings')$p$;
exception
  when insufficient_privilege then
    raise notice '[analytics] storage 정책 생성 실패. 대시보드 Storage > Policies 에서 session-recordings 버킷에 insert/update 정책을 추가해 주세요.';
end $$;

-- security_invoker: 뷰가 소유자 권한으로 RLS를 우회하지 않도록 강제한다
create or replace view public.analytics_session_summary
with (security_invoker = true) as
select
  session_id,
  min(distinct_id) as distinct_id,
  max(user_id) as user_id,
  min(event_time) as started_at,
  max(event_time) as ended_at,
  extract(epoch from (max(event_time) - min(event_time)))::int as duration_seconds,
  count(*) as event_count,
  count(*) filter (where event = '$page_view') as page_view_count,
  count(*) filter (where event = '$error') as error_count,
  count(*) filter (where event = '$rage_click') as rage_click_count,
  (array_agg(context ->> 'path' order by event_time asc))[1] as entry_path,
  (array_agg(context ->> 'path' order by event_time desc))[1] as exit_path,
  (array_agg(context ->> 'deviceType' order by event_time asc))[1] as device_type
from public.analytics_events
group by session_id;

create or replace view public.analytics_event_daily
with (security_invoker = true) as
select
  date_trunc('day', event_time) as day,
  event,
  context ->> 'path' as path,
  count(*) as event_count,
  count(distinct distinct_id) as user_count,
  count(distinct session_id) as session_count
from public.analytics_events
group by 1, 2, 3;

-- 대시보드/리플레이로 조회하려면 202608051300_analytics_poc_read_access.sql 를 따로 실행한다.
