# Logger (자체 구축 프로덕트 애널리틱스)

Mixpanel 대체용 자체 수집 SDK. 행동 이벤트 · 페이지뷰 · 에러 · 세션 녹화를 한 스키마로 쌓아
"어떤 기능을 쓰는가 / 어디서 이탈하는가 / 어떤 상황에서 터졌는가"를 SQL로 답하는 게 목적이다.

## 구조

```
src/lib/logger/
  types.ts                 이벤트 스키마 · 자동 이벤트 이름(ANALYTICS_EVENT)
  constants.ts             배치/세션/녹화 튜닝값, data-log-* 속성 이름
  identity.ts              distinct_id(영구), session_id(유휴 30분 / 최대 8시간)
  context.ts               device/browser/os/viewport/utm/referrer
  queue.ts                 배치 + 재시도 + localStorage 보관 + 이탈 시 keepalive 전송
  transports/              전송 계층 (여기만 갈아끼우면 ClickHouse로 이동)
  autocapture.ts           클릭 자동 수집 + rage click
  errorTracking.ts         window.onerror / unhandledrejection
  sessionRecorder.ts       rrweb 녹화 → 청크 단위 gzip 업로드
  events.ts                제품 이벤트 사전(BOARD_EVENT)
  replay.ts                녹화 조회/재조립
  react/                   LoggerProvider · useLogger · ErrorBoundary · DebugPanel
```

수집 계층(`src/lib/logger`)은 React를 모르고, React 연동은 `react/` 하위에만 있다.
나중에 사내 공용 패키지로 떼어낼 때 `react/`만 분리하면 된다.

## 설치 · 설정

1. `supabase/migrations/202608051200_create_analytics.sql` 실행
2. `.env` 설정

```
VITE_ANALYTICS_ENABLED=true
VITE_ANALYTICS_RECORDING=false          # 세션 녹화
VITE_ANALYTICS_RECORDING_SAMPLE_RATE=1  # 0~1
```

Supabase 환경변수가 없으면 자동으로 콘솔 transport로 떨어져서 로컬 개발을 막지 않는다.
개발 모드에서는 좌하단 `📈 logger` 패널로 쌓이는 이벤트를 실시간 확인할 수 있다.

## 이벤트 남기는 두 가지 방법

**선언형** — 단순 클릭은 마크업에 붙인다. `data-log-*`는 그대로 프로퍼티가 된다.

```tsx
<button data-log-event="board_search_submitted" data-log-source="header">
  검색
</button>
```

**명령형** — 결과(성공/실패)나 값이 필요한 지점.

```tsx
const { track } = useLogger()
track(BOARD_EVENT.NOTE_CREATED, { category, durationMs })
```

수집 제외는 `data-log-ignore`, 텍스트 마스킹은 `data-log-mask`, 녹화 제외는 `data-log-block`.

## 퍼널 설계 규칙

한 플로우는 **시작 → 시도 → 성공/실패 → 이탈** 네 종류를 반드시 채운다.
이탈 이벤트가 없으면 "어디서 헤매는지"는 영원히 안 보인다.

포스트잇 작성 퍼널이 레퍼런스 구현이다 (`src/components/board/useNoteComposerTracking.ts`).

| 이벤트 | 의미 |
| --- | --- |
| `board_composer_opened` | 작성 모달 열림 |
| `board_composer_category_selected` | 중간 조작 |
| `board_note_submit_attempted` | 제출 버튼 누름 (입력 상태 스냅샷 포함) |
| `board_note_submit_blocked` | 검증에서 막힘 (`reason`) |
| `board_note_created` / `board_note_create_failed` | 결과 |
| `board_composer_closed` | 성공 없이 닫음 + 그 시점 입력 상태 + 체류 시간 |

`board_composer_closed`의 `contentLength` / `hasPassword` / `durationMs`를 보면
"내용은 다 썼는데 비밀번호에서 포기" 같은 결론이 바로 나온다.

## 자동 수집 이벤트

