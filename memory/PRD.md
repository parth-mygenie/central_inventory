# Central Inventory - PRD

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Radix UI, shadcn/ui, React Router DOM 7, Craco
- **Backend**: Python FastAPI, Motor (async MongoDB), httpx (proxy to MyGenie POS API)
- **External APIs**: MyGenie POS preprod API (v1 auth, v2 vendor operations)

## What's Been Implemented
- P15/P16 lifecycle (partial approve, hold, cancel-remainder, dispute)
- P17: Amend, Withdraw, Modification flows
- **Linked Modifications visibility**: Parent TransferDetail shows "Modification Requests" card listing all child modification_request transfers with status, timestamp, and navigation link. Child shows "Modification of Transfer #XXX" back-link. No duplicate fetch — uses single history call piggy-backed on detail load.

## P0 — Implemented
- [x] Full P15/P16/P17 lifecycle
- [x] Linked Modifications sub-section in parent TransferDetail
- [x] Bidirectional parent↔child navigation
- [x] Operations Hub, Hierarchy, Queues, History, Ledger
- [x] Request stock, Direct dispatch, Adjustment, Wastage

## P1 — Remaining
- [ ] Real-time queue polling
- [ ] Cross-store reports
