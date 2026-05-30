
---

## Addendum: P24 FEFO Consumption + Batch-Accurate Stock Summary — API Investigation (29 May 2026)

> **Source:** Live POS API probing (preprod.mygenie.online) — 19 probes
> **Actors:** Master/killua (rid=1), DemoFranchise2 (rid=784), DemoFranchise3 (rid=785)
> **FEFO Scenario:** killua → DemoFranchise3 (stock transfer), DemoFranchise2 (food orders consumed inventory)

### Endpoints Confirmed

| Endpoint | Method | Status | New? |
|----------|--------|--------|------|
| `GET /inventory/stock-inventory` | GET | **WORKING** | No (unchanged) |
| `GET /inventory/stock-inventory/{id}` | GET | **WORKING** | **YES — NEW** |
| `POST /inventory/wastage-report` | POST | **WORKING** | Extended (new filters + fields) |

### New Detail Endpoint Response Blocks

| Block | Description | Present |
|-------|-------------|:-------:|
| `summary` | Same as list row + vendor info | Always |
| `quantity_reconciliation` | Aggregate vs segment totals | Always |
| `segments[]` | FEFO-ordered on-hand batches | Always (may be empty) |
| `consumption_summary` | Aggregate consumption in period | Always |
| `consumption_lines[]` | Per-order consumption events | Always (may be empty) |

### Wastage Report New Fields

| Field | On | Notes |
|-------|:--:|-------|
| `segment_allocations_json` | records[] | Raw JSON — null on all current records |
| `source_type` | records[] | null on all current records |
| `segment_allocations` | records[] | Parsed array — empty on all current records |
| `batch` | records[] | null on all current records |
| `expiry_date` | records[] | null on all current records |
| `has_batch` | filter | Works — returns 0 records (none have audit JSON yet) |
| `include_segments` | filter | Works — returns `segment_snapshot[]` with current on-hand batches |
| `segment_snapshot[]` | response | Current segments with batch/expiry (NOT per-event audit) |
| `segment_snapshot_note` | response | Explanatory note about snapshot vs event audit |

### FEFO Scenario Findings

| Validation | F3 (segments) | F2 (consumption) |
|------------|:---:|:---:|
| Transferred batches visible | **YES** (MAIDA-BATCH-01) | N/A |
| FEFO ordering correct | **YES** (soonest exp first, null last) | N/A |
| Reconciliation balanced | **PARTIAL** (maida OK, red meat mismatch) | N/A |
| Consumption lines present | N/A | **YES** (2 lines from 2 orders) |
| segment_allocations populated | N/A | **NO** (empty — legacy path) |
| End-to-end trace possible | Segment origin traceable | Consumption lacks FEFO detail |

### Key Finding: fefo_consumption_enabled appears OFF for DemoFranchise2
- Consumption lines have `segment_allocations: []` and `batch: null`
- This means consumption went through the legacy aggregate deduction path
- When the flag is turned ON, these fields will populate with per-segment FEFO deductions

### Reconciliation Status by Store

| Store | Item | Aggregate | Segment Total | Unsegmented | Status |
|-------|------|:---------:|:-------------:|:-----------:|--------|
| F3 | maida | 2000 | 2000 | 0 | **Balanced** |
| F3 | red meat | 250 | 4000 | 0 | **MISMATCH** (3750 gap) |
| F3 | patri | 3950 | 4000 | 0 | Near-balanced (50 gap) |
| Master | maida | 118150 | 108150 | 10000 | **Unsegmented remainder** |
| Master | Cooking Oil | 24820 | 24820 | 0 | **Balanced** |

### Implementation: ~10-13h (3 phases)

Phase 1: Stock detail panel + segments + reconciliation (~5-6h)
Phase 2: Consumption section with date filter (~3-4h)
Phase 3: Wastage report batch enhancement (~2-3h)
