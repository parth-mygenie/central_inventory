# Intelligent UI Freeze — Phase 2: Flow B Transfer Lifecycle
# Screen-by-Screen Intelligence Brainstorming

> **Date:** 2026-05-31
> **Status:** OWNER APPROVED — All 61 items marked MUST HAVE. Phase down to implementation phases will happen after screen previews.
> **Flow:** B — Transfer Lifecycle (Request → Approve → Dispatch → Receive)
> **Screens:** 10 (B1-B10)
> **Constraint:** Zero code changes. Planning only.

---

## B1 — REQUEST STOCK FORM (`RequestStockForm.jsx`, 387 lines, Slice 4+5)

**Business stage:** Request initiation (child → parent)
**Roles:** Master, Outlet
**User decision:** "What do I need, how much, from which source?"
**Current capabilities:** 3-step flow (sources → catalog → items), source availability hint, cross-branch warning, quantity validation

### Mistakes / Delays / Confusion Possible
- Requesting items already well-stocked locally
- Requesting more than source has available
- Duplicate request (same items already requested and pending)
- Wrong source selected (sibling vs parent)
- No visibility into pending incoming stock
- No consumption-based quantity suggestion

### Intelligence Elements

| # | Intelligence Element | Priority | Feasibility | Data Source |
|---|---------------------|----------|-------------|------------|
| B1-01 | **Own stock visibility per item** — Show "You currently have X" next to each item row | Must Have | Frontend + existing API | `getStockInventory()` on mount, match by `stock_title` |
| B1-02 | **Pending incoming badge** — "X already on the way" for items with dispatched/approved transfers incoming | Should Have | Needs API verification | `getPendingQueues()` → `receive_pending` items, match by title |
| B1-03 | **Duplicate request warning** — "You already have a pending request for this item" | Must Have | Possible with existing API | `getPendingQueues()` → `my_requests`, match by item |
| B1-04 | **Source stock level display** — Current source availability beyond the hint | Should Have | Already partially exists | `requestCatalog()` returns `available_display_qty` — enhance visibility |
| B1-05 | **Consumption-based suggestion** — "Based on daily usage of X, suggest requesting Y" | Could Have | Needs API verification | `getDailyConsumptionReport()` for avg consumption → derive days-of-stock |
| B1-06 | **Last request context** — "Last requested this item on [date], qty [X]" | Could Have | Possible with existing API | `getTransferHistory()` filtered by item + type=request |
| B1-07 | **Empty form guidance** — Contextual helper text explaining the 3-step flow | Must Have | Frontend-only | Static text, no API needed |
| B1-08 | **Quantity exceeds source warning** — Soft warning when qty > available at source | Must Have | Already available | Compare qty against `available_display_qty` from catalog |
| B1-09 | **Zero quantity blocker** — Disable submit + explain when qty is 0 or negative | Must Have | Frontend-only | Already partially exists (allValid check) — enhance UX messaging |
| B1-10 | **Mandatory field indicators** — Visual * markers + error state for empty required fields | Must Have | Frontend-only | Enhance existing validation |

### Frontend Validation Rules

| Rule | Current State | Intelligence Upgrade |
|------|--------------|---------------------|
| Item must be selected | Exists (allValid) | Add per-row red border + "Select an item" message |
| Quantity > 0 | Exists (allValid) | Add "Enter a quantity greater than 0" inline |
| Quantity format valid | Exists (validateQuantityForUnit) | Already good — keep |
| Source must be selected | Exists (implicit) | Add disabled state explanation if no sources |
| Duplicate item in same request | **MISSING** | Warn "Item already added in row X" |
| Quantity > source available | **MISSING** | Soft warning (yellow), not blocker |

---

## B2 — PENDING QUEUES (`PendingQueues.jsx`, 269 lines, Slice 2)

**Business stage:** Operational inbox
**Roles:** All (tabs vary by role)
**User decision:** "What's urgent? What to action first?"
**Current capabilities:** 4 tabs (Approval, Receive, My Requests, Ready to Dispatch), basic table with status badge + timestamp + item count

