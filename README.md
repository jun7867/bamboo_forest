# Bamboo Forest Board

익명 포스트잇으로 팀 의견을 남길 수 있는 React + TypeScript + Vite 프로젝트입니다.

현재 보드에는 다음 기능이 포함되어 있습니다.

- 카테고리별 포스트잇 작성, 수정, 삭제
- 포스트잇 드래그 이동
- 댓글 작성
- 그룹별 `자세히 보기 / 한눈에 보기` 밀도 전환
- 포스트잇 `상단 고정 / 순서 변경` 공용 정렬 메뉴
- **v1/v2 보드 분리** — 기존 데이터를 아카이브(v1)로 보존하고 v2로 새로 시작

## 보드 버전

| 경로 | 설명 |
|------|------|
| `/board` | **v2 현재 보드** — 기본 진입점, 2026-05-04 이후 데이터 |
| `/board/v1` | **1기 아카이브** — 읽기 전용, 이전 데이터 보존 |

- v2 헤더의 **"지난 대나무숲 다시보기"** 드랍다운으로 아카이브에 접근할 수 있습니다.
- 날짜 기반 분리(`src/config/boardVersion.ts`의 `V2_CUTOFF_DATE`)로 동작하므로 Supabase 마이그레이션 없이 동작합니다.
- 향후 v3 등 새 시즌을 시작할 때는 `ARCHIVE_BOARDS` 배열에 항목을 추가하고 `V2_CUTOFF_DATE`를 갱신하면 됩니다.

## Stack

- React 19
- TypeScript
- Vite
- Zustand
- styled-components
- Framer Motion
- Supabase

## Local Setup

```bash
npm install
```

Supabase 없이도 실행할 수 있습니다. 환경변수가 없으면 앱은 자동으로 데모 모드로 실행됩니다.

### Demo Mode

환경변수 설정 없이 실행:

```bash
npm run dev
```

- 앱에서 안내 배너가 보이면 정상입니다.
- 포스트잇 데이터는 메모리상 데모 데이터로 동작합니다.
- 새로고침하면 데모 초기 상태로 돌아갑니다.

### Supabase Mode

1. `.env.example`을 참고해 `.env` 파일을 만듭니다.

```bash
cp .env.example .env
```

2. `.env`에 값을 채웁니다.

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

3. Supabase에 아래 SQL을 순서대로 반영합니다.

- `supabase/migrations/202603232130_create_board_notes.sql`
- `supabase/migrations/202603241030_create_board_note_comments.sql`
- `supabase/migrations/202603241530_add_board_note_ordering.sql`
- 채팅까지 같이 확인하려면 `supabase/migrations/202603232230_create_chat_messages.sql`

4. 개발 서버를 실행합니다.

```bash
npm run dev
```

## Local Test Guide

이 프로젝트는 별도 테스트 러너 대신 `lint`, `build`, 수동 검증 중심으로 확인합니다.

### Static Checks

```bash
npm run lint
npm run build
```

### Manual Test: 기본 보드 동작

1. `/board` 페이지를 엽니다.
2. `포스트잇 추가` 또는 카테고리별 `+ 추가`로 메모를 생성합니다.
3. `자세히 보기` 상태에서 포스트잇을 드래그해 위치가 바뀌는지 확인합니다.
4. 포스트잇 클릭 후 수정/삭제 모달이 정상 동작하는지 확인합니다.

### Manual Test: v1/v2 보드 분리

1. `/board` 접속 시 v2 보드가 기본으로 열리는지 확인합니다.
2. 헤더의 **"지난 대나무숲 다시보기"** 드랍다운을 클릭해 `1기 채용혁신 대나무숲` 항목이 보이는지 확인합니다.
3. 항목 클릭 후 `/board/v1`로 이동하고, 상단에 "아카이브" 배지와 읽기 전용 안내 배너가 표시되는지 확인합니다.
4. v1 페이지에서 `포스트잇 추가` 버튼이 없고, 포스트잇 클릭/드래그가 동작하지 않는지 확인합니다.
5. v1의 "현재 대나무숲으로" 버튼을 눌러 `/board`로 돌아오는지 확인합니다.

### Manual Test: 밀도 전환

1. 각 카테고리 헤더에서 `자세히 보기`와 `한눈에 보기`를 전환합니다.
2. `자세히 보기`에서는 기존처럼 자유 배치 상태가 보이는지 확인합니다.
3. `한눈에 보기`에서는 포스트잇이 겹치지 않는 스택 형태로 보이는지 확인합니다.
4. 고정된 포스트잇이 있으면 `상단 고정` 섹션이 먼저 보이는지 확인합니다.

### Manual Test: 공용 정렬 / 고정

데스크톱:

1. 포스트잇을 우클릭합니다.
2. `상단 고정`, `맨 위로`, `한 칸 위로`, `한 칸 아래로`, `맨 아래로`가 보이는지 확인합니다.
3. 액션 실행 후 `한눈에 보기` 순서가 즉시 바뀌는지 확인합니다.

모바일:

1. 포스트잇 우측 상단 `⋯` 버튼을 탭합니다.
2. 데스크톱과 동일한 메뉴가 열리는지 확인합니다.

### Manual Test: Supabase 공유 반영

Supabase 환경에서 두 개의 브라우저 창을 열고 같은 `/board`를 띄운 뒤 확인합니다.

1. 창 A에서 포스트잇을 `상단 고정`하거나 순서를 변경합니다.
2. 창 B에서 새로고침하거나 30초 폴링 이후 순서가 반영되는지 확인합니다.
3. 창 A에서 새 포스트잇을 추가하면 해당 카테고리의 마지막 순서로 들어가는지 확인합니다.
4. 포스트잇 카테고리를 변경하면 새 카테고리 내 마지막 순서로 이동하는지 확인합니다.

## Agentation

개발 환경에서는 Agentation 툴바가 자동으로 붙습니다. 프로덕션 빌드에는 렌더되지 않습니다.

### Local Agentation Setup

1. 앱 실행

```bash
npm run dev
```

2. Agentation MCP 서버 실행

```bash
npm run agentation:mcp
```

3. 설정 진단

```bash
npm run agentation:doctor
codex mcp list
```

- 기본 엔드포인트는 `http://localhost:4747` 입니다.
- 다른 포트를 쓰려면 앱 실행 전에 `VITE_AGENTATION_ENDPOINT` 환경변수를 지정합니다.
- Codex 로컬 MCP는 `agentation-mcp server` 기준으로 연결하면 됩니다.

## Notes

- 정렬/고정 상태는 Supabase를 사용할 때 공용 상태로 저장됩니다.
- 밀도 전환 상태는 사용자 로컬 보기 상태입니다.
- 인증/관리자 권한은 아직 없어서, 현재는 누구나 공용 정렬을 바꿀 수 있습니다.
- v1/v2 분리는 `src/config/boardVersion.ts`의 `V2_CUTOFF_DATE`로 관리됩니다. DB 변경 없이 프론트엔드에서 날짜 기준으로 필터링합니다.
