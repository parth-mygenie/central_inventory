# CR-023 Artifact 4 — Code Gate

> **Date:** 2026-06-01
> **CR:** CR-023
> **Author:** E1
> **Status:** COMPLETE — Approved for implementation

---

## 1. Pre-Implementation Checklist

| # | Gate Check | Status |
|---|-----------|:------:|
| 1 | CR registered in registry.json? | DONE — CR-023 |
| 2 | Artifact 0 (Session-Start) complete? | DONE |
| 3 | Artifact 1 (Intake) — all 18 bugs documented with API evidence? | DONE |
| 4 | Artifact 2 (Impact Analysis) — all files mapped with risk? | DONE |
| 5 | Artifact 3 (Implementation Plan) — execution order defined? | DONE |
| 6 | Seed data in place for testing? | DONE — 158 ChocolateHut items, stock, transfers |
| 7 | Test credentials documented? | DONE — `/app/memory/test_credentials.md` |
| 8 | Rollback plan defined? | DONE — all changes additive, conditional rendering |
| 9 | No backend/API contract changes required? | CONFIRMED — frontend-only changes |
| 10 | `api.js` modifications needed? | NONE — all API methods already exist |

---

## 2. Execution Rules

### Rule 1: Owner Smoke Test is MANDATORY after every batch

```
Batch N Implementation → Agent Testing → Screenshot Evidence → Owner Smoke Test → APPROVE/REJECT
                                                                      ↓
                                                              If REJECT → fix before next batch
                                                              If APPROVE → proceed to Batch N+1
```

**No batch may begin until the previous batch has owner approval.**

### Rule 2: Each batch deliverable

After each batch the agent MUST provide:
1. **Screenshot(s)** of the changed screen(s) with real data
2. **Summary** of what changed (files, lines, bugs fixed)
3. **Explicit ask** for owner smoke test approval

### Rule 3: Regression guard

After Batch 3 and Batch 6, run testing agent for regression across ALL previously completed batches.

### Rule 4: No scope creep

Only fix the 18 documented bugs. No "while I'm here" improvements. Any new issue found during implementation gets logged as a separate bug, not fixed inline.

---

## 3. Batch Sign-Off Tracker

| Batch | Scope | Bugs | Owner Smoke Test | Status |
|:-----:|-------|------|:----------------:|:------:|
| **1** | `useRestaurantMap` + OperationsHub Store Health Grid | A1, B1 | AWAITING OWNER | COMPLETE |
| **2** | Restaurant names on PendingQueues, TransferDetail, HistoryLedger | B2, B3, B4 | AWAITING OWNER | COMPLETE |
| **3** | TransferDetail Store Snapshot + Impact Summary | C1 | AWAITING OWNER | COMPLETE |
| **4** | Consumption intelligence + DirectDispatch auto-detect | B9, C2 | AWAITING OWNER | COMPLETE |
| **5** | ReceiveDialog + ApproveWaveDialog FEFO + HierarchySummary health | C3, C4, B5 | AWAITING OWNER | COMPLETE |
| **6** | Catalogues + HierarchyMgmt + DisputeDialog + SourceSelector | B6, B7, B8, B11, C5, C6 | AWAITING OWNER | COMPLETE |

---

## 4. Smoke Test Instructions for Owner

### Batch 1 — Store Health Grid
```
1. Login as Central (abhishek@kalabahia.com / Qplazm@10)
2. Operations Hub should show "STORE HEALTH ACROSS HIERARCHY" section
3. Each store card should show: store name, X out / Y low badges, health status
4. Compare against preview: A1_operations_hub.html (Store Health section)
```

### Batch 2 — Restaurant Names
```
1. Go to Pending Queues → approval cards should show real store names (not "—" or "Store #781")
2. Click into a transfer → From/To should show real names
3. Go to History & Ledger → From/To columns should show real names
```

### Batch 3 — TransferDetail Intelligence
```
1. Go to Pending Queues → click a "requested" transfer
2. Below From/To cards: should see "REQUESTER STORE SNAPSHOT" table with stock levels, OUT/LOW badges
3. Below that: "APPROVAL IMPACT ON YOUR STOCK" table with Your Stock / After Approval columns
4. Compare against preview: B3_transfer_detail.html
```

### Batch 4 — Consumption + Dispatch
```
1. Go to Consumption Report → should see Current Stock, Days of Cover, Trend columns
2. Go to Direct Dispatch → select a destination → should see "WHAT THIS STORE NEEDS" table
3. Compare against previews: E_configuration.html (E7 section), B5_direct_dispatch.html
```

### Batch 5 — Dialogs + HierarchySummary
```
1. Open a dispatched transfer as Outlet → Receive → should see "Dispatched: X, Requested: Y" per line
2. Open Approve dialog → segment picker should show FEFO badges, auto-select nearest expiry
3. Go to Hierarchy Summary → should see OUT / LOW / ADEQUATE health columns per store
```

### Batch 6 — Catalogues + Polish
```
1. Go to Ingredients → should see "Used in Recipes" column
2. Go to Products → "Has Recipe" column should show actual data
3. Go to Store Management → should see Push Status (Synced/Stale) column
4. Open Dispute Resolution → Accept/Reject cards should show impact explanation
5. Source Selector → should show "X remaining" after selection
```

---

## 5. Approval

### Gate Decision: **APPROVED — Proceed to Batch 1 Implementation**

**Conditions:**
- All 6 pre-implementation checks passed
- Execution rules agreed (owner smoke test mandatory per batch)
- Rollback plan in place (additive changes, conditional rendering)
- No backend changes required

---

*Implementation begins with Batch 1. Owner smoke test required before proceeding to Batch 2.*
