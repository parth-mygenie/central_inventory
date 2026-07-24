# Intelligent UI Freeze — Phase 6: E2E Intelligence QA Review

> **Date:** 2026-05-31
> **Agent:** Central Inventory End-to-End Intelligent UI Freeze Agent
> **Scope:** All 24 screens, 10 HTML previews, full stock movement lifecycle
> **Method:** Walk the complete lifecycle 3 times (Central view, Master view, Outlet view), cross-reference against brainstorming docs, API feasibility, known gaps

---

## E2E LIFECYCLE WALK-THROUGH

### Path 1: Outlet requests → Central approves → dispatch → receive

| Step | Screen | Intelligence Present? | Gap Found? |
|------|--------|----|---|
| 1. Outlet opens Hub | A1 | YES — low stock alerts, Next Best Action "Request Stock" | **GAP-QA-01**: Hub doesn't show "last request status" — outlet doesn't know if their previous request is still pending without navigating to Queues |
| 2. Outlet opens Request Stock | B1 | YES — Intelligent PO, own stock, source availability, category | OK |
| 3. Outlet submits request | B1 | YES — validation summary, qty warnings | **GAP-QA-02**: No success confirmation screen showing PO number. After submit, navigates to transfer detail — but user might want a summary "Your request PO-XXXX submitted with 3 items" |
| 4. Central sees in Hub | A1 | YES — "3 stale approvals" Next Best Action, store health grid | OK |
| 5. Central opens Queues | B2 | YES — item-level, requester stock brackets, fulfillment verdict, store health | OK |
| 6. Central opens Detail | B3 | YES — store snapshot, approval impact, dual stock | OK |
| 7. Central approves | B4 (via B3) | YES — FEFO segments, exhaustion alerts | **GAP-QA-03**: No post-approval success state shown in preview. What does the screen look like AFTER approval? Status should update inline. |
| 8. Central dispatches | B5 or B3 | YES — destination needs, FEFO, projection | OK |
| 9. Source selector | B6 | YES — FEFO badge, expiry, remaining | OK |
| 10. Outlet receives | B7 | YES — dispatched vs expected, partial receive, resolution | **GAP-QA-04**: No "expected delivery date" or "time since dispatch" shown in receive dialog. Outlet doesn't know if shipment is late. |
| 11. Both see in Ledger | D3 | YES — movement badges, signed qty, PO ref | OK |
| 12. Stock updated | D1 | YES — levels updated, pending column | OK |

### Path 2: Central proactive dispatch → Outlet receive

| Step | Screen | Intelligence Present? | Gap Found? |
|------|--------|----|---|
| 1. Central sees store health | A1 | YES — DemoFranchise1 "3 out of stock" | OK |
| 2. Central opens Direct Dispatch | B5 | YES — destination needs auto-detect | OK |
| 3. PO auto-generated note | B5 | YES — "PO will be auto-generated for destination" | OK |
| 4. Outlet receives | B7 | YES — dispatched vs expected comparison | **GAP-QA-05**: For UNSOLICITED dispatch (not requested by outlet), the receive dialog doesn't distinguish "you requested this" vs "this was sent to you proactively". Context matters for the receiver. |

### Path 3: Procurement → Stock addition

| Step | Screen | Intelligence Present? | Gap Found? |
|------|--------|----|---|
| 1. Central needs to restock | A1/D1 | YES — low stock visible | OK |
| 2. Upload invoice | C3 | YES — AI extraction, matching | OK |
| 3. Excel upload | C3 | YES — parsing, review-approve | OK |
| 4. Manual entry | C3 | YES — vendor context, price comparison | **GAP-QA-06**: After procurement success — no confirmation showing "X items added, total Rs Y". Also no link back to Stock Inventory to verify levels updated. |

### Path 4: Wastage recording

| Step | Screen | Intelligence Present? | Gap Found? |
|------|--------|----|---|
| 1. Record wastage | C2 | YES — anomaly detection, current stock | OK |
| 2. View in report | C4 | YES — top wasted items, trend | **GAP-QA-07**: No drill-down from wastage report to individual wastage records. "Red Meat — 6 records" but can't see the actual 6 entries. |

### Path 5: Adjustment

| Step | Screen | Intelligence Present? | Gap Found? |
|------|--------|----|---|
| 1. Adjust stock | C1 | YES — impact preview, FEFO, current stock | OK |
| 2. See in ledger | D3 | YES — "Adjustment" badge, reason | **GAP-QA-08**: G-001 (no adjustment history API) means adjustments in the ledger are derived from transfer data, not a dedicated trail. The preview shows them but the data source is fragile. |

---

## CROSS-SCREEN CONSISTENCY CHECK

