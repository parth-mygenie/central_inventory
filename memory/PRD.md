# Central Inventory — PRD

## Original Problem Statement
P26 API Validation — Validate G-012 (Request Catalog Categories) and G-013 (Reference Codes) against live POS API. Re-run after POS backend fix.

## Architecture
- **Frontend**: React 19 + CRACO + Tailwind CSS 3 + Radix UI + shadcn/ui
- **Backend**: FastAPI proxy → preprod.mygenie.online POS API
- **Database**: MongoDB (local session cache only)

## P26 Validation History

### Session 1 (9 June 2026 — initial)
- G-012: ✅ PASS
- G-013: 🔴 BLOCKER — write path inserting empty `reference_code`, SQL unique constraint violation

### Session 2 (9 June 2026 — revalidation post-fix)
- G-012: ✅ PASS (unchanged)
- G-013: ✅ PASS — fix confirmed, `TRF-{year}-{seq:04d}` format, 3 consecutive creates, full consistency
- Both gaps **CLOSED**

## Addenda
- `AI/Plans/api_implementation_status_p26_addendum.md` — pre-fix findings
- `AI/Plans/api_implementation_status_p26_revalidation_addendum.md` — post-fix confirmation

## Prioritized Backlog
### P0 — Ready for Implementation
1. G-012: Category grouping UI in `RequestStockForm` step 2
2. G-013: Display `reference_code` in TransferDetail, PendingQueues, HistoryLedger

### P1 — Deferred
3. P24 FEFO batch stock detail panel
4. P20 hierarchy toggle
5. P21 Smart Dispatch
