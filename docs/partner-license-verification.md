# Dentist-license required flow — 2026-09-19

Design: https://www.figma.com/design/VCdW8sFEyA8Ov3evzQ0vVM?node-id=7930-62211

## Contract

- Owners/doctors must obtain license approval before using Partners business features. Current active/pending memberships and owners awaiting manual hospital review are eligible to submit. Staff/managers keep their existing access.
- Required signup terms/PASS remain authoritative. License approval never approves hospital registration or affiliation. Approved pending doctors retain profile-only access; approved manual owners return to the existing hospital-review receipt.
- The signup status response adds `licenseVerificationRequired`, `licenseVerified`, and `hospitalReviewPending`. Dentist clients fail closed if approval is missing.
- All protected Partners business routes use the shared server gate. Signup/identity and license submission/read routes remain reachable. Blocked requests return 403 `LICENSE_VERIFICATION_REQUIRED`; Partners redirects to `/license-verification`.
- Signed uploads accept 1–10 JPG/PNG/PDF files, at most 10MB each. Finalization receives `files: [{ submission_id, storage_path, original_name }]`, validates each actual stored object and ownership, and creates a pending review. Legacy single-file payloads remain supported.
- The additive `partner_license_verification_submissions.files` column preserves legacy rows. Old rows return a one-file array.
- Admin PATCH sends an explicit `submissionId`, `licenseVerified`, and trimmed rejection `note` of at most 1000 characters. Submission/review RPCs lock the applicant profile. Stale or completed reviews return 409; profile, submission and audit commit or roll back together.
- Approved applicants cannot replace their files. Profile links are read-only and renew their private signed URLs when clicked. Private profile, license and Admin-console responses are not cacheable.
- Existing Partners dashboard/profile styling and Admin cards, filters and dialogs remain. The new standalone gate reuses existing license styles and exact Figma-exported icons.
- Korean specialist consultations remain disabled. The approved CTA says 치카픽 파트너스 시작하기. No Flutter Client update is needed: public doctor eligibility already uses the same verified-license flag.

## Rollout

Apply only `20260919170000_partner_license_required_flow.sql`, then deploy API, Partners and Admin. Older Admin clients must reload before reviewing because the API now requires the inspected submission ID.

## Verification

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

## Verified delivery

The linked database migration was applied successfully with Supabase CLI on 2026-09-19. A read-only query confirmed the new files column. API full checks passed (85 pretests; 584 passed and 3 skipped in the main suite), Admin 163 tests passed, and Partners 309 tests passed with 1 skipped before the new entry-policy tests; the focused follow-up passed 74 tests. All three production builds passed. Partners lint retains six pre-existing image warnings and no errors. All six Partners browser scenarios passed, including actual Figma icon loading and fresh private-file URL navigation; Admin approval/rejection browser checks passed without console errors. Browser verification uses synthetic data; it does not establish review of any real applicant license.