| Check | Result | Issue? |
|-------|:------:|--------|
| Color palette (red/amber/gray only) across all 10 previews | PASS | Consistent |
| PO-XXXX placeholder used everywhere | PASS | B2, B3, B5, D3, A1 all show PO-XXXX |
| Store names use business terminology (not backend) | PASS | All say "Central Store", "Master Store", "Outlet" |
| Monospace font for quantities consistently | PASS | All numeric values use mono |
| "Days of cover" shown where relevant | PASS | D1, D2, E7, B1 all reference it |
| FEFO recommendation consistent in selectors | PASS | B6, B4, C1, B5 all show FEFO badges |
| Stale/age badges consistent styling | PASS | B2, A1, D4 all use same gray/amber/red aging |
| Role gating noted in previews | PASS | A1 notes "Central sees dispatch, Outlet sees request" |

---

## INTELLIGENCE GAPS FOUND (8 items)

### GAP-QA-01: Hub missing "My Last Request Status" for Outlet/Master

**Screen:** A1 (Operations Hub)
**Issue:** When an Outlet opens the Hub, they see queue counts but NOT the status of their most recent request. They have to navigate to Queues → My Requests tab to check.
**Suggestion:** Add a "Your Latest Request" card on Hub for non-Central roles: "PO-XXXX — Requested 2 days ago — Awaiting Approval"
**Feasibility:** Frontend-only — data from getPendingQueues() → my_requests[0]
**Priority:** Should Have

### GAP-QA-02: No Post-Submit Confirmation Screen

**Screen:** B1 (Request Stock), B5 (Direct Dispatch), C3 (Procurement), C1 (Adjustment), C2 (Wastage)
**Issue:** After successful submission, user navigates away immediately. No "success summary" showing what was just created with PO number.
**Suggestion:** Show a brief success card: "Request PO-XXXX submitted — 3 items, total 1,800 gm. View transfer →"
**Feasibility:** Frontend-only — use API response data
**Priority:** Must Have

### GAP-QA-03: Post-Action State Not Shown

**Screen:** B3 (Transfer Detail) after approval/dispatch/receive
**Issue:** Preview only shows the "Requested" state. What does the screen look like AFTER approval? After dispatch? The intelligence should adapt per status.
**Suggestion:** Create preview variants for: Approved state, Dispatched state, Received state, Cancelled state
**Feasibility:** Preview-only — no code needed
**Priority:** Should Have (for implementation clarity)

### GAP-QA-04: No "Time Since Dispatch" on Receive

**Screen:** B7 (Receive Dialog)
**Issue:** Receiver doesn't see when the shipment was dispatched. "Dispatched 2 hours ago" vs "Dispatched 5 days ago" is important context.
**Suggestion:** Add "Dispatched: 2 hours ago (31 May, 5:23 PM)" at the top of receive dialog
**Feasibility:** Frontend-only — dispatched_at in transfer data
**Priority:** Must Have

### GAP-QA-05: Unsolicited Dispatch Not Distinguished

**Screen:** B7 (Receive Dialog)
**Issue:** When Central proactively dispatches (no prior request), the receive dialog looks identical to a request-based receive. Receiver doesn't know if they asked for this.
**Suggestion:** Badge at top: "Direct Dispatch (not requested by you)" vs "Fulfilling your request PO-XXXX"
**Feasibility:** Frontend-only — check transfer.type === "dispatch" vs "request"
**Priority:** Should Have

### GAP-QA-06: No Post-Procurement Confirmation

**Screen:** C3 (Procurement)
**Issue:** After submitting procurement, no confirmation of what was added. User has to go to Stock Inventory to verify.
**Suggestion:** Success card: "4 items added to stock. Total: Rs 6,410. View Inventory →"
**Feasibility:** Frontend-only
**Priority:** Must Have

### GAP-QA-07: No Wastage Report Drill-Down

**Screen:** C4 (Wastage Report)
**Issue:** Shows "Red Meat — 6 records" but no way to see the individual wastage entries (date, qty, reason, who recorded).
**Suggestion:** Expandable row showing individual records, or click-through to filtered list
**Feasibility:** Data already in API response (wastage_records array)
**Priority:** Should Have

### GAP-QA-08: CSV/PDF Export Missing from All Data Screens

**Screens:** D1 (Inventory), D3 (History), C4 (Wastage Report), E7 (Consumption Report)
**Issue:** No export capability on any data screen. Users need to extract data for reporting/sharing.
**Suggestion:** Add "Export CSV" and "Export PDF" buttons on all table-based screens
**Feasibility:** Frontend-only (CSV), needs library for PDF (jsPDF or similar)
**Priority:** Should Have — was OI-007 in original backlog

---

