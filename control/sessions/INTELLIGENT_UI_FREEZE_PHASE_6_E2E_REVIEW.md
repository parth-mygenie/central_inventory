# Intelligent UI Freeze — Phase 6: End-to-End Intelligence Review

> **Date:** 2026-05-31
> **Status:** REVIEW COMPLETE
> **Method:** Walk every stock movement lifecycle path, trace intelligence handoffs screen-to-screen, flag gaps/inconsistencies/missing items

---

## LIFECYCLE 1: Request → Approve → Dispatch → Receive (Core Flow)

**Scenario:** DemoFranchise1 (Outlet) is out of Red Meat. Central Store fulfills it.

### Step-by-step trace:

| Step | Actor | Screen | Intelligence Present | Handoff to Next | Gap Found? |
|------|-------|--------|---------------------|----------------|:----------:|
| 1. Outlet opens app | Outlet | **A1 Hub** | Low stock alert: "1 Low Stock Item — Red Meat 0 gm". Next Best Action: "Request stock — you're out of Red Meat" | CTA → B1 Request Stock | **GAP-E2E-01**: Hub for Outlet doesn't show "Suggest Request" as Next Best Action. Current preview is Central-only view. Need Outlet-specific Hub. |
| 2. Outlet requests stock | Outlet | **B1 Request Stock** | Intelligent PO shows Red Meat at 0 gm (OUT), auto-suggests 500 gm (gap to min). Source availability: 1,250 gm at Central. | Submit → transfer created → navigates to B3 or B2 | OK — intelligence covers this well |
| 3. Central sees request | Central | **A1 Hub** | Next Best Action: "3 approval requests stale (>24h)". Store Health Grid: DemoFranchise1 red with "3 out of stock". | CTA → B2 Pending Queues | OK |
| 4. Central reviews queue | Central | **B2 Pending Queues** | Card shows: Red Meat 500 gm (has 0), fulfillment verdict "Can fulfill", age badge, store health strip, Approve button | Click Approve → triggers approval API | OK |
| 5. Central reviews detail | Central | **B3 Transfer Detail** | Store snapshot (full inventory of requester), approval impact (1,250 → 750 after), action explanations | Approve All → status changes to "approved" | OK |
| 6. Central dispatches | Central | **B3** (Dispatch button) | Opens dispatch with source selector | B6 Source Selector → FEFO recommended | **GAP-E2E-02**: After approval, B3 shows "Dispatch" button. But there's no intelligence showing "which segment to dispatch from" BEFORE clicking Dispatch. The source selector (B6) only appears inside the dispatch action. Consider: pre-fetch source-options and show "Recommended segment: #42, 800 gm, exp Jun 15" on B3 before the user clicks Dispatch. |
| 7. Source selection | Central | **B6 Source Selector** | FEFO recommended, expiry badges, expired blocked, remaining after selection | Confirm → dispatch executes | OK |
| 8. Outlet receives notification | Outlet | **A1 Hub** | "1 Pending Receive" card. Today's Activity: "Dispatched: Red Meat +500 gm from Central" | Click → B2 Pending Queues → Receive tab | **GAP-E2E-03**: Outlet Hub doesn't show "You have incoming stock" as a Next Best Action banner. Only a count card. Should be more prominent — "500 gm Red Meat dispatched to you. Receive now." |
| 9. Outlet receives | Outlet | **B7 Receive Dialog** | Dispatched vs expected comparison, partial receive option, resolution explanations, post-receive projection | Submit → stock credited to outlet | OK |
| 10. Both check ledger | Both | **D3 History/Ledger** | Movement badges (Transfer In/Out), PO number, signed qty, From/To with store type | — | **GAP-E2E-04**: After receive, the user navigates BACK to Hub or Ledger manually. There's no "success screen" or "post-receive summary" showing "Your Red Meat is now 500 gm. Next: check other low items?" |
| 11. Both check inventory | Both | **D1 Stock Inventory** | Updated quantities, days of cover, expiry risk | — | OK |

### Lifecycle 1 Gaps Found: 3

---

## LIFECYCLE 2: Direct Dispatch (Central proactive, no request)

**Scenario:** Central sees DemoFranchise1 is struggling and proactively dispatches.

| Step | Actor | Screen | Intelligence Present | Gap Found? |
|------|-------|--------|---------------------|:----------:|
| 1. Central sees store in trouble | Central | **A1 Hub** | Store Health Grid: DemoFranchise1 "3 out of stock" with red border | OK |
| 2. Central dispatches | Central | **B5 Direct Dispatch** | Destination needs auto-detect, FEFO segments, post-dispatch projection, PO auto-gen note | **GAP-E2E-05**: No link FROM Hub's Store Health Grid TO Direct Dispatch pre-filled with that store. User has to navigate to B5 and re-select the destination manually. Should have "Dispatch to this store →" action on the store card. |
| 3-5. Same as Lifecycle 1 steps 8-11 | — | — | — | Same gaps |

