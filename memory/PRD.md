# Central Inventory - PRD

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Radix UI, shadcn/ui, React Router DOM 7, Craco
- **Backend**: Python FastAPI, Motor (async MongoDB), httpx (proxy to MyGenie POS API)
- **External APIs**: MyGenie POS preprod API (v1 auth, v2 vendor operations)

## What's Been Implemented
- P15/P16 lifecycle (partial approve, hold, cancel-remainder, dispute)
- P17: Amend, Withdraw, Modification flows + linked modifications visibility
- Operations Hub, Hierarchy, Queues, History, Ledger, Request Stock, Direct Dispatch, Adjustment, Wastage

## P0 — Implemented
- [x] Full P15/P16/P17 lifecycle
- [x] Linked Modifications sub-section in parent TransferDetail
- [x] Bidirectional parent↔child navigation

## P1 — Planned (P17-Settings / P18-Vendors / P19-AddStock)
### Phase 1: Operational Settings UI
- [ ] Settings page with hierarchy-scoped restaurant picker
- [ ] Resolved vs stored rendering with inheritance indicators
- [ ] Master-only policy editing with dangerous-toggle confirmation
- [ ] 4 grouped sections (Hierarchy Policy, Transfer, Alerts, System)
- API: `operational-settings/get`, `operational-settings/update`

### Phase 2: Vendor Management UI
- [ ] Vendor CRUD (list, create, edit, delete)
- [ ] PolicyGate: blocked-state when `allow_child_direct_vendor_purchase` is off
- [ ] Vendor table with search
- [ ] VendorFormDialog
- API: `get-vendor`, `add-vendor`, `update-vendor/{id}`, `vendor-delete/{id}`

### Phase 3: Add Stock / Procurement UI
- [ ] Single-SKU inward form (SKU selector, vendor selector, qty/unit, batch/expiry)
- [ ] Commercial fields (collapsible)
- [ ] Confirmation summary before submit
- [ ] Clear separation from transfer receive
- API: `add-stock/{inventory_master_id}`

## Planning Documents
- `AI/Plans/phase2/P17P18P19_settings_vendors_procurement_plan.md` — full plan
- `AI/Plans/api_implementation_status_p17p18p19_addendum.md` — API contracts

## P2 — Future
- [ ] Real-time queue polling
- [ ] Multi-line procurement (`add-purchase`)
- [ ] Procurement history / reporting
- [ ] Bill upload