| 이벤트 | 용도 |
| --- | --- |
| `$session_start` | 세션 시작 |
| `$page_view` / `$page_leave` | 페이지 진입 · 이탈 (`durationMs`, `reason`) |
| `$click` | 인터랙티브 요소 클릭 (태그/텍스트/경로) |
| `$rage_click` | 800ms 내 같은 요소 3회 이상 — 막힌 지점 신호 |
| `$error` | 에러 + 직전 행동 20개(breadcrumbs) |
| `$identify` | 유저 식별 |

## 분석 쿼리 예시

**기능 사용률 — "이 기능 아무도 안 쓴다" 근거**

```sql
select event, count(*) as events, count(distinct distinct_id) as users
from analytics_events
where event_time > now() - interval '30 days'
group by event
order by users asc;
```

**작성 퍼널 전환율**

```sql
with funnel as (
  select session_id,
         max((event = 'board_composer_opened')::int) as opened,
         max((event = 'board_note_submit_attempted')::int) as attempted,
         max((event = 'board_note_created')::int) as created
  from analytics_events
  where event_time > now() - interval '30 days'
  group by session_id
)
select sum(opened) as opened, sum(attempted) as attempted, sum(created) as created,
       round(100.0 * sum(created) / nullif(sum(opened), 0), 1) as conversion_pct
from funnel;
```

**어느 단계에서 포기했나**

```sql
select properties ->> 'category' as category,
       (properties ->> 'contentLength')::int > 0 as wrote_content,
       properties ->> 'hasPassword' as has_password,
       count(*)
from analytics_events
where event = 'board_composer_closed'
group by 1, 2, 3
order by count desc;
```

**이탈 페이지 · 체류 시간**

```sql
select exit_path, count(*) as sessions, avg(duration_seconds)::int as avg_seconds
from analytics_session_summary
group by exit_path
order by sessions desc;
```

**에러가 터진 상황**

```sql
select properties ->> 'message' as message,
       context ->> 'path' as path,
       properties -> 'breadcrumbs' as before_error,
       count(*)
from analytics_events
where event = '$error'
group by 1, 2, 3
order by count desc;
```

## 세션 녹화

rrweb 기반. 30초마다 풀 스냅샷 기준으로 청크를 끊어 gzip 후 Storage에 올리고,
`analytics_recording_chunks`에 메타를 남긴다. 페이지 이탈 시점의 마지막 청크는
압축 없이 keepalive 요청으로 밀어낸다.

세션은 탭과 새로고침을 넘어 유지되지만 recorder는 페이지 로드마다 새로 생긴다.
그래서 청크 번호는 세션이 아니라 **recorder 인스턴스(`recorder_id`) 안에서만** 센다.
세션 단위 순번으로 쓰면 탭 두 개가 같은 번호를 동시에 써서 unique 위반(23505)이 난다.
고유성 기준은 `storage_path`이고, 재생 시에는 `started_at` 순으로 청크를 이어 붙인 뒤
이벤트 타임스탬프로 다시 정렬한다.

- 입력값은 `maskAllInputs`로 전부 마스킹된다.
- 재생: 대시보드 `세션 · 녹화` 탭에서 세션 선택
- 페이지가 유휴 상태면 rrweb이 이벤트를 만들지 않아 청크도 생기지 않는다.
  녹화 확인은 클릭/스크롤 등 조작을 한 뒤 30초 이상 지나야 첫 청크가 올라간다.

## 대시보드

개발 서버에서 `/__analytics` (프로덕션 빌드에는 라우트가 없다).

| 탭 | 내용 |
| --- | --- |
| 개요 | 사용자/세션/이벤트/에러/rage click, 기능 사용 순위, 페이지별 이탈 |
| 사용자 | distinct_id별 목록 → 상세(자주 쓴 기능, 세션 목록, 녹화 재생 진입) |
| 세션 · 녹화 | 세션 목록 → 행동 타임라인 + rrweb 재생 |
| 이벤트 | 이벤트별 사용자수/세션수/횟수 |
| 에러 | 메시지·경로별 그룹 + 직전 행동(breadcrumbs) 펼치기 |

