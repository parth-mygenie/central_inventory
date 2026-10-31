# L0 — Baseline Index (Frozen Truth)

> **Status:** `v0_pre_governance` — awaiting owner sign-off promotion to v1
> **Rule:** Updated ONLY on owner-approved promotion. Never edited mid-sprint.

---

## Frozen Documents (Source of Truth)

| # | Document | Path | Lines | What It Freezes |
|---|----------|------|:-----:|-----------------|
| 1 | Business Rule & UX Field Freeze | `memory/central_inventory/CENTRAL_INVENTORY_BUSINESS_RULE_AND_UX_FIELD_FREEZE.md` | 984 | 96 owner decisions, field definitions, UX behaviors, permissions |
| 2 | System Handover Document | `memory/central_inventory/SYSTEM_HANDOVER_DOCUMENT.md` | 913 | Hierarchy model, stock architecture, transfer lifecycle, dispatch mechanics, API inventory |
| 3 | CR Requirement Planning | `memory/central_inventory/CENTRAL_INVENTORY_CR_REQUIREMENT_PLANNING.md` | 2281 | 26 modules, 22 workflows, 23 screens, API matrix, data entities |
| 4 | Login Context & Visibility Matrix | `memory/central_inventory/CENTRAL_INVENTORY_LOGIN_CONTEXT_AND_SCREEN_VISIBILITY_MATRIX.md` | 212 | Role-to-screen access, hierarchy visibility rules |
| 5 | Owner Answers Complete | `memory/central_inventory/OWNER_ANSWERS_COMPLETE.md` | 416 | 104 owner decisions across all rounds |
| 6 | Slice 5 Phase 0 Baseline Lock | `memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_PHASE_0_APPROVAL_AND_BASELINE_LOCK.md` | 462 | Slice 5 scope lock, approved items, phase plan |

## Architecture Contracts

| Contract | Decision | Frozen? |
|----------|----------|---------|
| Hierarchy: 3 fixed levels | Central (top) → Master (mid) → Outlet (bottom) | YES |
| Terminology inversion | Backend `master` = Business Central, `central` = Business Master, `franchise` = Business Outlet | YES |
| Backend is proxy-only | FastAPI forwards all calls to `preprod.mygenie.online` — zero local business logic | YES |
| Stock source of truth | Segment ledger (`inventory_stock_segments`), not aggregate (`inventory_master`) | YES |
| Auth model | Vendor employee login via POS API. Token-bound to one restaurant. No impersonation. | YES |
| Transfer lifecycle | requested → approved → dispatched → received / partially_received / rejected / cancelled / on_hold | YES |

## Baseline Promotion Log

| Version | Date | Promoted By | Items Included | Notes |
|---------|------|-------------|----------------|-------|
| v0 | 2026-05-31 | System (retroactive) | CR-001 to CR-014, BUG-001 to BUG-015 | Pre-governance. Owner sign-off pending. |
