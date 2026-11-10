-- ---------------------------------------------------------------------------
-- POC 전용: 브라우저(anon)에서 수집 데이터를 조회할 수 있게 연다.
-- /__analytics 대시보드와 세션 리플레이가 동작하려면 필요하다.
--
-- 경고
--   이 파일을 실행하면 anon 키를 가진 누구나 전체 이벤트 로그와 세션 녹화본을
--   내려받을 수 있다. 녹화본에는 사용자가 화면에서 본 내용이 그대로 담긴다.
--   개인 프로젝트 POC 검증 목적으로만 실행하고, 운영 환경에는 적용하지 말 것.
--   되돌리려면 파일 하단의 롤백 블록을 실행한다.
-- ---------------------------------------------------------------------------

drop policy if exists "analytics_events_select_all" on public.analytics_events;
create policy "analytics_events_select_all"
  on public.analytics_events
  for select
  using (true);

drop policy if exists "analytics_recording_chunks_select_all" on public.analytics_recording_chunks;
create policy "analytics_recording_chunks_select_all"
  on public.analytics_recording_chunks
  for select
  using (true);

do $$
begin
  execute $p$drop policy if exists "session_recordings_select_all" on storage.objects$p$;
  execute $p$create policy "session_recordings_select_all" on storage.objects for select using (bucket_id = 'session-recordings')$p$;
exception
  when insufficient_privilege then
    raise notice '[analytics] storage 조회 정책 생성 실패. 대시보드 Storage > Policies 에서 select 정책을 추가해 주세요.';
end $$;

-- 롤백
-- drop policy if exists "analytics_events_select_all" on public.analytics_events;
-- drop policy if exists "analytics_recording_chunks_select_all" on public.analytics_recording_chunks;
-- drop policy if exists "session_recordings_select_all" on storage.objects;