조회 계층은 `src/lib/logger/analytics/`에 있고, 집계는 순수 함수(`aggregate.ts`)라
화면은 결과만 그린다. 쿼리 1회로 최근 N일 이벤트를 받아 클라이언트에서 집계한다(POC 규모 기준).

### 조회 권한 (POC 전용)

대시보드가 데이터를 읽으려면 `supabase/migrations/202608051300_analytics_poc_read_access.sql`
를 실행해야 한다. **anon 키로 전체 이벤트와 녹화본이 열리므로 운영 환경에는 적용하지 말 것.**

`storage.objects` 정책은 SQL 에디터 권한으로 만들지 못하는 프로젝트가 많다.
그럴 때는 Supabase 대시보드 > Storage > `session-recordings` > Policies 에서
`bucket_id = 'session-recordings'` 조건으로 INSERT / UPDATE / SELECT 정책을 직접 추가한다.

## 적재 방식 전환 (table ↔ storage)

`VITE_ANALYTICS_SINK`으로 바꾼다. 쓰기와 읽기가 함께 따라간다.

| | `table` (기본) | `storage` |
| --- | --- | --- |
| 쓰기 | 이벤트 1건 = DB row 1개 | 배치 1개 = 오브젝트 1개 |
| 경로 | `analytics_events` | `analytics-events/dt=YYYY-MM-DD/<batchId>.ndjson.gz` |
| flush | 5초 / 20건 | 60초 / 200건 |
| 조회 | SQL 필터 | 날짜 파티션 목록 → 전량 다운로드 → 브라우저 집계 |
| 적합 | 소량, 즉시 조회 | row 증가 회피, ClickHouse 이관 |

집계(`analytics/aggregate.ts`)는 순수 함수라 양쪽 모두 그대로 쓴다.

**배치 id 멱등성**: 배치를 만들 때 id를 한 번 정하고 재시도·재방문 전송까지 유지한다.
파일명이 배치 id라서 재시도가 새 파일을 만들지 않고 같은 파일을 덮어쓴다.
이게 없으면 실패 재시도마다 이벤트가 중복 집계된다.

**한계**: 서버 필터가 없어 조회 범위는 파티션 경로로만 제한된다.
브라우저에서 집계하므로 하루 10만 건 근처가 실용 상한이고, 그 이상은 ClickHouse가 필요하다.
자정을 걸친 배치를 놓치지 않으려고 조회 시 하루를 더 훑은 뒤 이벤트 시각으로 필터한다.

버킷과 정책은 `202608051500_create_analytics_events_bucket.sql`.

## ClickHouse로 옮길 때

바꿔야 하는 파일은 `src/lib/logger/transports/` 하나다.

```ts
export interface AnalyticsTransport {
  name: string
  send(events: AnalyticsEvent[]): Promise<void>
  sendOnExit?(events: AnalyticsEvent[]): void
}
```

`createClickHouseTransport()`를 추가해 `src/config/analytics.ts`에서 갈아끼우면 되고,
이벤트 스키마(`AnalyticsEvent`)가 그대로 ClickHouse 테이블 컬럼과 1:1이다.
브라우저에서 직접 쏘지 말고 수집 엔드포인트(예: `/api/collect`)를 두는 걸 권장한다.

`storage` 싱크를 쓰고 있다면 transport를 바꿀 필요조차 없다.
NDJSON이 DB 컬럼과 같은 모양이라 오브젝트 스토리지를 그대로 소스로 삼으면 된다.

```sql
insert into analytics_events
select * from s3('https://.../analytics-events/dt=*/*.ndjson.gz', 'JSONEachRow');
```

## 알아둘 점

- 현재 POC는 브라우저에서 anon 키로 직접 insert한다. 운영에서는 수집 엔드포인트를 앞에 두고
  rate limit과 봇 필터를 걸어야 한다.
- 개발 모드 StrictMode 때문에 모달 계열 컴포넌트의 opened/closed가 한 번 더 찍힌다.
  프로덕션 빌드에서는 발생하지 않는다.
- `distinct_id`는 localStorage 기반이라 기기/브라우저 단위다. 로그인 붙으면 `logger.identify()`로 이어붙인다.
