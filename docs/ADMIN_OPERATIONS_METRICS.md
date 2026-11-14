# Memoria Admin Operations & Metrics

**Primary Components:**
- `apps/web/src/app/admin/page.tsx`
- `services/api-gateway/src/server.ts` (`/api/v1/admin/overview/metrics`, `/api/v1/admin/services/health`, `/api/v1/admin/feature-flags`)
- `services/memory-service/src/server.ts` (`/api/v1/admin/spaces`)
- `services/media-service/src/server.ts` (`/api/v1/admin/storage/stats`)

## 1. Real Backend Aggregates
- **Spaces & Memories:** `/api/v1/admin/spaces` queries `memories` for actual `memoryCount` per space and `collabDb` (`space_members`) for actual `memberCount`, returning `null` if `collabDb` is unavailable (rendered as `"Unavailable"` in the UI rather than a fabricated number).
- **Storage Quotas:** `/api/v1/admin/storage/stats` aggregates `space_storage_quotas` (`usedBytes`, `maxBytes`, `usedPercentage`) per space and globally.
- **No Hardcoded Placeholders:** Removed hardcoded `memberCount: 1`, `memoryCount: 0`, `usedPercentage: 10`, `syncStatus: "synchronized"`, and `"Live DB"` strings from `apps/web/src/app/admin/page.tsx`.
