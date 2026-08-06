# ChikaPick Admin

ChikaPick Admin is the internal operations console for ChikaPick. It is a
Next.js App Router app intended for Vercel deployment and uses Supabase Auth for
administrator login.

All privileged reads and mutations go through `ChikaPick_API`; this app never
stores or uses Supabase service-role credentials.

## Features

- 관리자 Supabase 이메일/비밀번호 로그인
- 1시간 유효한 관리자 초대, 재전송/취소, 초대 수락 및 비밀번호 재설정
- Admin browser session registration with `appSurface: "admin"`
- 운영 현황 summary metrics
- 전국 HIRA 치과 영업 관리: 서버 필터/페이지네이션, 지역 초대코드, 담당자 배정, 방문 이력, 가입/활성 상태
- 수동 병원 가입 심사 approve/reject, including short-lived business-license file links
- 소속 신청 approve/reject
- 치과의사 면허 인증 approve/reject
- 병원, 사용자/권한, 초대코드, 예약/소견, 약관, 운영 큐 overview
- Active invite revocation

## Environment

Copy `.env.example` to `.env.local` and fill:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_CHIKAPICK_API_BASE_URL=http://localhost:3000
```

The API origin must also allow this Admin origin in `ALLOWED_ORIGINS`.

## Development

```bash
npm install
npm run dev
npm run lint
npm run build
```

For local development with `ChikaPick_API` on `http://localhost:3000`, run this
app on another port, for example:

```bash
npm run dev -- --port 3002
```

## Admin Access

The backend verifies admin authorization through `user_roles.role = 'admin'`.
Logging in with a non-admin Supabase account will authenticate successfully but
admin API calls will be rejected. The console shell remains blocked until
Admin session registration and the initial authorized console request both
succeed. Incomplete invitations, locked accounts, and expired sessions are
signed out locally with a specific recovery message; transient API failures
remain on a retry/logout gate.

Admin invitations do not provision authorization when mail is sent. The
recipient opens `/account/setup`, explicitly confirms the email link, and sets
an 8–16 character password containing a digit and a supported symbol. Only the
API's transactional completion step adds the Admin role. The same page handles
password recovery. After a successful invitation or recovery, the setup page
clears the verification session and directs the recipient to sign in manually.
A locked account stays locked after its password is changed.

For active, unlocked non-super accounts, a Super Admin can use the account-row
menu to switch between `영업 담당자` and `운영 관리자`. Super Admin accounts
never expose this action, and the API rejects every attempt to change their
role.

The Admin sidebar includes a Partners-aligned `설정` tab. It shows the current
Admin account summary and signs out only the current browser session before
returning to the Admin login screen.

A Super Admin may withdraw their own Admin access from `어드민 계정 관리`.
Successful self-withdrawal revokes Admin sessions and returns the current
browser to the login screen. The API rejects the action when that account is
the last unlocked Super Admin, preventing an administrator lockout. Withdrawal
does not delete the underlying Supabase identity or unrelated patient/partner
roles.
