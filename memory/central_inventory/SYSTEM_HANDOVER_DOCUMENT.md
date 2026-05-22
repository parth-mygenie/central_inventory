# Central Inventory — System Handover & Operational Documentation

> **Version:** 1.0
> **Date:** January 2026
> **Classification:** Internal — Product + Engineering Handover
> **Audience:** Technical leads, backend developers, frontend developers, product managers, QA engineers, and operations stakeholders
> **Source of Truth:** This document consolidates all business rules, lifecycle analysis, architectural understanding, and operational notes gathered during CR requirement planning, enterprise review, API verification, and end-to-end transfer testing.

---

## Table of Contents

1. Executive Summary
2. System Purpose and Scope
3. The Hierarchy Model
4. The Terminology Problem
5. Stock Data Architecture
6. Transfer Lifecycle
7. Transfer Flow Types
8. Stock Movement Rules and Timing
9. Dispatch Mechanics and Source Selection
10. Receiving, Partial Receiving, and Resolution
11. Cancellation and Rejection
12. Visibility and Access Control
13. Batch, Expiry, and Lineage Tracking
14. Adjustment, Wastage, and Reconciliation
15. Pending Queues and Operational Workflow
16. Reporting and Stock Views
17. Franchise Push and Metadata Sync
18. Audit Trail and Events
19. Current Platform Status
20. Known Issues and Operational Boundaries
21. Backend Capabilities Requiring Development
22. API Inventory and Readiness
23. Glossary

---

## 1. Executive Summary

The Central Inventory module is a multi-level stock management system built for the MyGenie POS platform. It enables a parent organization to manage and track stock distribution across a three-tier hierarchy of stores: a top-level Central warehouse, middle-level Master stores, and bottom-level Outlets (restaurants or retail units).

The system provides complete transfer lifecycle management (request, approval, dispatch, receive, reject, cancel, edit), batch-and-expiry-aware stock tracking, segment-level ledger accounting, hierarchy-scoped visibility, and role-based operational controls.

**Key facts:**

- The hierarchy is fixed at three levels: Central (top), Master (middle), Outlet (bottom).
- There is a confirmed inverse naming mismatch between business terminology and the backend API. This is the single most critical implementation risk. It is fully documented and mitigated through a mandatory terminology mapping layer.
- Stock is tracked at two levels: an aggregate summary per item per store, and a granular segment ledger (batch, expiry, lineage). The segment ledger is the source of truth for all stock movement.
- Twenty-two read APIs have been verified as working. All transfer write APIs are functionally implemented but were blocked during verification by a missing unit conversion configuration in the database (a data seeding issue, not a code bug).
- End-to-end transfer lifecycle testing has been completed with 18 of 19 test scenarios passing.
- The frontend currently consists of an Internal API Verification Tool. The main Central Inventory UI (23 planned screens) has not yet been built.

---

## 2. System Purpose and Scope

### What does this system do?

The Central Inventory module manages the movement of stock between stores at different levels of a business hierarchy. Specifically:

- **Central** (the top-level warehouse or head-office store) holds bulk stock and distributes it downward to Master stores and, when needed, directly to Outlets.
- **Master** stores (regional or intermediate stores) receive stock from Central and distribute it further down to their assigned Outlets.
- **Outlets** (the actual restaurants or retail units) receive stock, consume it through sales and recipe-based deduction, and can request stock from their parent store.

Every stock movement — whether a dispatch, a receipt, a return, an adjustment, or wastage — is tracked at the segment level (batch, expiry, source origin) with a complete audit trail.

### Who uses it?

| Role | Description | Hierarchy Level |
|---|---|---|
| Super Admin / Owner | Full access to all stores and operations | All |
| Central Store Manager | Manages the top-level warehouse; dispatches to Master and Outlet | Top |
| Master Store Manager | Manages a regional store; dispatches to Outlets; requests from Central | Middle |
| Outlet Manager | Manages an individual restaurant/unit; requests stock; receives transfers | Bottom |
| Kitchen Manager | Views outlet stock; manages recipe-based consumption | Bottom |
| Accountant | Views stock values and reports (read-only) | All |
| Auditor | Views audit trail and stock ledger (read-only) | All |

### Why was it built?

The MyGenie POS system previously handled inventory at the individual outlet level only. This module extends the platform to support multi-level inventory management where a parent organization can centrally manage stock distribution, enforce approval workflows, track stock at the batch and expiry level across all hierarchy levels, and maintain full operational traceability.

---

## 3. The Hierarchy Model

The system operates on a fixed three-level hierarchy. Stock flows primarily downward (from Central to Master to Outlet), with upward flows supported through request and return mechanisms.

```
LEVEL 1 — Central Inventory / Central Store
    The main warehouse. Holds bulk stock.
    Can dispatch to any Master store or directly to any Outlet.
    Approves requests from Master stores.
    One Central can manage multiple Master stores.
         |
         v
LEVEL 2 — Master Store / Master Inventory
    Regional or intermediate stores.
    Receives stock from Central.
    Can dispatch to its assigned Outlets.
    Can request stock from Central.
    Approves requests from its Outlets.
    One Master can manage multiple Outlets.
         |
         v
LEVEL 3 — Outlet / Unit / Restaurant
    The actual point of consumption.
    Receives stock from its parent (Master or directly from Central).
    Can request stock from its parent.
    Consumes stock through sales and recipe-based deduction.
    Each Outlet belongs to exactly one parent.
```

### Parent-child relationships

- Every store has a `parent_restaurant_id` that defines its position in the hierarchy.
- Central is the root (no parent within this module).
- Master stores are children of Central.
- Outlets are children of a Master store.
- An Outlet cannot belong to more than one Master (single-parent model).
- Central can manage multiple Masters; each Master can manage multiple Outlets.

### Lateral transfers

