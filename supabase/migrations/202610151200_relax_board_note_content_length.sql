-- 작성 화면은 1000자까지 받는데 최초 테이블 제약은 120자라 긴 글 저장이 실패한다.
-- 이미 대시보드에서 제약을 바꿨더라도 다시 실행해도 안전하도록 작성했다.
alter table public.board_notes
  drop constraint if exists board_notes_content_check;

alter table public.board_notes
  add constraint board_notes_content_check
  check (char_length(btrim(content)) between 1 and 1000);
