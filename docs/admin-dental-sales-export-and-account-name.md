# 어드민 치과 영업 엑셀 다운로드·본인 이름 변경

2026-10-06 추가 기능. 운영 적용 순서는 DB → API → Admin이다.

## 치과 영업 목록 다운로드

검색을 완료한 지역(시/구), 치과명, 담당 영업자, 상태, 상세 상태의 전체 결과를 XLSX로 내려받는다. 입력만 변경한 미검색 조건과 페이지 번호는 제외한다. 목록 상단에 전체 건수, 안내 문구와 `엑셀 다운로드`를 표시한다. 목록 로딩/실패/빈 결과/다운로드 진행 중에는 비활성화한다. 새 검색, 계정 변경, 상세 화면 이동/화면 이탈 시 요청을 취소하고 늦은 응답은 저장하지 않는다. 실패해도 목록과 필터를 보존한다.

`GET /api/v1/admin/dental-sales/export`는 기존 목록과 같은 여섯 필터와 활성 어드민 인증을 사용한다. 비로그인/만료 세션은 401, 일반 사용자는 403, 잠긴 어드민은 423이다. 기존 목록 RPC의 100행 제한/응답/정렬은 유지한다. 공통 필터 계산은 비공개 `app_private.admin_dental_sales_filtered_rows`, 전체 내보내기는 서비스 전용 `export_admin_dental_sales`의 단일 JSON 배열로 처리하여 PostgREST 행 제한을 피한다. 기존 데이터는 변경하지 않는다.

ExcelJS 4.4.0은 API 서버에서만 실행한다. 시트는 `치과 영업 목록` 하나, 열은 `시 → 구 → 동 → 치과명 → 주소 → 대표 전화번호 → 담당 영업자 → 초대코드 → 상태 → 상세 상태`이다. 상세 화면과 같은 HIRA 주소를 사용하고 메모/파일/상세보기 동작은 제외한다. 모든 셀은 문자열/텍스트 서식으로 기록해 앞자리와 수식 형태의 문자열을 보존한다. 한국어 상태, 미지정 담당자 `미지정`, 없는 상세 상태 `—`, 기타 누락은 빈 셀이다. 헤더 고정/자동 필터/열 너비/주소 줄바꿈을 적용한다.

파일명은 KST `치과영업목록_서울특별시_중랑구_20261006_1425.xlsx`; 지역 없음은 `전체`다. XLSX MIME, UTF-8 Content-Disposition, no-store 및 해당 응답의 Expose-Headers를 설정한다. 오류는 기존 JSON 형식이다. 감사 로그는 요청자/검색 조건/생성 건수만 보관한다. 인쇄는 다운로드한 Excel 파일에서 한다.

## 본인 계정 이름 변경

설정 → 계정 → 이름 변경에서 1~100자 이름을 저장/취소한다. 실패 시 입력을 유지하고 한국어 오류를 표시한다. 저장 중 중복 요청을 막고 화면 이탈/세션 변경 시 늦은 화면 갱신을 막는다. 성공 시 현재 계정 이름을 즉시 갱신한다.

`PATCH /api/v1/admin/account/profile`의 body는 `{ "fullName": "김영업" }`이다. 대상 ID는 인증 세션에서만 얻으며 다른 계정의 ID는 받지 않는다. 기존 사용자에게 이름을 자동 추정/일괄 교체하지 않는다. 서비스 전용 `update_admin_own_display_name`은 users.full_name과 admin_profiles.display_name을 감사 이벤트 `admin_account.name_updated`와 함께 한 트랜잭션으로 저장한다. 이메일/권한/계정 유형을 보존하며 계정 목록과 현재 영업 담당자 표시도 새 이름을 사용한다. 과거 방문 당시 이름 스냅샷은 유지한다.

## 반영 및 검증

1. `20261006100000_admin_dental_sales_export.sql`, `20261006101000_admin_own_display_name.sql`을 순서대로 적용한다.
2. API를 배포하고 인증/권한/DB 연결을 확인한다.
3. Admin을 배포하고 운영 주소와 커밋을 확인한다.

자동 검증: 양쪽 npm test/lint/build, API 전체 pgTAP, public/app_private DB lint와 advisors, runtime audit. API 전체 테스트 명령에 새 기능 테스트를 포함한다. 서비스 및 DB 테스트는 필터/정렬 일치, 100/1,000행 초과, 서비스 전용 권한, 문자열/서식 roundtrip, 30,000행(~1.2MB) 생성, 이름 검증/권한/역할 보존/감사 저장을 검사한다.