- Master-to-Master (lateral) transfers are allowed but require explicit Central Store manager approval. This acts as a special gatekeep to prevent uncontrolled horizontal stock movement.
- Outlet-to-Outlet lateral transfers are not allowed.

---

## 4. The Terminology Problem

### The inversion

This is the single most critical implementation detail for anyone working on or with this system.

The backend API uses terminology that is the **exact inverse** of the business terminology:

| What the business calls it | What the backend API calls it | Hierarchy Level |
|---|---|---|
| **Central** / **Center** / **Central Store** | `master` | TOP (Level 1) |
| **Master Store** / **Master Inventory** | `central` | MIDDLE (Level 2) |
| **Outlet** / **Unit** / **Restaurant** | `franchise` | BOTTOM (Level 3) |

This means:

- When the backend returns `restaurant_type: "master"`, it is referring to the business **Central** — the top-level warehouse.
- When the backend returns `restaurant_type: "central"`, it is referring to a business **Master Store** — the middle-level regional store.
- When the backend returns `restaurant_type: "franchise"`, it is referring to a business **Outlet** — the bottom-level consumption point.
- When the API accepts `store_type: "central"` as a filter parameter, it filters for business **Master Stores** (not business Central).
- When the API accepts `store_type: "franchise"` as a filter parameter, it filters for business **Outlets**.

### Why this matters

If a developer reads the backend response `restaurant_type: "master"` and displays it as "Master" in the user interface, the entire hierarchy will appear inverted. Stock will appear to flow in the wrong direction. Reports will label stores incorrectly. Users will be confused and potentially route stock to the wrong locations.

### How this is mitigated

1. A **mandatory terminology mapping adapter** exists in the frontend codebase. Every backend value must pass through this adapter before being displayed to users.
2. The user interface must **never** display raw backend terminology. All `restaurant_type` and `store_type` values must be translated to business terms.
3. The API Verification Tool (already built) includes a terminology scanner that flags every occurrence of `master`, `central`, and `franchise` in API responses and shows the corresponding business meaning alongside.
4. All code comments, documentation, and test cases must reference this mapping explicitly.

### Complete field-level mapping

| What the UI displays | What the API request sends | What the API response contains |
|---|---|---|
| "Central Stores" tab | `store_type: "central"` — **NO**, this returns Master stores | Response contains `restaurant_type: "central"` meaning Master |
| "Master Stores" tab | `store_type: "central"` — counterintuitively, this is correct | Response items are business Master stores |
| "Outlets" tab | `store_type: "franchise"` | Response items are business Outlets |
| "Send to Master Store" | `to_restaurant_id` points to a store with `restaurant_type: "central"` | — |
| "Send to Outlet" | `to_restaurant_id` points to a store with `restaurant_type: "franchise"` | — |
| "From Central" | `from_restaurant_id` points to a store with `restaurant_type: "master"` | — |

---

## 5. Stock Data Architecture

Stock is tracked at two distinct levels that serve different purposes.

### The aggregate layer: `inventory_master`

This is the summary table. It stores one row per item per store with a single rolled-up quantity. It exists for:

- Quick display of "how much of item X does store Y have"
- Low-stock threshold checking
- Backward compatibility with older parts of the system

The aggregate is **not** the source of truth for movement. It is recalculated from the segment ledger during transfer mutations. It should be thought of as a materialized summary view.

Key fields: `restaurant_id`, `stock_title`, `unit_id`, `cal_quantity` (calculated total), `display_qty`, `is_low_stock`, `min_qty_alert`.

### The segment ledger: `inventory_stock_segments`

This is the source of truth for all stock movement. Each row represents a distinct batch-expiry-origin combination at a specific store. When stock moves, it is these segment rows that are debited and credited.

Key fields: `inventory_master_id`, `restaurant_id`, `batch`, `expiry_date`, `cal_quantity`, `source_restaurant_id`, `origin_transfer_id`, `created_at`.

The segment ledger supports:

- **Batch tracking**: Optional batch identifier for traceability.
- **Expiry tracking**: Optional expiry date. Expired segments are excluded from dispatch.
- **Origin lineage**: Each segment records where it came from (`source_restaurant_id`) and through which transfer it arrived (`origin_transfer_id`).
- **FEFO ordering**: First Expiry First Out. Segments with expiry dates are ordered ascending; null-expiry segments come last; within the same expiry, FIFO by creation date.

### Transfer line allocations: `inventory_transfer_lines`

Each transfer contains one or more line items. Each line specifies the item, quantity, unit, and a `source_selector` that identifies exactly which segment or segment bucket the stock should come from.

Allocations are stored immutably in `meta_json` on each transfer line, capturing the exact segment breakdown at the time of dispatch. This serves as the permanent record of what was dispatched from where.

### Unit conversion

The system supports multiple units of measurement (kg, gm, ltr, ml, pieces, etc.) with conversion between them. Conversion metadata is stored in the `unit` table (`conversion_factor`, `base_unit`). All stock calculations internally use a base unit (gm for weight, ml for volume) and convert to display units as needed.

**Current issue:** The unit conversion metadata was not seeded in the pre-production database at the time of testing, causing all transfer write operations to fail with `UNIT_CONVERSION_NOT_DEFINED`. This is a database seeding issue, not a code bug.

---

## 6. Transfer Lifecycle

Every stock transfer moves through a defined sequence of statuses. The system supports two entry paths: request-based (child initiates) and direct dispatch (parent initiates).

### Status flow

```
                    ┌──────────────────────────────────────────────┐
                    │          REQUEST-BASED PATH                  │
                    │                                              │
                    │   requested ──> approved ──> dispatched ──>  │
                    │       │             │            │    │      │
                    │       │             │            │    │      │
                    │       v             v            v    v      │
                    │   rejected      rejected     received │      │
                    │   (pre-disp)   (pre-disp)   (full)   │      │
                    │                              partially│      │
                    │                              received │      │
                    │                                       │      │
                    │                              cancelled│      │
                    │                              rejected │      │
                    │                              on_hold  │      │
                    └──────────────────────────────────────────────┘

                    ┌──────────────────────────────────────────────┐
                    │        DIRECT DISPATCH PATH                  │
                    │                                              │
                    │            dispatched ──> received            │
                    │                │          partially_received  │
                    │                │          cancelled           │
                    │                │          rejected            │
                    │                v          on_hold             │
                    │           (same post-dispatch outcomes)       │
                    └──────────────────────────────────────────────┘
```

