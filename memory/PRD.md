# Central Inventory — PRD

## Problem Statement
Full E2E testing on Hells Kitchen (RID 803) — comprehensive ops settings, every transfer operation, partial flows, returns, disputes, wastage, production.

## Architecture
- **Backend**: FastAPI proxy → MyGenie POS preprod APIs + MongoDB
- **Frontend**: React 19 + Tailwind + Radix UI + CRACO

## What's Been Implemented — 2026-07-10

### Hells Kitchen (RID 803) — Comprehensive Ops Test: 47/49 passing

**Operations tested (19 unique transfers):**
- All transfer statuses: requested, approved, dispatched, received, rejected, withdrawn, cancelled, receive_dispute_pending
- All transfer types: dispatch, request, lateral, modification_request
- Full request flow: request→approve→dispatch→receive
- Reject, Amend, Withdraw, Modification request
- Cancel transfer
- Dispute + resolve
- Partial approve + cancel remainder
- Lateral transfers (central↔central, franchise↔franchise) with master approval
- Cross-central franchise dispatch
- Selling price + shipping fee on transfers

**Ops settings tested:**
- require_po_for_purchase (toggle verified)
- allow_child_direct_vendor_purchase (toggle verified)
- allow_over_receive
- transfer_selling_price + shipping_fee
- G-027 READONLY for children
- G-029 catalog policy (deny + enforce)
- G-028 pushed catalog lock
- production_enabled
- allow_lateral_central_transfer, allow_lateral_franchise_transfer, allow_cross_central_franchise_dispatch

**Other operations:**
- Stock decrease adjustment, stock increase
- Wastage recording + report (4 reasons)
- 2 production runs (PRD-2026-0001/0002)
- Stock ledger (10 entries)
- Daily consumption report (hierarchy-wide)
- FEFO stock detail with segments

### Reports (AI/ only, append-only)
- `AI/Plans/hk_803_comprehensive_ops_report.md` — This test
- `AI/Plans/hk_803_retest_addendum.md` — Production + lateral transfers
- `AI/Plans/hk_803_e2e_test_report.md` — Initial E2E
- `AI/curls/hk_comprehensive_ops_test.sh` — Test script