## MISSING INTELLIGENCE ELEMENTS (not in any preview)

| # | Element | Screens Affected | Why It Matters | Priority |
|---|---------|-----------------|----------------|:--------:|
| MI-01 | **Notification/alert bell** — unread count badge in header | All | User doesn't know about new approvals/receives without opening each screen | Should Have (G-011 for real-time, but polling feasible) |
| MI-02 | **Keyboard shortcuts** — Enter to submit, Escape to cancel | All write forms | Speed for power users | Could Have |
| MI-03 | **Undo/rollback guidance** — "Made a mistake? Here's how to fix it" | C1, C2, B5 | Adjustment/wastage cannot be undone. No guidance on what to do if wrong entry | Must Have |
| MI-04 | **Multi-store comparison view** — side-by-side stock of 2+ stores | D1 | Currently single-store only (CR-016 planned but not in previews) | Defer (CR-016) |
| MI-05 | **Print-friendly view** — for physical dispatch notes / receive confirmations | B3, B7 | Warehouse staff may need printed dispatch list | Should Have |
| MI-06 | **Batch/expiry scan** — across ALL items, not just per-item in D2 | D1 or new screen | "Show me everything expiring in the next 7 days" across all items | Must Have |
| MI-07 | **Transfer SLA tracking** — "Average request-to-receive: 3.2 days" | A1 or D3 | Operational KPI — how fast is the supply chain? | Should Have |

---

## FINAL VIEWPOINT

### What's Strong (Genuinely Impressive)

1. **Intelligent PO (B1) + Auto-Detect Needs (B5)** — This is the single biggest UX upgrade. Transforms stock ordering from "manual guesswork" to "system suggests, user confirms." This alone justifies the redesign.

2. **Requester Store Health on Approval (B2+B3)** — The Central Store seeing the full stock picture of the requesting store is a game-changer for approval decisions. The brackets `(has 0)` in B2 are clean and information-dense.

3. **3-Mode Procurement (C3)** — Invoice AI + Excel + Manual covers every real-world scenario. The matching confidence (exact/fuzzy/none) with traffic-light is practical.

4. **Operations Hub as Command Center (A1)** — Next Best Actions + Store Health Grid gives the Central Store a single screen to see the entire hierarchy's health. This is what was missing entirely.

5. **Consistent 3-color palette** — Red (problem), amber (caution), neutral gray. Clean, professional, not noisy. Good design discipline.

### What Needs Attention Before Implementation

1. **Post-action confirmation (GAP-QA-02)** is a MUST FIX. Every write action needs a success screen. Without it, users don't trust the action completed.

2. **Time-since-dispatch on receive (GAP-QA-04)** — simple to add, important context.

3. **Undo guidance (MI-03)** — "This cannot be undone" is shown for adjustment, but what if user makes a mistake? Need a "If you entered wrong data, create a reverse adjustment" guidance.

4. **Batch expiry scan (MI-06)** — "What's expiring this week across ALL items" is a daily operational need. D2 shows per-item expiry but there's no cross-item expiry dashboard.

5. **G-013 (PO number)** remains the highest-priority backend gap. Every screen references PO-XXXX. Until backend delivers this, the entire intelligence layer feels incomplete because users can't reference transfers by a real identifier.

### What Can Be Deferred

- MI-02 (keyboard shortcuts) — nice to have, not critical
- MI-04 (multi-store comparison) — already planned as CR-016
- GAP-QA-03 (multi-state previews) — implementation team can derive from the approved "Requested" preview
- MI-07 (SLA tracking) — good KPI but needs historical data accumulation

### Implementation Recommendation

**Phase the implementation into 3 sprints:**

1. **Sprint A (Foundation):** Hub (A1) + Inventory Summary (D1) + Stock Detail (D2) — these are read-only intelligence that establishes the "intelligence layer" users see first
2. **Sprint B (Transfer Flow):** Request (B1) + Queues (B2) + Detail (B3) + Dispatch (B5) + Modals (B6-B8) — the core operational workflow
3. **Sprint C (Operations):** Procurement (C3) + Adjustment (C1) + Wastage (C2+C4) + Config (E1-E8) + History (D3) — supporting flows

---

## QA VERDICT

**24 screens reviewed. 8 gaps found. 7 missing intelligence elements identified. 3 are Must Have, 5 are Should Have.**

The intelligence layer is **comprehensive and well-designed**. The gaps found are incremental improvements, not architectural misses. The core innovation — Intelligent PO, Store Health visibility, FEFO recommendations, anomaly detection — is solid and covers the primary operational workflows.

**Recommendation: Proceed to Phase 7 (Final Freeze) after addressing the 3 Must-Have gaps (GAP-QA-02, GAP-QA-04, MI-03).**