### Mistakes / Delays / Confusion Possible
- All items look equally urgent — no priority
- Stale requests sit unnoticed for days
- User doesn't know which approval has stock-risk impact
- No quick-action — must navigate to detail for every action
- Can't distinguish "routine restock" from "urgent need"

### Intelligence Elements

| # | Intelligence Element | Priority | Feasibility | Data Source |
|---|---------------------|----------|-------------|------------|
| B2-01 | **Age badges** — "2h ago", "3 days ago" with color escalation (green→yellow→red) | Must Have | Frontend-only | Calculate from `created_at` timestamp already in data |
| B2-02 | **Stale request warning** — Highlight requests older than 24h in approval queue | Must Have | Frontend-only | Same — threshold comparison |
| B2-03 | **Item preview** — Show first 2-3 item names inline without navigating to detail | Should Have | Possible with existing API | Data may already include items in queue response; verify |
| B2-04 | **Priority sorting** — Sort by age (oldest first) as default, with toggle for newest | Should Have | Frontend-only | Client-side sort on `created_at` |
| B2-05 | **Destination urgency signal** — For approval queue: "Outlet has 0 of this item" | Could Have | Needs API call | Would need `getHierarchyDetail()` per destination — expensive; defer |
| B2-06 | **Quick-action buttons** — "Approve" / "Receive" directly from queue row | Should Have | Frontend-only | Render inline buttons that trigger same handlers as TransferDetail |
| B2-07 | **Tab badge counts** — Show count in tab label: "Approval (5)" | Must Have | Frontend-only | Already computed — just render in tab trigger |
| B2-08 | **Empty state guidance** — Role-specific: "No pending approvals. Outlets haven't requested stock yet." | Must Have | Frontend-only | Conditional on restaurantType |
| B2-09 | **Ready to Dispatch highlight** — Visual distinction for approved transfers ready to dispatch | Should Have | Frontend-only | Already filtered — add visual emphasis |
| B2-10 | **Auto-refresh indicator** — "Last refreshed 2m ago" with manual refresh button | Should Have | Frontend-only | Track fetch timestamp, show relative time |

### Frontend Validation Rules
- N/A (read-only screen). Intelligence is in display/sorting/filtering.

---

## B3 — TRANSFER DETAIL (`TransferDetail.jsx`, 658 lines, Slice 2+4)

**Business stage:** Central action screen for all transfer lifecycle stages
**Roles:** All
**User decision:** Context-dependent — approve? dispatch? receive? reject? amend?
**Current capabilities:** Full header (from/to, status, type), line items with P16 qty breakdown, status timeline, action buttons, linked modifications, resolution/dispute info

### Mistakes / Delays / Confusion Possible
- Approving without knowing source stock impact
- Dispatching when source stock is insufficient (will fail at API)
- Receiving without checking for damage/discrepancy
- Not understanding what each action does (especially partial approve, cancel remainder)
- Missing linked modification requests
- Not knowing age of the transfer

### Intelligence Elements

| # | Intelligence Element | Priority | Feasibility | Data Source |
|---|---------------------|----------|-------------|------------|
| B3-01 | **Approval impact summary** — "Approving will commit X qty from source. Source will have Y remaining." | Must Have | Needs API call | `getSourceOptions()` for each line item at source restaurant |
| B3-02 | **Source stock warning** — Red badge on lines where source has < requested qty | Must Have | Same as above | Compare line qty vs source available |
| B3-03 | **Transfer age display** — "Created 3 days ago" with urgency color | Must Have | Frontend-only | Calculate from `created_at` |
| B3-04 | **Action explanation tooltips** — "Partial Approve: approve some items, hold others for later" | Must Have | Frontend-only | Static tooltip text per action |
| B3-05 | **Destination current stock** — For each line, show "Destination currently has X of this item" | Should Have | Needs API call | `getHierarchyDetail()` for destination store |
| B3-06 | **Post-action projection** — "After dispatch, source will have X. Destination will have Y." | Should Have | Computed | source_current - dispatch_qty, destination_current + dispatch_qty |
| B3-07 | **Linked modifications panel** — Expand existing linked mods with status + summary | Should Have | Already exists | `linkedMods` state already fetched — enhance display |
| B3-08 | **Disabled action explanation** — When no actions available: "This transfer is in [status]. No actions available." or "You're the destination — only source can approve." | Must Have | Frontend-only | Based on `actions.length === 0` + role + status |
| B3-09 | **Line-level FEFO hint** — Show segment batch/expiry info on dispatched lines | Could Have | Needs API verification | `meta_json.dispatch` may contain segment info |
| B3-10 | **Receive readiness check** — Before receive dialog: count items, show "X items to receive, total Y units" | Should Have | Frontend-only | Compute from lines data |
| B3-11 | **Status timeline enhancement** — Add relative timestamps ("2 days between request and approval") | Should Have | Frontend-only | Diff between timeline event timestamps |