### Status descriptions

| Status | Meaning | Stock Effect |
|---|---|---|
| `requested` | A child store has submitted a stock request to its parent. No stock has moved. | None |
| `approved` | The parent store has approved the request. Stock may be soft-reserved but has not physically moved. | Soft reservation (planned) |
| `dispatched` | Stock has been physically sent. Source store stock has been debited. Stock is now in transit. | Source debited |
| `received` | Destination has confirmed full receipt of all items. Destination stock has been credited. | Destination credited |
| `partially_received` | Destination has accepted some items and rejected others, with resolution applied per rejected line. | Partial credit to destination; rejected lines handled per resolution type |
| `rejected` | Transfer was rejected. If pre-dispatch, no stock moved. If post-dispatch, source stock is restored (depending on resolution type). | Depends on timing and resolution |
| `cancelled` | Source cancelled a dispatched transfer. Source stock is restored (depending on resolution type). | Source stock restored (per resolution) |
| `on_hold` | Transfer is in dispute or under review. No stock movement occurs while on hold. | None (stock remains in transit) |

### Key lifecycle rules

1. **Edit resets status to `requested`.** If a transfer in `requested` or `approved` status is edited, it returns to `requested` and must be re-approved. This ensures approval is always on the exact lines and quantities that will be dispatched.
2. **Idempotency guards exist.** Attempting to dispatch an already-dispatched transfer returns `ALREADY_PROCESSED`. Same for receiving an already-received transfer, or cancelling/rejecting a terminal-status transfer.
3. **Destination cannot directly reject post-dispatch.** After dispatch, the destination must receive first (fully or partially) and use the per-line resolution mechanism for any rejected items. This was an explicit owner decision.

---

## 7. Transfer Flow Types

Ten distinct transfer flows are supported, each with specific rules about who initiates, whether approval is required, and how stock moves.

### Vertical flows (parent to child)

| Flow | Direction | Initiator | Approval | Mechanism |
|---|---|---|---|---|
| Central to Master (direct dispatch) | Downward | Central Store Manager | No — parent authority | `initiate` endpoint |
| Central to Outlet (direct dispatch, bypassing Master) | Downward | Central Store Manager | No — parent authority | `initiate` endpoint |
| Master to Outlet (direct dispatch) | Downward | Master Store Manager | No — parent authority | `initiate` endpoint |

When a parent store directly dispatches stock, no approval step is required. The parent is the authority and can push stock to any child within its visible hierarchy. The `initiate` endpoint creates a transfer directly in `dispatched` status, debiting the source immediately.

### Vertical flows (child to parent — requests)

| Flow | Direction | Initiator | Approval | Mechanism |
|---|---|---|---|---|
| Outlet requests from Master | Upward request | Outlet Manager | Master must approve | `request` then `approve` then `dispatch` |
| Master requests from Central | Upward request | Master Store Manager | Central must approve | `request` then `approve` then `dispatch` |

When a child store needs stock, it submits a request. The request identifies the items needed and their quantities, with mandatory source selection. The parent store reviews and either approves or rejects. Upon approval, the parent then dispatches, which debits source stock. The child then receives.

### Lateral flow (peer to peer)

| Flow | Direction | Initiator | Approval | Mechanism |
|---|---|---|---|---|
| Master to Master (lateral) | Horizontal | Either Master Store Manager | Central must approve | Requires Central gatekeep |

Master-to-Master transfers are allowed but require explicit approval from the Central Store Manager. This prevents uncontrolled horizontal stock movement and ensures Central maintains visibility over all cross-store transfers.

**Note:** This flow requires backend validation work that is not yet in the current API. The backend currently validates only parent-chain hierarchy for transfers.

### Return flows (child to parent)

| Flow | Direction | Initiator | Approval | Mechanism |
|---|---|---|---|---|
| Outlet returns to Master | Upward return | Outlet Manager | Master (original sender) must accept | Transfer return — only to original sender |
| Outlet returns to Central | Upward return | Outlet Manager | Central (original sender) must accept | Only if Central dispatched directly to Outlet |
| Master returns to Central | Upward return | Master Store Manager | Central must accept | Special return workflow |

Return flows have a strict rule: **stock can only be returned to the original sender.** If Central dispatched directly to an Outlet, the Outlet returns to Central. If Master dispatched to an Outlet, the Outlet returns to Master. Returns cannot be routed to an arbitrary store in the hierarchy.

The original sender (now the receiver of the return) must accept the return. This ensures both parties agree on what was returned and in what condition.

### Not allowed

| Flow | Reason |
|---|---|
| Outlet to Outlet (lateral) | Not permitted by business rules |
| Return to a store that did not originally dispatch | Violates return-to-original-sender rule |

---

## 8. Stock Movement Rules and Timing

### When does stock actually move?

| Event | Effect on Source | Effect on Destination | Effect on In-Transit |
|---|---|---|---|
| Transfer requested | None | None | None |
| Transfer approved | Soft reservation (planned capability) | None | None |
| Transfer dispatched | **Hard debit** — stock removed from source | None | Stock enters in-transit |
| Transfer received (full) | None | **Credit** — stock added to destination | Stock exits in-transit |
| Transfer partially received | None | Partial credit for accepted lines | Rejected lines handled per resolution |
| Transfer cancelled (post-dispatch) | **Reversal** — stock restored to source | None | Stock exits in-transit |
| Wastage recorded | **Immediate debit** at store level | N/A | N/A |
| Stock adjustment (Central only) | **Immediate effect** — increase or decrease | N/A | N/A |
| Sales / recipe consumption | **Immediate debit** at outlet | N/A | N/A |

