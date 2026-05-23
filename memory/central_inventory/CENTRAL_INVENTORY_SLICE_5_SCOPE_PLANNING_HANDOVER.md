# Central Inventory Slice 5 — Scope Planning Handover

> **Date:** 23 May 2026
> **From:** Slice 5 Scope Planning Agent
> **To:** Owner (for question answers) → Slice 5 Implementation Planning Agent

---

## 1. Planning Document

**Path:** `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_SCOPE_PLANNING.md`

---

## 2. Recommended Scope

**Option A — Focused Stock Correction Slice**

| Category | Count | Items |
|----------|-------|-------|
| Must-have | 7 | Stock Adjustment form, Wastage Entry form, Ledger entries for adj/wastage, Wastage Report view, Predefined reason categories, Confirmation dialogs, Duplicate prevention + toast |
| Should-have | 4 | Edit Transfer (API discovery), Read-only banner text update, Ops Hub adj/wastage summary, Source selector refinement |
| Deferred to Slice 6 | 2 | Stock Return, Lateral Transfers |
| Blocked | 1 | Edit Transfer (API contract unknown — attempt discovery) |

---

## 3. Owner Questions (10)

| # | Question | Recommended |
|---|----------|-------------|
| Q-S5-001 | Slice 5 direction preference? | A (Stock Correction) |
| Q-S5-002 | Single form or separate screens for adj/wastage? | B (Separate) |
| Q-S5-003 | Adjustment reason categories? | B (Use defaults) |
| Q-S5-004 | Wastage reason categories? | B (Use defaults) |
| Q-S5-005 | Edit Transfer wait for API? | C (Should-have, discover during impl) |
| Q-S5-006 | Stock Return in Slice 5 or 6? | B (Defer to 6) |
| Q-S5-007 | Lateral Transfers in Slice 5 or 6? | B (Defer to 6) |
| Q-S5-008 | Photo evidence for wastage? | B (No — Phase 2) |
| Q-S5-009 | Cost/value impact display? | C (Show if API provides) |
| Q-S5-010 | Approval for adj/wastage? | A (No — confirmed by existing answers) |

---

## 4. API Evidence Needs

| Item | API Status | Discovery Needed? |
|------|-----------|-------------------|
| Stock Adjustment (decrease) | Verified (Section E PASS) | NO |
| Stock Adjustment (increase) | Implied (`add-stock` per Q-ADJ-001) | YES — payload shape |
| Wastage (record) | Verified (Section E PASS) | NO |
| Wastage (report) | Verified (Section E PASS) | NO |
| Edit Transfer | **UNKNOWN** | YES — endpoint + payload |

---

## 5. Recommended Next Agent

### `Slice 5 Owner Question Gate Agent`

**Tasks:**
1. Present Q-S5-001 through Q-S5-010 to owner
2. Record answers
3. Resolve any scope conflicts
4. Hand off to Slice 5 Implementation Planning Agent

**Credentials for testing (unchanged):**
- Central Store: `abhishek@kalabahia.com` / `Qplazm@10`
- Master Store: `owner@democentral1.com` / `Qplazm@10`
- Outlet: `owner@demofranchise1.com` / `Qplazm@10`

---

*End of Scope Planning Handover*
