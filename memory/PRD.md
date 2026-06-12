# Central Inventory — PRD

## Problem Statement
End-to-end validation of P30 M0 Production Flow using fresh hierarchy, vendors, purchases, production runs, and transfers against preprod POS API (restaurant 806).

## Tech Stack
- **Frontend**: React 19, Tailwind CSS 3, Radix UI, craco
- **Backend**: FastAPI proxy → preprod.mygenie.online POS API
- **Database**: MongoDB (local, token sessions)

## What's Been Implemented/Validated

### 2026-06-13 — Initial validation
- Cloned repo (branch 13-6-26), started services
- Created hierarchy: 806→807(central)→810(franchise), 806→808(central), 806→809(franchise)
- Added 33 new ingredients from Excel recipe data (44 total)
- Created 2 vendors, purchased at 2 price points (budget vs premium)
- Created 3 sub-recipes (Sesame, Ragi, Oats cookies)
- Ran 5 production batches with full cost tracing
- Verified FEFO ordering, segment reconciliation, cost inheritance

### 2026-06-13 — Post B1/B2 fix validation
- Confirmed child store login works with corrected email format
- Confirmed transfer ref code format TRF-{masterId}-{year}-{seq} works
- Validated all transfer lifecycle states:
  - Request → Approve → (Dispatch BLOCKED)
  - Partial approval with segments + hold/cancel remainder
  - Amend, Withdraw, Modification, Reject
  - Cross-central request (franchise@CA → CB)
- Discovered new blocker: B3 UNIT_CONVERSION_NOT_DEFINED

## Blockers
- **B3 (CRITICAL)**: UNIT_CONVERSION_NOT_DEFINED blocks ALL dispatch for restaurant 806
- **B4**: Direct dispatch source_selector.mode validation rejects all known modes

## Backlog
- P0: Fix unit conversion for restaurant 806 (POS backend)
- P1: Re-validate dispatch, receive, segment transfer, cost flow
- P1: Consumption testing with POS orders (master 806 has FG stock)
- P2: Re-push updated ingredients to children