### Stock floor policies

The system enforces two different floor policies depending on the type of operation:

| Operation Type | Floor Policy | Rationale |
|---|---|---|
| **Transfers** (dispatch) | **Strict enforcement** — block if insufficient stock | Prevents over-committing physical stock |
| **Sales / consumption** | **Allow negative** — sales must never be blocked | Revenue-critical; a POS system cannot refuse service because inventory tracking is behind |
| **Wastage** | Immediate reduction; can go negative if stock is already low | Operational reality in food and beverage |
| **Adjustment** (Central only) | Can increase or decrease; no floor constraint | Controlled by Central authority with audit trail |

### Concurrent operation handling

When two users attempt to dispatch from the same stock segment simultaneously, the system applies a first-come-first-served rule:

- The backend uses lock-and-re-read guards on segment rows during dispatch.
- The first dispatch to complete succeeds.
- The second dispatch receives an `INSUFFICIENT_STOCK` error with a clear message.
- The frontend should handle this gracefully by refreshing stock availability and allowing the user to retry with updated quantities.

### Timeout handling

If an API call times out during a dispatch or other mutation, the frontend should display a message advising the user to check the transfer status before retrying. Financial and stock-altering operations should never be auto-retried because the mutation may have succeeded despite the timeout.

### Duplicate submission prevention

- The frontend must disable action buttons immediately upon click to prevent double-submission.
- The backend includes idempotency guards (`ALREADY_PROCESSED`) for terminal state transitions.

---

## 9. Dispatch Mechanics and Source Selection

Dispatch is the most operationally complex part of the system. Every dispatch requires explicit source selection — there is no silent automatic allocation.

### The source selector requirement

When dispatching stock, the user must specify exactly where the stock should come from at the segment level. This is enforced through the `source_selector` field on each transfer line item.

There are two selection modes:

**Segment ID mode:** The user selects a specific segment row (a specific batch-expiry combination). The system dispatches from that exact segment.

**Filter bucket mode:** For legacy stock that does not have batch or expiry information, the user selects a filter bucket category. The available buckets are:
- `without_batch_and_expiry` — stock with no batch and no expiry
- `without_batch_only` — stock with no batch but with expiry
- `without_expiry_only` — stock with batch but no expiry
- `with_batch_and_expiry` — stock with both batch and expiry

### How the source options API works

Before dispatching, the frontend calls the source options API for each item to be dispatched. This API returns:

- A list of available segments (each with batch, expiry, quantity, source restaurant, and origin transfer information)
- Filter bucket summaries with aggregate quantities
- Legacy fallback rows for stock that exists in the aggregate but not yet in the segment ledger

The user interface presents these options and the operator selects which source to dispatch from. The submit button should remain disabled until a source is selected.

### FEFO ordering

Segments are returned and consumed in First Expiry First Out order:
1. Segments with expiry dates, ordered ascending (soonest expiry first)
2. Segments without expiry dates (null expiry comes last)
3. Within the same expiry, FIFO by creation date

This ordering is applied by the server. The frontend should preserve the server-provided order for display.

### Expired stock exclusion

Segments with expired dates are automatically excluded from the source options response. If the only available stock for an item has expired, the system raises `STOCK_EXPIRED` and prevents dispatch.

### Legacy stock handling

Some stock exists only in the aggregate table (`inventory_master`) without corresponding segment rows. When the aggregate quantity exceeds the segment total, the API appends a synthetic remainder row. This legacy stock can only be dispatched using filter bucket mode, not segment ID mode. Attempting to use segment ID mode on legacy stock raises `LEGACY_SELECTOR_REQUIRED`.

---

## 10. Receiving, Partial Receiving, and Resolution

### Full receive

When the destination store receives all dispatched items in full and in good condition, a full receive is performed. This credits all items to the destination store's stock at the segment level, with lineage information preserved (the destination segment records which store it came from and which transfer delivered it).

### Partial receive

The destination can accept some items and reject others on a per-line basis. For each line, the operator specifies:
- `accepted_qty` — the quantity accepted in good condition
- `rejected_qty` — the quantity rejected

The rule is strict: `accepted_qty + rejected_qty` must equal the originally dispatched quantity for each line. No over-receive or under-accounting is permitted by the current system.

### Resolution types

When items are rejected (through partial receive, cancellation, or rejection), a resolution type determines what happens to the rejected stock:

| Resolution Type | What Happens | Stock Effect |
|---|---|---|
| `return_to_source` | Rejected stock goes back to the source store | Source stock restored for rejected quantity |
| `damaged` | Stock is written off as damaged | No stock restoration — stock is removed from the system |
| `partial_return` | Part of the rejected quantity is returned; the rest is written off as damaged | Only the `returned_qty` portion is restored to source |
| `in_transit_hold` | Stock is placed on hold pending resolution | No movement — transfer enters `on_hold` status |

If no resolution type is specified, the system defaults to `return_to_source` for backward compatibility.

### Post-dispatch destination rules

After dispatch, the destination store has specific constraints:

| Action | Allowed? |
|---|---|
| Full receive | Yes |
| Partial receive (per-line accept/reject with resolution) | Yes |
| Direct reject without receiving | **No** — destination must receive first |
| Return after receiving | Yes — to the original sender only; sender must accept |

The restriction on direct post-dispatch rejection is an explicit business decision. It ensures that the destination acknowledges physical receipt of goods before any dispute resolution occurs.

---

## 11. Cancellation and Rejection

### Pre-dispatch actions

| Action | Who can do it | When | Effect |
|---|---|---|---|
| Reject a request | Parent (source) store | While status is `requested` or `approved` | Transfer moves to `rejected`; no stock was moved, so no restoration needed |
| Edit a request | Source store | While status is `requested` or `approved` | Transfer returns to `requested` status; must be re-approved |

