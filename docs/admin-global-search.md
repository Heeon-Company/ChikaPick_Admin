# Admin top-bar search

The top-bar search button (or Ctrl/Cmd+K) opens `AdminGlobalSearch`, a native modal dialog. It is read-only and uses only existing protected Admin API list endpoints; no API or database change is required.

- Menu: any input matches visible primary-tab labels, ignoring spaces and case. Tabs hidden from the current admin (for example 영업 성과 관리 for non-super admins) are never offered.
- Records: from two characters, after a 250ms pause, the dialog queries up to five rows each from 치과 영업 관리 (`clinicName`), 파트너 치과 관리 (`query`), 파트너스 계정 (`POST /partner-accounts/search`) and 멤버십 업체 (`search`). Sources fail independently; a stale response is ignored once the input changes or the dialog closes.
- Email input adds a 치카픽 계정 shortcut. It only prefills the lookup email; the admin still submits the masked lookup.

Selecting a result:
- Menu → that primary tab.
- Dental sales / partner clinic → the existing detail screen through admin navigation history, so Back returns to the previous screen.
- Partner account / membership / 치카픽 계정 → that tab with its own search field prefilled (account email or name, partner name, email). The handoff lives only in memory; it is dropped when the tab is left or navigation is cancelled by the unsaved-changes guard, and is never written to browser history.

Arrow keys move between the input and results; Enter selects; Escape or a backdrop click closes and clears the dialog.

Validation: `npm run test` (helper tests in `src/lib/admin-global-search.test.ts`), `npm run lint`, `npm run build`. The 2026-10-07 browser check used the dev server with intercepted Supabase/API responses (no production requests or data): Ctrl+K focus, grouped results, keyboard selection, each result type's destination and prefill, Back from a detail, Escape, stale handoff after sidebar navigation, and a 375px viewport.
