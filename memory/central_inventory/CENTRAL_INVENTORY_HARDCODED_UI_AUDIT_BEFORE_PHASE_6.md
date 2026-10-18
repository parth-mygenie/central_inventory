# Central Inventory Hardcoded UI Audit Before Phase 6

> **Date:** 24 May 2026
> **Agent:** Senior Central Inventory Hardcoded UI Audit + Cleanup Planning Agent
> **Purpose:** Identify all stale/hardcoded UI text before Phase 6 cleanup

---

## 1. Audit Status

### `hardcoded_ui_audit_complete_cleanup_ready_for_phase_6`

All frontend code inspected. 8 stale/hardcoded items found across 5 files. No global read-only env flag exists — all stale messaging is purely hardcoded HTML text. Cleanup can proceed in Phase 6 with no owner decision needed.

---

## 2. Inputs Reviewed

| # | Input | Reviewed |
|---|-------|----------|
| 1 | Phase 0 Baseline Lock | YES (SH-9 banner text update confirmed as should-have) |
| 2 | Phase 5 Implementation Report | YES |
| 3 | Phase 6 Handoff | YES |
| 4 | Slice 5 Implementation Plan (Section 10 SH-9) | YES |
| 5 | Slice 1-4 Closure Report (Known Issues #1) | YES ("Phase 1 Limited Slice" banner noted as accepted_expected_behavior) |
| 6 | Slice 4 Implementation Report (Known Issues #1) | YES (same banner noted) |
| 7 | Owner screenshot | YES (Read-only Mode badge + Phase 1 banner) |

**Code files inspected: 12**

| File | Inspected |
|------|-----------|
| `AppHeader.jsx` | YES — stale badge found |
| `ContextSelector.jsx` | YES — stale banner found |
| `LoginPage.jsx` | YES — stale footer found |
| `screenVisibility.js` | YES — "comingSoon" on Reports found |
| `Sidebar.jsx` | YES — "(soon)" label rendering found |
| `api.js` | YES — stale comment found |
| `useCentralInventoryRealtime.js` | YES — stale comment found |
| `TransferDetail.jsx` | YES — edit noop found |
| `StockAdjustmentForm.jsx` | YES — clean |
| `WastageEntryForm.jsx` | YES — clean |
| `WastageReport.jsx` | YES — clean (read-only comment is accurate) |
| `OperationsHub.jsx` | YES — clean |

---

## 3. Screenshot Issue Summary

Owner screenshot shows two stale elements:

1. **Header badge** (top-right): `Read-only Mode` — unconditional amber badge in `AppHeader.jsx` line 40–43
2. **Context banner** (below store name): `Phase 1 Limited Slice — Read-only mode. Write operations pending backend resolution.` — unconditional yellow banner in `ContextSelector.jsx` line 141–144

Both are **hardcoded HTML** with no conditional logic, no feature flag, no env variable. They render for every authenticated user regardless of role or feature availability.

---

## 4. Current Product Truth

Global read-only messaging is **stale** because:

| Flow | Status | Since |
|------|--------|-------|
| Transfer Approve/Reject/Dispatch/Receive/Cancel | **Live** | Slice 4 |
| Direct Dispatch | **Live** | Slice 4 |
| Request Stock | **Live** | Slice 4 |
| Report Issue | **Live** | Slice 4 |
| Stock Adjustment (increase/decrease) | **Live** | Slice 5 Phase 2 |
| Wastage Entry | **Live** | Slice 5 Phase 3 |
| Wastage Report | **Live** | Slice 5 Phase 4 |

**Still deferred:** Edit Transfer (noop), Stock Return, Lateral Transfers, Reports/export, KPI dashboard, Cost/value reporting.

A global "Read-only Mode" badge is factually incorrect. The system is read-write for 10+ write operations.

---

## 5. Hardcoded / Stale UI Strings Found

| ID | Text/String | File | Line | UI Area | Current Behavior | Classification | Recommended Action | Phase 6 Include? |
|----|-------------|------|------|---------|-----------------|----------------|-------------------|-----------------|
| S-01 | `Read-only Mode` | `AppHeader.jsx` | 40–43 | Header badge (top-right, always visible) | Unconditional amber badge — renders for every authenticated user. No condition. | **remove_now_safe** | Remove the entire `<div>` block (lines 40–43). The app is read-write. No replacement needed. | YES |
| S-02 | `Phase 1 Limited Slice — Read-only mode. Write operations pending backend resolution.` | `ContextSelector.jsx` | 141–144 | Yellow banner below store name on Operations Hub | Unconditional hardcoded text. No condition. | **remove_now_safe** | Remove the entire `<div>` block (lines 141–144) including the comment on line 141. | YES |
| S-03 | `Phase 1 — Read-only preview. Write operations pending backend resolution.` | `LoginPage.jsx` | 89–91 | Footer text below Sign In button | Always shown on login page. | **replace_now_safe** | Replace with neutral text such as `"Central Inventory — MyGenie"` or remove entirely. | YES |
| S-04 | `comingSoon: true` on "Reports" nav item | `screenVisibility.js` | 89 | Sidebar "Reports (soon)" label | Reports screen is still deferred (OI-006). | **keep_for_specific_read_only_screen** | Keep — Reports IS genuinely not implemented. This is accurate. | NO |
| S-05 | `(soon)` label rendering for `comingSoon` items | `Sidebar.jsx` | 74–76 | Sidebar nav items with `comingSoon` flag | Shows "(soon)" next to Reports label. | **keep_for_specific_read_only_screen** | Keep — the rendering logic is correct. Only used by Reports currently. | NO |
| S-06 | `edit: () => {}` (noop handler) | `TransferDetail.jsx` | 130 | Edit Transfer button action | Edit button renders but does nothing. SH-8 deferred. | **keep_for_specific_read_only_screen** | Keep — Edit Transfer API is genuinely unknown. The noop is the correct deferred behavior. | NO |
| S-07 | `Read APIs only for Phase 1 Slice 1. Write APIs are intentionally omitted (UNIT_CONVERSION_NOT_DEFINED blocker).` | `api.js` | 11–12 | Code comment (not user-visible) | Stale JSDoc comment — write APIs were added in Slice 4 and Slice 5. | **replace_now_safe** | Update comment to reflect current state. Not user-visible but misleading for developers. | YES (low priority) |
| S-08 | `Per Q-NOTIF-002: Polling Phase 1; WebSocket Phase 2.` + `Required socket event names (not yet confirmed by backend):` | `useCentralInventoryRealtime.js` | 5, 8 | Code comment (not user-visible) | Stale placeholder hook comment. | **false_positive** | Keep — this is a future-scope placeholder. Comment is still accurate for documentation. | NO |

---

## 6. Feature Flag / Mode Logic Findings

| Question | Finding |
|----------|---------|
| Global read-only env flag exists? | **NO** — no `READ_ONLY`, `READONLY_MODE`, `WRITE_DISABLED`, or similar env variable in `.env` or code |
| Hardcoded global flag? | **NO** — no boolean flag controls read-only mode. The stale text is just literal HTML. |
| Environment-driven mode? | **NO** — no `process.env.REACT_APP_READ_ONLY` or equivalent |
| Feature flags per flow? | **NO** — role-based visibility via `screenVisibility.js` handles permissions. No feature flags exist. |
| Separate feature flags needed? | **NO** — existing `canDo()` permission system and `screenVisibility.js` are sufficient. Stale banners just need removal. |

**Conclusion:** There is no feature flag system. The stale messaging is purely hardcoded static HTML from Slice 1 that was never cleaned up.

---

## 7. Recommended Cleanup Strategy

### **Strategy B — Replace with feature-specific status** (recommended)

**Rationale:**

- Strategy A (remove globally) is too aggressive — we shouldn't pretend everything is fully featured.
- Strategy B is the right balance:
  - **Remove** the global "Read-only Mode" header badge (S-01) — factually wrong.
  - **Remove** the "Phase 1 Limited Slice" banner (S-02) — factually wrong.
  - **Replace** the login page footer (S-03) — neutral branding text instead of stale phase label.
  - **Keep** deferred-feature indicators (S-04, S-05, S-06) — Reports "(soon)", Edit Transfer noop are genuinely accurate.
  - **Update** stale developer comment (S-07) — low priority but reduces confusion.

This preserves honest deferred-feature messaging while removing incorrect global read-only labels.

---

## 8. Phase 6 Cleanup Scope Recommendation

### Files to Modify

| # | File | Change | Risk |
|---|------|--------|------|
| 1 | `AppHeader.jsx` | Remove lines 40–43 (the `<div>` containing "Read-only Mode" badge) | LOW — removes static text, no logic affected |
| 2 | `ContextSelector.jsx` | Remove lines 141–144 (the yellow banner div + comment) | LOW — removes static text, no logic affected |
| 3 | `LoginPage.jsx` | Replace line 90 text with `"Central Inventory — MyGenie"` or remove entirely | LOW — cosmetic only |
| 4 | `api.js` | Update JSDoc comment at lines 11–12 to reflect Slice 4+5 write APIs | LOW — comment only |

### What NOT to Touch

| Item | Reason |
|------|--------|
| `screenVisibility.js` `comingSoon: true` on Reports | Reports IS genuinely deferred |
| `Sidebar.jsx` "(soon)" rendering | Correct behavior for deferred nav items |
| `TransferDetail.jsx` edit noop | Edit Transfer API is genuinely unknown |
| `useCentralInventoryRealtime.js` comments | Future-scope documentation, still accurate |
| `screenVisibility.js` permission matrix | Correct — controls role access properly |
| Any write form components | Already correct from Phases 2–4 |

---

## 9. Items Not to Remove

| Item | File | Reason to Keep |
|------|------|---------------|
| Reports "(soon)" | `screenVisibility.js`, `Sidebar.jsx` | Reports screen genuinely not implemented (OI-006) |
| Edit Transfer noop handler | `TransferDetail.jsx` | Edit Transfer API unknown (OI-001) |
| `PermissionDenied` component | `StateDisplays.jsx` | Active role guard for Stock Adjustment (Master/Outlet) |
| `BlockedAction` component | `StateDisplays.jsx` | May be needed for future deferred features |
| `restaurantTypeUnknown` warning badge | `AppHeader.jsx` lines 44–48 | Accurate dev warning when `restaurant_type_flag` missing |
| `isScreenReadOnly()` helper | `screenVisibility.js` | Functional helper used by permission system — not stale |

---

## 10. Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | Removing banner may hide real deferred limitations | LOW | Deferred items (Edit Transfer, Reports) have their own specific "(soon)" / noop handling. No global banner needed. |
| 2 | Owner may expect some status indicator | LOW | Owner explicitly asked "why is this still showing read-only" — clearly wants it removed. |
| 3 | Login page text removal may confuse users | LOW | Replace with neutral branding, not blank. |
| 4 | Developer confusion from stale api.js comment | LOW | Update comment to reflect current state. |
| 5 | Breaking role/permission logic | NONE | No permission logic is being changed. Only static HTML text is removed. |

---

## 11. Recommended Next Agent

**`Central Inventory Slice 5 Phase 6 Polish + Validation + Regression Implementation Agent`**

The stale UI cleanup (S-01, S-02, S-03, S-07) should be included as the first task in Phase 6, which is already scoped for polish and validation. No separate mini-phase needed.

---

## 12. Final Recommendation

**Include cleanup inside Phase 6.** The 4 changes (3 user-visible + 1 developer comment) are minimal, safe, and directly align with Phase 6 scope which already lists SH-9 (banner text update) as approved work. No owner decision required — the owner explicitly flagged this as incorrect.

---

*End of Hardcoded UI Audit*