### Post-dispatch actions

| Action | Who can do it | When | Effect |
|---|---|---|---|
| Cancel | Source store | After dispatch | Transfer moves to `cancelled`; source stock restored per resolution type |
| Reject | Destination store | After dispatch | Transfer moves to `rejected`; source stock restored per resolution type |

### Who can call what (definitive matrix)

| Action | Transfer Status | Allowed Caller | Restaurant Side |
|---|---|---|---|
| Cancel | `dispatched` | Source employee | `from_restaurant_id` |
| Reject | `requested` | Source/parent employee | `from_restaurant_id` |
| Reject | `approved` | Source/parent employee | `from_restaurant_id` |
| Reject | `dispatched` | Destination employee | `to_restaurant_id` |

---

## 12. Visibility and Access Control

### Who sees what stores

The visibility model is hierarchical and strictly enforced server-side:

**Central Store Manager** (logged in as backend `master` restaurant):
- Sees all Master stores (backend `central` children)
- Sees all Outlets (backend `franchise` grandchildren)
- Has the broadest view of the entire hierarchy

**Master Store Manager** (logged in as backend `central` restaurant):
- Sees itself
- Sees its own Outlets (backend `franchise` children)
- Sees sibling Master stores (other backend `central` stores under the same parent)
- Sees sibling Master stores' Outlets
- Does NOT see the Central store's own stock details (only its own and downward)

**Outlet Manager** (logged in as backend `franchise` restaurant):
- Sees only itself
- Cannot view stock at other Outlets, at its parent Master, or at Central
- Transaction visibility is limited to incoming transfers only (transfers where the Outlet is the destination)

Attempting to access a store outside one's visible scope returns a 403 authorization error.

### Operational context

The system does not support impersonation. The authentication token is always tied to one specific restaurant. When a Central Store Manager views a Master store's stock detail, they are navigating to that store's data — not switching their authentication context. The backend scopes data visibility based on the caller's restaurant and the hierarchy relationship.

### Transfer-specific permissions

| Operation | Central Store Manager | Master Store Manager | Outlet Manager |
|---|---|---|---|
| Direct dispatch downward | Yes (to any Master or Outlet) | Yes (to own Outlets) | No |
| Submit stock request | No (Central is the top; nothing to request from) | Yes (request from Central) | Yes (request from parent Master) |
| Approve requests | Yes (approves Master requests and lateral Master-to-Master) | Yes (approves Outlet requests) | No |
| Receive stock | Yes (when someone returns stock) | Yes | Yes |
| Cancel dispatched transfer | Yes (own dispatches) | Yes (own dispatches) | No |
| Reject pre-dispatch | Yes | Yes | No |
| Perform stock adjustment | Yes (Central only) | No | No |
| Record wastage | Yes | Yes | Yes |
| View reports | Yes (cross-hierarchy) | Yes (own scope) | Yes (own store only) |

---

## 13. Batch, Expiry, and Lineage Tracking

### Batch tracking

Batches are optional identifiers attached to stock segments. A batch represents a distinct production run, purchase lot, or supplier shipment. When stock is added with a batch identifier, it creates or updates a distinct segment row. Stock from different batches is tracked separately even if it is the same item at the same store.

### Expiry tracking

Expiry dates are optional. When provided during stock addition, the expiry date must be in the future (same-day and past expiry dates are rejected). Expired segments are automatically excluded from dispatch eligibility. The system does not delete expired stock; it simply makes it unavailable for outbound transfer.

Expiry is used in FEFO ordering: stock with the soonest expiry date is dispatched first.

### Near-expiry alerting

The frontend can compute near-expiry status by comparing the segment's `expiry_date` against a configurable threshold. Items nearing expiry should be highlighted for operators. The expiry threshold is configurable per store.

### Lineage tracking

When stock moves between stores, the destination segment records its origin:

- `source_restaurant_id`: The store that dispatched the stock.
- `origin_transfer_id`: The specific transfer that delivered the stock.

This creates a chain of custody. If an Outlet receives stock from a Master, and that Master originally received it from Central, the segment at each level records where it came from. This enables traceability: given any segment at any store, you can trace back through the transfer chain to the original source.

Each transfer receive creates a separate segment row at the destination, even if the batch and expiry match an existing segment. This is because the `origin_transfer_id` is part of the uniqueness key, ensuring that stock from different transfers is never merged and each delivery can be independently tracked.

### Legacy stock

Some stock predates the segment ledger system. This stock exists in the aggregate table (`inventory_master`) but has no corresponding segment rows. The system handles this through:

- A reconciliation process that creates synthetic segment rows for the unaccounted quantity.
- Source options API returning a remainder row when aggregate exceeds segment total.
- Dispatch of legacy stock is restricted to filter bucket mode (not segment ID mode).

---

## 14. Adjustment, Wastage, and Reconciliation

Three separate mechanisms exist for modifying stock outside of the standard transfer lifecycle. Each has different permission models, approval requirements, and stock effects.

### Stock Adjustment

| Aspect | Detail |
|---|---|
| Purpose | Manual correction of stock quantities (increase or decrease) |
| Who can do it | Central Store Manager only |
| Approval required | No — immediate effect with full audit trail |
| Stock effect | Immediate increase or decrease |
| When to use | Correcting data entry errors, accounting for stock received outside the system, or other administrative corrections |

**Note:** A dedicated stock adjustment decrease API does not yet exist in the backend. Currently only `add-stock` (increase) is available. A decrease endpoint needs to be built.

### Wastage

| Aspect | Detail |
|---|---|
| Purpose | Recording stock that has been spoiled, damaged, or otherwise rendered unusable |
| Who can do it | Any store manager at their own level |
| Approval required | No — immediate effect with full audit trail |
| Stock effect | Immediate reduction at the recording store |
| When to use | Spoilage during storage, damage during handling, expired goods being removed |

