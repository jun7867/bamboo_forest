-- ---------------------------------------------------------------------------
-- chunk_index를 세션 단위 순번으로 쓰면 탭/새로고침마다 새로 생기는 recorder가
-- 같은 번호를 동시에 써서 23505(unique 위반)가 난다.
-- recorder_id로 네임스페이스를 나누고, 고유성 기준을 storage_path로 옮긴다.
-- ---------------------------------------------------------------------------

alter table public.analytics_recording_chunks
  add column if not exists recorder_id text;

alter table public.analytics_recording_chunks
  drop constraint if exists analytics_recording_chunks_session_id_chunk_index_key;

-- 예전 경로 규칙(session/0000.json.gz)으로 중복이 남아 있으면 최신 1건만 남긴다
delete from public.analytics_recording_chunks a
using public.analytics_recording_chunks b
where a.storage_path = b.storage_path
  and a.ctid > b.ctid;

create unique index if not exists analytics_recording_chunks_storage_path_key
  on public.analytics_recording_chunks (storage_path);

create index if not exists analytics_recording_chunks_session_started_idx
  on public.analytics_recording_chunks (session_id, started_at);

drop index if exists analytics_recording_chunks_session_idx;
