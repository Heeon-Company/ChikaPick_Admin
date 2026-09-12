# Terms management

The existing terms directory dynamically lists all API-owned documents. `pendingAdminTermVersion` identifies a newer inactive version or an active version whose effective time is still in the future. Older inactive versions remain history. A newer inactive version remains pending even after its effective time, so a failed activation is not mistaken for an old version.

The card shows current and pending versions separately, including the pending effective time in Korea time and its immutable content link. An overdue pending version shows `적용 대기 · 확인 필요`. Pending cards disable `새 버전 게시`. Refresh the page after activation to reload authoritative version state.

`CHIKA_TALK_COMMUNITY_POLICY` and `CHIKA_TALK_PRIVACY_CONSENT` display `치아톡 작성 시 필수`; their globally optional database setting does not make them optional for writing. Other documents retain their required/optional presentation.

API migration `20260913120000` independently prevents publication over a pending version under the existing document publication lock. A stale browser or direct API request receives HTTP 409 with a Korean explanation. The existing preview, immutable history, and immediate publication flow remain available for documents without pending versions.