### Frontend Validation Rules

| Rule | Current State | Intelligence Upgrade |
|------|--------------|---------------------|
| Action button disabled when submitting | Exists | Already good |
| Confirm dialog before destructive actions | Exists | Add impact preview to confirm text |
| Reason required for reject/cancel | Exists (ReasonDialog) | Add minimum character guidance |

---

## B4 — APPROVE WAVE DIALOG (`ApproveWaveDialog.jsx`, 247 lines, Slice 4)

**Business stage:** Partial approval with segment selection
**Roles:** Central, Master (source side)
**User decision:** "How much of each item to approve? Which segment to allocate from?"
**Current capabilities:** Per-line qty entry, segment picker (loads from source-options), hold/approve toggle, remainder policy

### Intelligence Elements

| # | Intelligence Element | Priority | Feasibility | Data Source |
|---|---------------------|----------|-------------|------------|
| B4-01 | **Available stock per segment** — Already shows — enhance with FEFO badge: "expires in 3 days" | Must Have | Data already available | `segments[].expiry_date` from source-options |
| B4-02 | **Auto-select FEFO segment** — Pre-select the soonest-expiry segment as default | Should Have | Frontend-only | Sort segments by expiry ascending, pre-select first |
| B4-03 | **Over-approve warning** — "Approving X will leave only Y remaining for other orders" | Should Have | Computed | source segment qty - approved qty |
| B4-04 | **Approve-all shortcut** — "Approve max available for all lines" button | Should Have | Frontend-only | Set each line's approvedQty to min(holdQty, segment available) |
| B4-05 | **Segment exhaustion alert** — "This segment has only X left — not enough for full approval" | Must Have | Frontend-only | Compare approvedQty against segment's display_qty |
| B4-06 | **Hold policy explanation** — Inline text: "Hold: remaining qty stays pending. Cancel: removes remainder." | Must Have | Frontend-only | Static helper text |

### Frontend Validation Rules

| Rule | Current State | Intelligence Upgrade |
|------|--------------|---------------------|
| approvedQty <= holdQty | Exists (Math.min) | Show "Max approvable: X" label |
| Segment must be selected for included lines | Exists (includedLines check) | Add "Select a segment" warning per line |
| At least one line must be included | Exists | Add "Select at least one item to approve" message |

---

## B5 — DIRECT DISPATCH FORM (`DirectDispatchForm.jsx`, 197 lines, Slice 4)

**Business stage:** Dispatch initiation (parent → child)
**Roles:** Central, Master
**User decision:** "How much to send, to whom, from which batch?"
**Current capabilities:** Destination picker, item picker, quantity input, source selector per row

### Intelligence Elements