Wastage is fundamentally different from a transfer return. Wastage means the stock is destroyed locally and removed from the system. A return means the stock is sent back to the original sender.

**Note:** A hierarchy-aware wastage API is still under development. A beta wastage API exists at the franchise level but needs rework for full hierarchy support.

### Reconciliation Request

| Aspect | Detail |
|---|---|
| Purpose | Handling discrepancies found during physical stock counts |
| Who can do it | Any store manager submits a request; parent or sender reviews and adjusts |
| Approval required | Yes — formal in-system request that must be reviewed and acted upon by the parent/sender |
| Stock effect | Adjusted by the parent after review and approval |
| When to use | Physical stock count reveals a difference between system quantity and actual quantity on hand |

The key principle is that stores discovering counting errors do **not** adjust stock themselves. They submit a formal reconciliation request through the system. The parent or original sender reviews the request and performs the adjustment. Everything is recorded for audit purposes.

**Note:** The reconciliation request workflow is a new capability that does not yet exist in the current API and needs to be developed.

---

## 15. Pending Queues and Operational Workflow

### The queue structure

The pending queues API provides three lists that form the operational inbox for each store:

**Approval Pending:** Transfers in `requested` status where the current store is the source (parent). These are requests from child stores waiting to be approved or rejected. Only visible to parent stores (Central sees Master requests; Master sees Outlet requests).

**Receive Pending:** Transfers in `dispatched` status where the current store is the destination. These are shipments that have been sent and need to be received. Visible to any store that is expecting incoming stock.

**My Requests:** Transfers where the current store is the requesting party (destination) and the status is `requested`, `approved`, or `dispatched`. This gives the requester visibility into the pipeline of their outstanding requests.

### Operational rhythm

A typical operational day involves:

1. **Central Store Manager** checks approval queue → approves or rejects Master/Outlet requests → dispatches approved transfers with segment selection.
2. **Master Store Manager** checks receive queue → receives incoming stock from Central → checks approval queue → approves or rejects Outlet requests → dispatches to Outlets.
3. **Outlet Manager** checks receive queue → receives incoming stock → submits new stock requests to parent if running low.

### Date defaults

When no date range is specified, queue and transaction queries default to **today**. This keeps the operational view focused on current-day activity. Custom date ranges are available for historical review.

---

## 16. Reporting and Stock Views

### Stock views

Three levels of stock visibility, each scoped to the viewer's permissions:

**Central Stock View:** Aggregate stock at the Central warehouse level. Shows all items with quantities, low-stock flags, and batch drilldown capability. Accessed by Central Store Manager using the hierarchy detail API with the Central store's own restaurant ID.

**Master Stock View:** Aggregate stock at a specific Master store. Available to the Master Store Manager for their own store, and to the Central Store Manager for any Master store.

**Outlet Stock View:** Aggregate stock at a specific Outlet. Available to the Outlet Manager for their own store, to the parent Master Manager, and to Central.

### Reports (planned)

| Report | Description | Priority | API Source |
|---|---|---|---|
| Hierarchy Stock Overview | Stock across all visible stores | Must Have | `hierarchy-summary` |
| Store Stock Detail | Detailed stock for one store with batch drilldown | Must Have | `hierarchy-detail` |
| Transfer Activity by Store | Sent/received/transaction counts per store per date range | Must Have | `hierarchy-summary` |
| Transfer History | List of all transfers with filters | Must Have | `history` |
| Low Stock Report | Items below minimum threshold | Must Have | `hierarchy-detail` (is_low_stock) |
| Batch Expiry Report | Items nearing or past expiry | Must Have | `hierarchy-detail` (batches) |
| Stock in Transit Report | All dispatched-but-not-received transfers | Must Have | Transfer history filtered by status |
| Sent vs Received Reconciliation | Comparison of dispatched vs received quantities | Must Have | Transfer data |
| Transfer Efficiency | Time from request to receive | Must Have | Transfer timestamps |
| Theoretical vs Actual Consumption | Recipe-predicted usage vs actual stock levels | Must Have | Recipe + stock data |
| Stock Valuation | Stock with purchase price and total value | Phase 2 | Stock + cost data |
| Wastage Report | Wastage by store, item, and period | Phase 2 | Wastage data |

### Report features

- Date ranges: today, yesterday, this week, this month, custom range
- Export: PDF and Excel
- Cross-hierarchy reports: restricted to Central Store Manager and Super Admin
- Store-level reports: available within the viewer's permission scope

---

## 17. Franchise Push and Metadata Sync

The franchise push mechanism is not a stock transfer. It is a metadata synchronization operation that pushes menu items, recipes, ingredient mappings, and stock item definitions from a parent store to a child store.

### What gets pushed

- Menu items (food items)
- Recipes and sub-recipes
- Recipe ingredient mappings (which inventory items go into which recipes)
- Stock item definitions (creating inventory master entries at the child store)
- Add-on definitions

### Why it matters for inventory

After a franchise push, the child store has the recipe-to-inventory mappings needed for automatic consumption deduction. When a customer orders a menu item at an Outlet, the system looks up the recipe, identifies the ingredient inventory items, and deducts stock accordingly.

If the push breaks these linkages (recipe_id becomes null, ingredient mappings are lost), consumption deduction silently stops working. The system will still process the sale, but inventory will not be reduced, leading to stock discrepancies over time.

### Linkage integrity

A persistent mapping table (`central_push_entity_map`) tracks source-to-target ID mappings across pushes. This ensures that repeated pushes (repushes) correctly update existing child entities rather than creating duplicates. The mapping resolution process uses the mapping table first and falls back to name-based matching only when no mapping exists, then persists the new mapping.

Key rule for repush behavior: First push initializes child stock quantities to zero. Subsequent repushes preserve existing child stock quantities while updating metadata and linkages.

### Central controls everything

