-- ---------------------------------------------------------------------------
-- 오브젝트 싱크(VITE_ANALYTICS_SINK=storage)용 버킷.
-- 이벤트를 행 단위로 넣지 않고 배치 파일로 적재한다.
--   analytics-events/dt=YYYY-MM-DD/<batchId>.ndjson.gz
-- 파일 형식은 DB 컬럼과 같은 모양의 NDJSON이라 ClickHouse s3() 함수로 바로 읽힌다.
-- ---------------------------------------------------------------------------

do $$
begin
  insert into storage.buckets (id, name, public)
  values ('analytics-events', 'analytics-events', false)
  on conflict (id) do nothing;
exception
  when insufficient_privilege or undefined_table then
    raise notice '[analytics] 버킷 생성 실패. 대시보드에서 analytics-events 버킷을 private으로 만들어 주세요.';
end $$;

-- storage.objects 는 supabase_storage_admin 소유라 SQL 에디터에서 막히는 프로젝트가 있다.
-- 실패하면 대시보드 Storage > Policies 에서 아래와 같은 조건으로 직접 추가한다.
do $$
begin
  execute $p$drop policy if exists "analytics_events_objects_insert" on storage.objects$p$;
  execute $p$create policy "analytics_events_objects_insert" on storage.objects for insert to anon with check (bucket_id = 'analytics-events')$p$;
  execute $p$drop policy if exists "analytics_events_objects_update" on storage.objects$p$;
  execute $p$create policy "analytics_events_objects_update" on storage.objects for update to anon using (bucket_id = 'analytics-events') with check (bucket_id = 'analytics-events')$p$;
exception
  when insufficient_privilege then
    raise notice '[analytics] storage 정책 생성 실패. 대시보드 Storage > Policies 에서 analytics-events 버킷에 insert/update 정책을 추가해 주세요.';
end $$;

-- ---------------------------------------------------------------------------
-- 아래는 대시보드가 읽으려면 필요하다. POC 전용.
-- 경고: anon 키를 가진 누구나 전체 이벤트 로그를 내려받을 수 있게 된다.
--       운영 환경에는 적용하지 말 것.
-- ---------------------------------------------------------------------------
do $$
begin
  execute $p$drop policy if exists "analytics_events_objects_select" on storage.objects$p$;
  execute $p$create policy "analytics_events_objects_select" on storage.objects for select to anon using (bucket_id = 'analytics-events')$p$;
exception
  when insufficient_privilege then
    raise notice '[analytics] storage 조회 정책 생성 실패. 대시보드에서 select 정책을 추가해 주세요.';
end $$;
