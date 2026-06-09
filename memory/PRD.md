# Central Inventory — PRD

## Original Problem Statement
P26 API Validation — G-012 (Request Catalog Categories), G-013 (Reference Codes), and history regression fix. Full smoke validation across complete transfer lifecycles.

## Architecture
- **Frontend**: React 19 + CRACO + Tailwind CSS 3 + Radix UI + shadcn/ui
- **Backend**: FastAPI proxy → preprod.mygenie.online POS API
- **Database**: MongoDB (local session cache only)

## P26 Validation Timeline

| Date | Session | Result |
|------|---------|--------|
| 9 June 2026 | Initial G-012/G-013 probe | G-012 ✅, G-013 🔴 write blocker |
| 9 June 2026 | Revalidation post-fix | G-012 ✅, G-013 ✅ (write fixed) |
| 9 June 2026 | Impact analysis | History regression: `id` field missing, 14 keys dropped |
| 9 June 2026 | Post-deploy probe | History still broken (fix not deployed) |
| 10 June 2026 | **Full smoke validation** | **ALL PASS — 20/20 checks, both lifecycles complete** |

## Current Status: ✅ ALL CLEAR
- History regression fix deployed — 26/26 keys on all 16 rows
- `id === transfer_id` confirmed
- reference_code: generated, unique, persistent, consistent across lifecycle
- Both direct dispatch and request flow lifecycles validated end-to-end

## Addenda
- `AI/Plans/api_implementation_status_p26_addendum.md` — pre-fix findings
- `AI/Plans/api_implementation_status_p26_revalidation_addendum.md` — post-fix confirmation
- `AI/Plans/p26_undefined_transfer_impact_analysis.md` — regression impact analysis
- `AI/Plans/api_implementation_status_p26_smoke_validation.md` — full smoke validation (current)

## Frontend Action Items (P0)
1. Add `resolveTransferId(t) = t.id ?? t.transfer_id` defensive pattern
2. Replace `formatPO(t.id)` with `reference_code` display
3. Add `items_count ?? line_count` fallback for PendingQueues
4. G-012: Category grouping UI in RequestStockForm step 2

## Backlog
- P24 FEFO batch stock detail panel
- P20 hierarchy toggle
- P21 Smart Dispatch
