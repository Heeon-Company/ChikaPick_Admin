# Dentist-license verification flow

Last policy change: 2026-10-11 (PM decision). The license no longer gates Partners; it only unlocks dentist-only features. The 2026-09-19 sections below (rollout, verification, delivery) are kept as history.

Design: https://www.figma.com/design/VCdW8sFEyA8Ov3evzQ0vVM?node-id=7930-62211

## Contract

- The license does not gate Partners. Unverified owners/doctors use the dashboard and My Page like staff; `내 프로필` shows a one-line notice with a `면허 인증하기` link to `/license-verification`, which has a `대시보드로 돌아가기` link. A verified license is still required where the API checks it: patient-visible dentist profiles, ChikaTalk (치아톡) dentist answers and receiving an owner hand-over. Current active/pending owner/doctor memberships and owners awaiting manual hospital review may submit; staff/managers cannot.
- Required signup terms/PASS remain authoritative. License approval never approves hospital registration or affiliation. Approved pending doctors retain profile-only access; approved manual owners return to the existing hospital-review receipt.
- The signup status response includes `licenseVerificationRequired`, `licenseVerified`, and `hospitalReviewPending`. Partners uses them to decide whether the license page applies (it sends users without a requirement back to their normal entry); they no longer block entry.
- The shared server gate requires only a finished signup (PASS) for Partners business routes. It no longer returns `LICENSE_VERIFICATION_REQUIRED`, and Partners no longer redirects to `/license-verification`. License submission/read and owner hand-over routes stay exempt from that gate.
- Signed uploads accept 1–10 JPG/PNG/PDF files, at most 10MB each. Finalization receives `files: [{ submission_id, storage_path, original_name }]`, validates each actual stored object and ownership, and creates a pending review. Legacy single-file payloads remain supported.
- The additive `partner_license_verification_submissions.files` column preserves legacy rows. Old rows return a one-file array.
- Admin's 치과의사 면허 인증 tab pages through `GET /api/v1/admin/license-verifications?filter=all|pending|approved|needs_submission&page=&pageSize=` (service-only RPC `list_admin_license_verification_requests`, migration `20261013100000_admin_license_review_directory.sql`), which picks applicants, their latest submission, the page and the status summary in the database. It returns file names but no links; `GET /api/v1/admin/license-verifications/:userId/files?submissionId=&index=` signs one file for five minutes when Admin opens it. The Admin console returns only `licenseVerificationSummary` for the dashboard (plus an empty `licenseVerificationRequests` for older Admin builds).
- Admin PATCH sends an explicit `submissionId`, `licenseVerified`, and trimmed rejection `note` of at most 1000 characters. Submission/review RPCs lock the applicant profile. Stale or completed reviews return 409; profile, submission and audit commit or roll back together.
- Approved applicants cannot replace their files. Profile links are read-only and renew their private signed URLs when clicked. Private profile, license and Admin-console responses are not cacheable.
- Existing Partners dashboard/profile styling and Admin cards, filters and dialogs remain. The new standalone gate reuses existing license styles and exact Figma-exported icons.
- Korean specialist consultations remain disabled. License-page copy says approval unlocks dentist-only features (patient-app profile, 치아톡 answers), not Partners itself, and the approved CTA says 치카픽 파트너스로 돌아가기, returning to the user's normal Partners entry. No Flutter Client update is needed: public doctor eligibility already uses the same verified-license flag.

## Rollout (2026-09-19)

Apply only `20260919170000_partner_license_required_flow.sql`, then deploy API, Partners and Admin. Older Admin clients must reload before reviewing because the API now requires the inspected submission ID.

## Verification (2026-09-19)

API: `npm test`, `npm run lint`, `npm run build`. The added `partner-license-required-flow.test.ts` covers role exemptions, pending manual owners, stale review rejection, audit rollback and browser-role RPC denial. Existing license/admin/signup tests cover signed-file validation and idempotent finalization.

Partners: `npm test -- --run --maxWorkers=4`, `npm run lint -- --ignore-pattern 'artifacts/**'`, `npm run build`. For `e2e/license-verification.spec.ts`, start local Next on port 3101 with:
- `E2E_TEST_MODE=1`
- `NEXT_PUBLIC_E2E_MOCK=0`
- `NEXT_PUBLIC_CHIKAPICK_API_BASE_URL=http://127.0.0.1:3101/__license_api`
- `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_e2e_mock`

Run Playwright with `PLAYWRIGHT_STAGING_URL=http://127.0.0.1:3101` and `PLAYWRIGHT_LICENSE_QA=1`. External identity/API/storage responses are mocked; actual entry guards, components, HTTP submission payloads and browser interactions run normally. Test flags are local only.

Admin: `npm test`, `npm run lint`, `npm run build`. Browser QA checks the existing directory, multiple private file links, rejection reason, a replacement submission, and approval of its exact ID.

The local Partners `artifacts/license-verification-20260919/` gallery contains synthetic-account screenshots of every new state, the read-only profile and existing Admin decision screens. These are local delivery material, not production records or tracked source.

## Verified delivery (2026-09-19)

The linked database migration was applied successfully with Supabase CLI on 2026-09-19. A read-only query confirmed the new files column. API full checks passed (85 pretests; 584 passed and 3 skipped in the main suite), Admin 163 tests passed, and Partners 309 tests passed with 1 skipped before the new entry-policy tests; the focused follow-up passed 74 tests. All three production builds passed. Partners lint retains six pre-existing image warnings and no errors. All six Partners browser scenarios passed, including actual Figma icon loading and fresh private-file URL navigation; Admin approval/rejection browser checks passed without console errors. Browser verification uses synthetic data; it does not establish review of any real applicant license.
