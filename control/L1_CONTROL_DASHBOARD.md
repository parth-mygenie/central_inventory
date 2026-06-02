# L1 — Control Dashboard (Project Status)

> **Updated:** 2026-06-02 (CR-024 + CR-025 complete, pending owner signoff)

---

## Current State

| Field | Value |
|-------|-------|
| **Branch** | `02-june` (deployed from GitHub) |
| **Deploy URL** | `https://7d067d86-11d0-4171-9ae2-57e426a47f39.preview.emergentagent.com` |
| **Active Sprint** | **S3 — API Reality Check + Intelligent PO** |
| **UI Freeze Status** | PHASE 7 FROZEN — Implementation **SUBSTANTIAL** (see below) |
| **Implementation Status** | 24/24 screens present, CR-023 fixes applied, Intelligent PO built |
| **Data** | ChocolateHut — 158 inventory items seeded via API |
| **Dev Dashboard** | `/__dev/index.html` |
| **UI Previews** | `/__dev/previews/*.html` (9 files) |

## Sprint S3 — Active Work

### CR-023: API Reality Check & Intelligence Gap Fix — **QA**
- 17 of 18 bugs fixed (B10 deferred — no vendor history API)
- Progressive loading on Operations Hub (no more skeleton blocking)
- PendingQueues: Reject/Approve All buttons, requester health mini-bar, insufficient warnings
- TransferDetail: FROM/TO labels, Requester Store Snapshot, Approval Impact
- All artifact 0-5 DONE. **Artifact 6 (Owner Signoff) PENDING**

### CR-024: API Response Cache — **QA**
- In-memory cache with TTL (30-60s) in `api.js` (single file change)
- 71 → 20 API calls across 4-navigation session (72% reduction)
- In-flight dedup + auto-invalidation on mutations
- Gate waived (velocity exception). **Owner Signoff PENDING**

### CR-025: Coverage-Based Intelligent PO — **QA**
- Request Stock: Coverage selector (3/7/10/30d), consumption-based ordering with threshold fallback, category-grouped suggested items, source cross-validation. 173 → 4 items (smart filter)
- Direct Dispatch: Integrated dispatch table with inline Source Segment picker, "You'll retain X%" projection, review warnings, order summary
- Gate waived (velocity exception). **Owner Signoff PENDING**

## Registry: 25 CRs, 16 BUGs, 3 Sprints (S0-S2 closed, S3 active)

## Owner Signoff Pending

- **CR-021** — Sprint A+B+C Intelligence Implementation
- **CR-022** — Code Quality Review Fixes
- **CR-023** — API Reality Check & Intelligence Gap Fix
- **CR-024** — API Response Cache
- **CR-025** — Coverage-Based Intelligent PO

## Backend Gaps

| ID | Gap | Priority | Status |
|----|-----|:--------:|--------|
| G-013 | PO number generation | P0 | Frontend workaround (formatPO) |
| G-014 | Invoice OCR endpoint | P1 | Upload tab "Coming Soon" |
| G-015 | Excel parsing endpoint | P2 | Excel zone pending |
| G-012 | Catalog category fields | P1 | Open |
| G-016 | Invoice storage | P2 | Open |
| G-017 | Vendor purchase history API | P2 | Open |

## Quick Links

| Layer | Path |
|-------|------|
| L0 Baseline | `control/L0_BASELINE_INDEX.md` |
| L2 Handover | `control/L2_HANDOVER_PROTOCOL.md` |
| L6 Sprint | `control/L6_SPRINT_STATUS.md` |
| L8 Credentials | `control/L8_ACCESS_REGISTRY.md` |
| L9 Gaps | `control/L9_OPEN_GAPS_REGISTER.md` |
| Registry | `control/registry.json` |
| Phase 7 Freeze | `control/sessions/INTELLIGENT_UI_FREEZE_PHASE_7_FINAL_FREEZE.md` |
