# Central Inventory - PRD

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Radix UI, shadcn/ui, React Router DOM 7, Craco
- **Backend**: Python FastAPI, Motor (async MongoDB), httpx (proxy to MyGenie POS API)

## What's Been Implemented

### P15/P16: Transfer Lifecycle (May 26)
- Partial approve, hold, cancel-remainder, dispute, multi-wave dispatch/receive

### P17: Amend/Withdraw/Modification (May 27)
- Franchise amend, withdraw, modification request flows
- Linked modifications sub-section in parent TransferDetail

### P17-Settings: Operational Settings UI (May 27)
- 4 grouped sections (Hierarchy Policy, Transfer, Alerts, System)
- Master-only policy editing with dangerous-toggle confirmation
- Inherited vs stored badges, hierarchy inheritance rendering

### P18: Vendor Management UI (May 27)
- Vendor CRUD table with search
- Master: full CRUD. Central: create + read only (when flag ON). Franchise: no access
- PolicyGate blocked-state when procurement disabled
- VendorFormDialog for create/edit

### P19: Add Stock / Procurement UI (May 27)
- Multi-line item entry with vendor, batch/expiry, commercial fields
- Bill/invoice file upload (image + PDF)
- Confirmation summary step before submit
- Success toast + form reset for batch entries
- Procurement section in Operations Hub (master + central only)

### Testing: 100% pass across all features
- P16: 32/32 backend + 16/16 frontend
- P17: 32/32 backend + 16/16 frontend
- P18/P19: 14/14 backend + 20/20 frontend

## P1 — Remaining
- [ ] Real-time queue polling
- [ ] Procurement history / reporting
- [ ] Multi-line purchase via add-purchase API