### Lifecycle 2 Gaps Found: 1

---

## LIFECYCLE 3: Partial Receive + Dispute

**Scenario:** Outlet receives 500 gm Red Meat but 100 gm is damaged.

| Step | Actor | Screen | Intelligence Present | Gap Found? |
|------|-------|--------|---------------------|:----------:|
| 1. Outlet receives partially | Outlet | **B7 Receive** | Partial receive toggle, accepted 400 + rejected 100, resolution type "Damaged" with explanation, char counter | OK |
| 2. Central sees dispute | Central | **B3 Transfer Detail** | Status: "receive_dispute_pending", dispute card with issue summary | **GAP-E2E-06**: After partial receive, the transfer status changes but Central has no proactive notification. Should appear in Hub's Next Best Action: "Dispute pending on PO-XXXX — DemoFranchise1 reported 100 gm damaged." |
| 3. Central resolves | Central | **B8 Dispute** | Accept vs Reject impact cards, issue summary | OK |
| 4. Ledger reflects | Both | **D3 History** | Should show partial receive + damage resolution | **GAP-E2E-07**: Ledger shows "Transfer In" for the full amount but doesn't show the partial nature. Need "Partial Receive: 400 accepted, 100 damaged/written off" as a distinct movement type or annotation. |

### Lifecycle 3 Gaps Found: 2

---

## LIFECYCLE 4: Procurement (Vendor Purchase)

**Scenario:** Central buys stock from vendor via invoice upload.

| Step | Actor | Screen | Intelligence Present | Gap Found? |
|------|-------|--------|---------------------|:----------:|
| 1. Central needs to procure | Central | **A1 Hub** | Low stock card: "Maida <1 day cover". Quick Action: "Add Stock (Vendor)" | OK |
| 2. Upload invoice | Central | **C3 Procurement** | Invoice extraction, matching, price comparison, template download | OK |
| 3. Review + approve | Central | **C3** | Review table, validation, grand total vs invoice total | OK |
| 4. Check inventory | Central | **D1 Stock Inventory** | Updated quantities | **GAP-E2E-08**: After procurement submit, no confirmation screen showing "Added: Cooking Oil +10 ltr, Maida +20 kg. New totals: ..." User returns to Hub blindly. |
| 5. Check ledger | Central | **D3 History** | — | **GAP-E2E-09**: Procurement/add-stock doesn't appear in the current ledger as a movement type. The `deriveLedgerEntries()` function only handles transfers, adjustments, and wastage. Procurement (add-stock) is a gap in the ledger. |

### Lifecycle 4 Gaps Found: 2

---

## LIFECYCLE 5: Wastage + Adjustment

**Scenario:** Central records expired Red Meat and adjusts Cooking Oil for counting error.

| Step | Actor | Screen | Intelligence Present | Gap Found? |
|------|-------|--------|---------------------|:----------:|
| 1. Record wastage | Central | **C2 Wastage Entry** | Current stock, anomaly detection, post-wastage projection | OK |
| 2. Adjust stock | Central | **C1 Adjustment** | Impact preview, FEFO segment, "cannot be undone" | OK |
| 3. Check wastage report | Central | **C4 Wastage Report** | Top wasted items, trend vs average | OK |
| 4. Check ledger | Central | **D3 History** | Wastage badge, Adjustment badge in movement list | OK |
| 5. Check inventory | Central | **D1 Stock Inventory** | Updated quantities | OK |

### Lifecycle 5 Gaps Found: 0

---

## LIFECYCLE 6: Catalogue Push

**Scenario:** Central adds a new ingredient and pushes to stores.

| Step | Actor | Screen | Intelligence Present | Gap Found? |
|------|-------|--------|---------------------|:----------:|
| 1. Add ingredient | Central | **E3 Catalogue** | "0 recipes" / "Not pushed" warning | OK |
| 2. Push to stores | Central | **E8 Hierarchy** | Push status, "Stale — 2 items behind" | OK |
| 3. Outlet sees new item | Outlet | **D1 Inventory** | New item appears with 0 stock | **GAP-E2E-10**: After push, there's no notification to the Outlet that new items were pushed. Outlet discovers them passively. Should Hub show "2 new items added to your catalogue by Central" |