실제 로컬 브라우저는 실제 Admin 컴포넌트와 로컬 API/Auth/DB로 1,205행 파일 다운로드, 미검색 조건 제외, 중복 요청 방지, 새 검색/계정 변경/화면 이탈 취소, 빈 결과, 실패/재시도와 좁은 화면을 검사했다. 이름 저장/취소/실패 초안 유지/재시도 및 API 401/403/423, CORS/파일 헤더를 확인했다. 합성 계정/치과만 사용했다. 화면 캡처는 API의 로컬 artifacts/dental-sales-export에 있다. Microsoft Excel 앱 열기는 물리 Esc 중지 뒤 재시도했으나 `coordinate input geometry is unavailable`, 창 재선택/활성화 재시도의 `failed to activate captured window`로 미검증이며, ExcelJS 재읽기와 브라우저 다운로드 검증은 통과했다.

배포 준비에서 기존 runtime 취약점을 패치했다: API source-map-js, Admin Next.js/eslint-config-next 16.3.8 및 PostCSS/sharp/nanoid/baseline-browser-mapping. 운영 의존성 audit는 0건이다. 운영 DB 적용은 아래에 기록한다.


## 2026-10-06 운영 DB 적용

사용자의 커밋·푸시·운영 반영 승인 후 연결된 운영 프로젝트에 `supabase db push --linked --yes`로 두 마이그레이션을 적용했다. 사용자 41명, 관리자 프로필 7개, 영업 프로필 19,615개 및 기존 목록 첫 100행의 전후 해시가 동일하다. 운영 public/app_private 린트와 환경을 production으로 지정한 advisors를 통과했다. 서비스 역할만 두 신규 RPC를 실행할 수 있으며 authenticated 역할은 실행할 수 없다.

최종 검증: API 본 테스트 695개 중 692개 통과/기존 3개 건너뜀, Admin 165개 통과, 전체 pgTAP 15개 파일/136개 통과, 양쪽 린트·프로덕션 빌드·runtime audit 통과. 기존 로컬 `artifacts/release-server-cli-lint-source.ts`의 미해결 상대 import는 API 빌드 동안에만 보존 이동 후 원래 해시로 복원했다. 추적 소스나 tsconfig는 변경하지 않았다. 로컬 Node V8의 기존 JIT 종료 오류가 한 번 발생하여 전체 명령을 재실행했고 통과했다. 최근 100명 목록 밖의 본인 계정을 별도 포함하는 회귀 검사도 추가했다.


## 운영 API·Admin 배포

2026-10-06 DB 적용 후 API 구현 `79abb4d78d027c102b5f544a5b2f4b4d8a8c517e`를 main에 푸시했다. API 배포 `dpl_7nBByydXSyo8GcgVLiUnCFGxeJcc`가 production READY로 `https://chikapick-api.vercel.app`에 연결된 것을 확인한 다음 Admin 구현 `97b4d87d271315fdc70ac68a1f0dfe496fcd9824`를 푸시했다. Admin 배포 `dpl_3DEUxjWCUQwq4AxKcdBJQSQKRs6j`도 production READY로 `https://admin.chikapick.com`에 연결됐다.

운영 내보내기 RPC는 실제 활성 대상 19,615개를 반환했다. API health/readiness 200, 신규 경로의 비로그인 요청 401과 JSON 오류, 공식 Admin 출처의 GET/PATCH preflight 204 및 CORS를 확인했다. Admin 페이지 200과 보안 헤더를 확인했다. 운영 사용자 이름/영업 자료를 시험 삼아 변경하거나 운영 QA 계정을 만들지 않았다. 인증된 화면 저장/다운로드 흐름은 위의 실제 로컬 API/DB·합성 브라우저 검증 근거와 구분한다. 로컬 합성 치과 1,205개와 생성 계정 2개를 제거하고 임시 DB 권한을 원복했다. 브라우저 테스트 토큰 파일은 제거했으며 캡처에는 합성 자료만 포함된다.

API GitHub CI: https://github.com/Heeon-Company/ChikaPick_API/actions/runs/37421622744 . 배포 READY와 CI 완료는 별도로 확인한다.