| # | Intelligence Element | Priority | Feasibility | Data Source |
|---|---------------------|----------|-------------|------------|
| B5-01 | **Destination current stock** — Show "Destination has X of this item" per row | Must Have | Needs API call | `getHierarchyDetail({ storeRestaurantId: destination })` |
| B5-02 | **Destination low-stock highlight** — Badge destinations that have low-stock items | Should Have | Same API | Filter destination stock for `is_low_stock` |
| B5-03 | **Source post-dispatch projection** — "After this dispatch, you'll have X remaining" | Must Have | Computed | current_source_qty - sum(dispatch_qty for this item) |
| B5-04 | **Duplicate dispatch detection** — "You already dispatched this item to this destination today" | Should Have | Possible with API | `getTransferHistory({ status: 'dispatched' })` for today + destination match |
| B5-05 | **FEFO recommendation in source selector** — Highlight soonest-expiry segment | Must Have | Already in SourceSelector | Enhance visual prominence of expiry info |
| B5-06 | **Quantity exceeds available warning** — Block submit when qty > source segment available | Must Have | Frontend-only | Compare qty vs selected segment's display_qty |
| B5-07 | **Empty destination list explanation** — "No stores in your hierarchy to dispatch to" | Must Have | Frontend-only | Conditional on destinations.length === 0 |

### Frontend Validation Rules

| Rule | Current State | Intelligence Upgrade |
|------|--------------|---------------------|
| Destination must be selected | Exists (implicit) | Add "Select a destination" prompt |
| At least 1 item row | Exists | Add guidance |
| Quantity > 0 | Exists (implicit) | Add inline validation message |
| Source segment selected | Partial (SourceSelector) | Add "Select source batch before submitting" |
| Qty <= segment available | **MISSING** | Block submit + red warning |
| Duplicate item in same dispatch | **MISSING** | Warn "Item already added in row X" |

---

## B6 — SOURCE SELECTOR (`SourceSelector.jsx`, 193 lines, Slice 5)

**Business stage:** Segment selection during dispatch/adjustment/wastage
**Roles:** Central, Master (varies by context)
**User decision:** "Which batch/segment should stock come from?"

### Intelligence Elements

| # | Intelligence Element | Priority | Feasibility | Data Source |
|---|---------------------|----------|-------------|------------|
| B6-01 | **FEFO priority badge** — Green "FEFO Recommended" on soonest-expiry segment | Must Have | Frontend-only | Sort by expiry_date ascending, badge first non-expired |
| B6-02 | **Near-expiry warning** — Yellow/red badge: "Expires in 3 days" / "Expires tomorrow" | Must Have | Frontend-only | Compute diff between expiry_date and today |
| B6-03 | **Expired segment block** — Grey out expired segments with "Expired" badge | Must Have | Frontend-only | Compare expiry_date < today |
| B6-04 | **Remaining after selection** — "Selecting X leaves Y in this segment" | Should Have | Frontend-only | segment.display_qty - selected_qty |
| B6-05 | **Segment quantity display enhancement** — Larger, more prominent qty display | Should Have | Frontend-only | UI styling |
| B6-06 | **Empty segment explanation** — "No stock available. Add stock via procurement." | Must Have | Frontend-only | When segments.length === 0 |

---

## B7 — RECEIVE DIALOG (`ReceiveDialog.jsx`, 197 lines, Slice 4)

**Business stage:** Stock receipt confirmation
**Roles:** All (destination side)
**User decision:** "Accept all? Partial? What resolution for rejected items?"

### Intelligence Elements

| # | Intelligence Element | Priority | Feasibility | Data Source |
|---|---------------------|----------|-------------|------------|
| B7-01 | **Dispatched vs expected comparison** — Show line-level: "Dispatched: X, Expected (requested): Y" | Must Have | Already in data | `dispatchedDisplayTotal` vs `requestedDisplayQty` |
| B7-02 | **Discrepancy highlight** — If dispatched != requested, show yellow warning badge | Must Have | Frontend-only | Computed comparison |
| B7-03 | **Post-receive stock projection** — "After receiving, your stock of [item] will be X" | Should Have | Needs own stock data | `getStockInventory()` for current + accepted_qty |
| B7-04 | **Resolution type explanation** — Inline help: "Damaged = written off. Return to Source = goes back." | Must Have | Frontend-only | Static helper text |
| B7-05 | **Partial receive validation summary** — "Accepting X of Y total. Rejecting Z." | Must Have | Frontend-only | Computed from lineData |
| B7-06 | **Reason quality guidance** — "Please describe the issue clearly (min 10 characters)" | Must Have | Frontend-only | Enhance existing min-length check with contextual guidance |
| B7-07 | **Full receive confirmation** — "You are confirming receipt of all X items in full" before submit | Should Have | Frontend-only | Confirmation step for full receive |