### Lifecycle 6 Gaps Found: 1

---

## CROSS-SCREEN CONSISTENCY CHECK

| Check | Status | Finding |
|-------|:------:|---------|
| PO number appears on ALL relevant screens | **GAP** | PO-XXXX placeholder used. G-013 backend gap. Once implemented, must appear on: B2 cards, B3 header, B5 success, D3 ledger rows, A1 activity feed. **6 screens need PO.** |
| 3-color palette consistent | OK | Red (problem) + amber (caution) + neutral gray — consistent across all 10 previews |
| Store health format consistent | OK | Same "X out · Y low · Z adequate" format on A1, B2, B3 |
| Age badge format consistent | OK | Same relative time format on B2, B3, D4, E2, E8 |
| Requester stock bracket format consistent | OK | `(has 0)` format used on B2 only (where approved) |
| FEFO badge format consistent | OK | Same "expires in X days" format on B6, D2, C1 |
| Movement badges consistent | OK | Same Transfer In/Out/Adjustment/Wastage badges on D3, A1 activity |
| Empty states role-specific | **PARTIAL** | B2 has role-specific empty state. Other screens use generic "No data". |
| Terminology inversion respected | OK | All previews use business terms (Central/Master/Outlet), never raw API terms |

---

## GAPS SUMMARY

| ID | Gap | Severity | Lifecycle | Fix Type |
|----|-----|:--------:|:---------:|----------|
| **E2E-01** | Outlet Hub missing "Suggest Request" NBA | MEDIUM | L1 | Add Outlet-specific Next Best Actions to A1 |
| **E2E-02** | B3 lacks pre-fetched dispatch segment recommendation | LOW | L1 | Pre-fetch source-options on B3 for approved transfers |
| **E2E-03** | Outlet Hub missing prominent "incoming stock" NBA | MEDIUM | L1 | Add "X dispatched to you — Receive now" banner to A1 |
| **E2E-04** | No post-receive success summary | LOW | L1 | Add success state: "Red Meat now 500 gm. Check other items?" |
| **E2E-05** | No link from Hub Store Health Grid → Direct Dispatch pre-filled | MEDIUM | L2 | Add "Dispatch to this store" action on store cards in A1 |
| **E2E-06** | Central Hub missing dispute NBA | MEDIUM | L3 | Add "Dispute pending on PO-XXXX" to Central's NBAs |
| **E2E-07** | Ledger doesn't show partial receive details | LOW | L3 | Add "Partial Receive" movement type with accepted/rejected breakdown |
| **E2E-08** | No post-procurement confirmation screen | LOW | L4 | Add success summary after procurement submit |
| **E2E-09** | Procurement/add-stock missing from ledger | MEDIUM | L4 | Add "Stock Addition" movement type to deriveLedgerEntries() |
| **E2E-10** | No push notification to outlets | LOW | L6 | Add "New items pushed by Central" to Outlet Hub |

**Total gaps: 10**
- Severity MEDIUM: 5
- Severity LOW: 5
- All are frontend-fixable (no new backend gaps)

---

## RECOMMENDATIONS

### Must Fix Before Implementation

| # | Fix | Screens Affected |
|---|-----|-----------------|
| 1 | **Role-specific Hub** — A1 needs 3 variants: Central (current), Master, Outlet. Each with relevant NBAs. | A1 |
| 2 | **Procurement in Ledger** — Add "Stock Addition" to D3's deriveLedgerEntries() | D3 |
| 3 | **Dispute NBA** — Add dispute pending to Central Hub's Next Best Actions | A1 |
| 4 | **Hub → Dispatch link** — Store Health Grid cards should have "Dispatch to this store" action | A1 → B5 |

### Should Fix (Nice to Have)

| # | Fix | Screens Affected |
|---|-----|-----------------|
| 5 | Post-receive success summary | B7 → new success state |
| 6 | Post-procurement success summary | C3 → new success state |
| 7 | Pre-fetched segment recommendation on B3 | B3 |
| 8 | Partial receive detail in ledger | D3 |
| 9 | Push notification to outlets | A1 (Outlet view) |
| 10 | Role-specific empty states on all screens | All screens |

---

## VERDICT

**The intelligence layer is coherent across the full lifecycle.** The 10 gaps found are all refinements — no fundamental design conflicts or missing screens. The core flow (request → approve → dispatch → receive → ledger) has end-to-end intelligence coverage. The main structural gap is that the Operations Hub (A1) needs role-specific variants for Master and Outlet — the current preview only shows the Central Store view.

**Phase 6: COMPLETE. Ready for Phase 7 (Final Freeze Document).**