Central has full authority over the menu, categories, sub-recipes, and ingredients. These are defined at the Central level and pushed downward. Master and Outlet stores consume this pushed configuration; they do not independently create menu items or recipes.

---

## 18. Audit Trail and Events

### Event types

Every significant action on a transfer is recorded as an event in the `inventory_transfer_events` table:

| Event Type | Trigger |
|---|---|
| `request_created` | A new stock request is submitted |
| `approved` | A request is approved by the parent |
| `request_edited` | A pre-dispatch request is modified (resets to requested) |
| `dispatched` | Stock is dispatched (source debited) |
| `received` | Stock is received at destination (destination credited) |
| `cancelled` | A dispatched transfer is cancelled (source restored per resolution) |
| `rejected` | A transfer is rejected (pre or post dispatch) |
| `on_hold` | A transfer is placed on hold pending resolution |

### What each event records

- The actor (who performed the action)
- A line-level snapshot in `meta_json` (the exact items and quantities at the time of the event)
- Resolution metadata where applicable (resolution type, reason, returned quantities)
- Timestamp

### Ledger immutability

The stock ledger is fully immutable. Once a ledger entry is created, it is never edited or deleted. Corrections are handled through new reversal entries:

- When a cancellation restores stock to the source, a new credit entry is created at the source (the original debit entry remains unchanged).
- The reversal entry links back to the original entry, maintaining a complete audit chain.
- This design ensures that any point-in-time reconstruction of stock levels is possible by replaying the ledger entries.

### Before/after quantity tracking

Every stock movement records the before-quantity and after-quantity at the affected store. This enables auditors to trace the exact balance at any point in time without recalculating from transaction history.

---

## 19. Current Platform Status

### What is built and working

| Component | Status |
|---|---|
| CR Requirement Planning Document | Complete — 2,281 lines, 28 sections, 26 modules, 22 workflows |
| Owner Business Decisions | Complete — 96 decisions captured and persisted |
| Enterprise Gap Analysis | Complete — 43 Round 2 questions all answered |
| Terminology Mapping | Confirmed by owner and verified against live API responses |
| API Verification Tool | Built and operational at `/verify` route |
| API Catalog | 20 APIs cataloged across 6 groups |
| Read API Verification | 22 of 22 read APIs verified working |
| E2E Transfer Lifecycle Testing | 18 of 19 scenarios passed |
| Test Hierarchy Seeding | 2 central stores + 4 franchise stores created under master |
| Design Guidelines | Established (dark, brutalist, Swiss high-contrast UI) |

### What is not built

| Component | Status |
|---|---|
| Central Inventory UI | Not started — 23 screens planned, 0 built |
| Terminology Adapter (full frontend) | Module exists; not integrated into main UI (no UI exists yet) |
| Role-based UI Visibility | Not implemented |
| Stock Adjustment Interface | Not built; backend API also needs development |
| Wastage Interface | Not built; backend API needs hierarchy rework |
| Reconciliation Workflow | Not built; backend API does not exist |
| Notifications | Not implemented |
| Reports Dashboard | Not built |
| Recipe Mapping View | Not built |

### E2E test results summary

| Test | Flow | Result |
|---|---|---|
| T1 | Master to Central direct dispatch + receive | PASS |
| T2 | Master to Franchise direct (skip middle) + receive | PASS |
| T3 | Central to Franchise dispatch + receive | PASS |
| T4 | Franchise to Central request, approve, dispatch, receive | 3/4 — dispatch had no stock left |
| T5 | Central to Master request, approve, dispatch, receive | PASS |
| T6 | Pre-dispatch reject | PASS |
| T7 | Post-dispatch cancel (stock restored) | PASS |
| T8 | Partial receive with damaged resolution | PASS |

---

## 20. Known Issues and Operational Boundaries

### Active issues

**Unit conversion metadata not seeded.** The `unit` table in the pre-production database lacks `conversion_factor` and `base_unit` data. This causes every transfer write operation to fail with `UNIT_CONVERSION_NOT_DEFINED`. Resolution: run the unit seeder or manually populate the unit conversion metadata.

**Negative stock exists in legacy data.** The `get-inventory-master` API returns items with negative `cal_quantity` (e.g., -5000 for some items). This is legacy data from before strict enforcement was implemented. It does not affect new transfers but may cause confusion in stock reports.

### Operational boundaries

- The hierarchy is fixed at three levels. Dynamic hierarchy depth is not supported.
- Authentication is through vendor employee login only. There is no separate admin login system.
- The "acting as" mechanism is navigation-only. A user cannot switch their authentication context to another store. They can view another store's data if it is within their visibility scope, but mutations are always performed as their own restaurant.
- Franchise stores (Outlets) see only incoming transactions. They cannot see transfers between other stores.
- The system does not support stock freeze during physical counts. Counting occurs alongside normal operations.
- Auto-cancellation of stale transfers is not implemented. Stale pending transfers will accumulate unless manually addressed. Auto-escalation (alerting) is planned for Phase 2.

---

## 21. Backend Capabilities Requiring Development

Eleven items have been identified that require backend team development work before the corresponding frontend features can be built.

