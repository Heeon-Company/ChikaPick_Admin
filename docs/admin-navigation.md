# Admin browser navigation

`AdminNavigationProvider` owns the primary tab and full-page selection. `src/lib/admin-tabs.ts` is the shared tab inventory. `src/lib/admin-navigation.ts` replaces the former dental-sales/partner-clinic-only helper, storing only screen identifiers and record IDs in namespaced browser history while preserving Next.js state.

Supported flows:
- Dentalpedia list → video/post/article editing or blank creation.
- Dental sales list → profile detail; partner clinics list → clinic detail.
- Partner accounts → search; memberships → registration.
- Service expansion → area requests, clinic requests, app copy management.
- Support → announcements/FAQ list → announcement/category/FAQ creation or editing.

Primary-tab changes and full-page selections push history. Back/Forward restores the owning tab and selection. Reload restores the selection and reloads data through authenticated APIs. List/Cancel traverses to its recorded parent rather than pushing a duplicate list. Changing a blank Dentalpedia editor type replaces that editor entry; clicking the current type is a no-op. Existing content cannot change type. Inline filters, previews, menus and modal/drawer overlays remain local state. Dentalpedia search/filters/page remain mounted across list/editor navigation.

Each history entry has an index and previous screen. Rejected navigation traverses back to the original index without adding or replacing entries. The same guard covers browser traversal, sidebar navigation, list buttons and content-type changes; accepted UI returns ask at most once. Leaving the document or reloading uses a native before-unload warning.

`useUnsavedChanges` captures editable values after asynchronous hydration. Content, settings, ordering and file identity count as edits; restoring the original values is clean. Preview controls, status messages and signed preview URLs are excluded. Dentalpedia's three editors, membership registration, support editors/settings and service-area copy register guards. Pending saves block navigation. Successful saves release the guard and accept the canonical baseline; failures preserve dirty state. Never store draft contents, attachments, credentials or API payloads in history.

Validation: `npm run test`, `npm run lint`, `npm run build`. Unit tests cover every supported flow, cross-tab history, cancellation in both directions, multi-entry jumps, type replacement, reload, Next.js-state preservation, hydration/revert, file identity and ordering. The 2026-09-14 browser check used the real components with local API fixtures: all Dentalpedia editor types, clean/dirty/reverted forms, cancelled navigation, failed/successful saves, pending-save blocking, search preservation, support creation/edit/save and service-expansion subpage traversal. Production records were not modified. Remove temporary fixtures before the production build.