### Frontend Validation Rules

| Rule | Current State | Intelligence Upgrade |
|------|--------------|---------------------|
| accepted + rejected = dispatched | Exists (auto-calculated) | Show explicit equation display |
| Resolution type required for rejected | Exists | Add inline explanation per type |
| Reason >= 10 chars for rejected | Exists | Show character counter + guidance |

---

## B8 — DISPUTE RESOLUTION DIALOG (`DisputeResolutionDialog.jsx`, 128 lines, Slice 4)

**Business stage:** Dispute resolution (source resolves destination's issue report)
**Roles:** Source side
**User decision:** "Accept the issue or reject it?"

### Intelligence Elements

| # | Intelligence Element | Priority | Feasibility | Data Source |
|---|---------------------|----------|-------------|------------|
| B8-01 | **Issue summary display** — Show what was reported: resolution type + reason | Must Have | Already in transfer data | `resolution_meta.reason`, `resolution_type` |
| B8-02 | **Impact explanation** — "Accepting: stock will be adjusted. Rejecting: transfer reverts to dispatched." | Must Have | Frontend-only | Static help text |
| B8-03 | **Note guidance** — "Provide context for your decision (recommended)" | Should Have | Frontend-only | Placeholder text |

---

## CROSS-SCREEN INTELLIGENCE (Flow B Global)

| # | Intelligence Element | Priority | Feasibility | Screens Affected |
|---|---------------------|----------|-------------|-----------------|
| BX-01 | **Transfer lifecycle breadcrumb** — "Request → Approved → Dispatched → [You are here]" visual in TransferDetail | Should Have | Frontend-only | B3 |
| BX-02 | **Role-aware action CTA** — Hub shows most relevant action: "5 transfers awaiting your approval" (for Central), "3 items to receive" (for Outlet) | Must Have | Frontend-only | A1, B2 |
| BX-03 | **Cross-reference index** — From any transfer, link to related transfers (same item, same stores, same period) | Could Have | Needs API | B3 — would need history filtered by item |
| BX-04 | **Consistent empty states** — Every empty list has role-specific guidance on what to do next | Must Have | Frontend-only | All B screens |
| BX-05 | **Loading skeleton consistency** — All screens use same skeleton pattern during load | Should Have | Frontend-only | All B screens |
| BX-06 | **Error retry with context** — "Failed to load. This might be a network issue. Retry?" | Must Have | Frontend-only | All B screens |

---

## API FEASIBILITY SUMMARY (Flow B)

| Feasibility | Count | Notes |
|-------------|:-----:|-------|
| **Frontend-only (no API needed)** | 38 | Age badges, FEFO badges, validation, helper text, empty states, projections |
| **Possible with existing API** | 14 | Own stock from getStockInventory, pending from queues, history for duplicates |
| **Needs API verification** | 6 | Destination stock in dispatch, consumption-based suggestions |
| **Backend gap (blocked)** | 0 | No Flow B items are hard-blocked by backend gaps |
| **Defer** | 3 | Cross-reference index, destination urgency in queues, consumption forecast |

---

## OWNER DECISIONS — RECORDED 2026-05-31

**Owner decision: ALL MUST HAVE across all screens.**

Screen-by-screen walkthrough completed. Owner approved all 61 elements as Must Have.

Note: Phasing down to implementation sprints will happen after Phase 4 (screen previews). Owner wants to see actual screens before deciding what to defer to later phases.

**Proceeding to:** Phase 3 — API Feasibility Verification for all 61 items.

---

*End of Phase 2 — Flow B Transfer Lifecycle Intelligence Brainstorming.*