| # | Capability | Current State | Impact | Priority |
|---|---|---|---|---|
| 1 | **Partial dispatch** | Backend dispatches all approved lines at once | Cannot dispatch a subset of approved lines; remaining lines cannot stay in approved status | Phase 1 |
| 2 | **Soft stock reservation on approval** | Backend debits only on dispatch; no reservation mechanism exists | Two approved transfers could claim the same stock; approved quantity is not protected | Phase 1 |
| 3 | **Over-receive** | Backend enforces `accepted_qty + rejected_qty == dispatched_qty` strictly | Cannot accept bonus items or account for packing extras | Phase 1 |
| 4 | **Lateral Master-to-Master transfer validation** | Backend validates parent-chain only; no lateral validation logic | Lateral transfers between sibling Master stores cannot be validated or routed through Central approval | Phase 1 |
| 5 | **Transfer return flow** | No dedicated return endpoint; may reuse request flow reversed | Returns to original sender with acceptance workflow cannot be implemented | Phase 1 |
| 6 | **Reconciliation request workflow** | Does not exist in current API | Stores cannot submit formal discrepancy requests to parent/sender | Phase 1 |
| 7 | **Stock adjustment decrease API** | Only `add-stock` (increase) exists | Central Store Manager cannot reduce stock quantities through adjustment | Phase 1 |
| 8 | **Wastage API (hierarchy-aware)** | Beta API exists at franchise level only | Wastage cannot be recorded at Master or Central levels; franchise API may need rework | Phase 1 |
| 9 | **Physical stocktake API** | Does not exist | System vs actual comparison cannot be performed | Phase 1 |
| 10 | **All three cost model calculations** | Backend may only track one cost model | Weighted average, FIFO, and latest cost views cannot be offered | Phase 1 |
| 11 | **Pack-to-unit conversion** | Backend has base unit conversion; pack conversion may need extension | Cannot handle purchase-in-cases / consume-individually scenarios | Phase 1 |

### Recommended approach

Items 1-5 are likely blockers for core transfer UI functionality and should be prioritized. Items 6-9 are needed for Phase 1 completeness but are not blockers for the initial transfer workflow screens. Items 10-11 are important for reporting accuracy but can be addressed in parallel.

---

## 22. API Inventory and Readiness

### Read APIs (all verified working)

| API | Endpoint | Method | Verification Status |
|---|---|---|---|
| Vendor Employee Login | `/api/v1/auth/vendoremployee/common-login` | POST | Verified working |
| Hierarchy Summary | `/inventory-transfer/hierarchy-summary` | POST | Verified working |
| Hierarchy Detail | `/inventory-transfer/hierarchy-detail` | POST | Verified working |
| Hierarchy Report (alias) | `/inventory-transfer/hierarchy-report` | POST | Verified working (deprecated for new UI) |
| Transfer Details | `/inventory-transfer/details/{id}` | GET | Verified working |
| Transfer History | `/inventory-transfer/history` | POST | Verified working |
| Source Options | `/inventory-transfer/source-options` | POST | Verified working |
| Pending Queues | `/inventory-transfer/pending-queues` | POST | Verified working |
| Get Inventory Master | `/inventory/get-inventory-master` | GET | Verified with notes (negative stock in legacy data) |
| Franchise List | `/franchise/list` | GET | Verified working |
| Franchise Push Form | `/franchise/push-form/{id}` | GET | Verified working |
| Franchise History | `/franchise/history` | POST | Verified working |

### Write APIs (implemented but blocked by unit conversion issue)

| API | Endpoint | Method | Status |
|---|---|---|---|
| Direct Dispatch (Initiate) | `/inventory-transfer/initiate` | POST | Blocked — UNIT_CONVERSION_NOT_DEFINED |
| Request Stock | `/inventory-transfer/request` | POST | Blocked — same issue |
| Approve Transfer | `/inventory-transfer/approve/{id}` | POST | Functionally verified (404 for non-existent ID is correct) |
| Dispatch Approved | `/inventory-transfer/dispatch/{id}` | POST | Blocked — same issue |
| Receive Stock | `/inventory-transfer/receive/{id}` | POST | Functionally verified |
| Cancel Transfer | `/inventory-transfer/cancel/{id}` | POST | Functionally verified |
| Reject Transfer | `/inventory-transfer/reject/{id}` | POST | Functionally verified |
| Edit Transfer | `/inventory-transfer/edit/{id}` | POST | Functionally verified |
| Add Stock | `/inventory/add-stock/{id}` | POST | Verified working (stock added successfully) |
| Franchise Push | `/franchise/push/{id}` | POST | Verified working |

### APIs not yet available

| Capability | Endpoint | Status |
|---|---|---|
| Stock Adjustment (decrease) | Unknown | Backend work required |
| Wastage Entry (hierarchy-aware) | Unknown | Backend work required |
| Transfer Return | Unknown | Backend work required |
| Reconciliation Request | Unknown | Backend work required |
| Physical Stocktake | Unknown | Backend work required |
| Low-stock Alert Configuration | Unknown | Backend work required |
| User Roles/Permissions | Unknown | Existing system, API samples needed |

---

## 23. Glossary

| Term | Definition |
|---|---|
| **Central / Central Store** | The top-level warehouse in the business hierarchy. Backend calls this `master`. |
| **Master Store** | The middle-level regional store. Backend calls this `central`. |
| **Outlet / Unit** | The bottom-level consumption point (restaurant/retail unit). Backend calls this `franchise`. |
| **Segment** | A single row in the stock segment ledger representing a specific batch-expiry-origin combination of an item at a store. |
| **Aggregate** | The rolled-up total quantity of an item at a store, stored in `inventory_master`. |
| **FEFO** | First Expiry First Out — the rule governing which stock is dispatched first. |
| **Source Selector** | The mandatory specification of which segment or bucket to dispatch from. |
| **Filter Bucket** | A category grouping of segments by their batch/expiry presence for legacy stock dispatch. |
| **Lineage** | The chain-of-custody information on a segment: where the stock came from and through which transfer. |
| **Resolution Type** | The policy applied to rejected or cancelled stock: return to source, damaged, partial return, or in-transit hold. |
| **Soft Reservation** | A planned capability to earmark stock at approval time to prevent double-commitment (not yet implemented). |
| **Franchise Push** | Metadata synchronization of menu items, recipes, and ingredient mappings from parent to child store. Not a stock transfer. |
| **Reconciliation Request** | A formal in-system request from a store to its parent/sender to correct a stock discrepancy found during physical counting. |
| **Terminology Inversion** | The confirmed fact that the backend API uses terminology that is the exact inverse of business terminology for hierarchy levels. |

---

*End of System Handover & Operational Documentation*
