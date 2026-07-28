# Central Inventory — PRD

## Original Problem Statement
Clone the `central_inventory` repository (branch `28-7-26`) from GitHub into `/app`, install dependencies, and run both backend and frontend. Then improve UX: simplify PO creation to single mode (remove By Vendor / By Item Need toggle), make Batch and Expiry mandatory on stock purchases.

## Architecture
- **Frontend:** React 19 + CRACO + Tailwind CSS 3 + Radix UI + React Router DOM 7 + Recharts + Axios
- **Backend:** FastAPI + Motor (async MongoDB) + httpx (proxy to preprod POS API) + Pydantic v2 + Uvicorn
- **Database:** MongoDB (local)
- **External API:** preprod.mygenie.online (POS API proxy)

## What's Been Implemented

### 2026-07-28 — Initial Deploy
- Cloned repo from branch `28-7-26`
- Backend + frontend running via supervisor

### 2026-07-28 — UX Improvements
- **PurchaseOrderCreate.jsx**: Removed "By Vendor" / "By Item Need" dual mode tabs. Single vendor-based flow only.
- **AddStockPurchaseForm.jsx**: Made Batch Label and Expiry Date mandatory fields with validation, red borders on empty, and inline error messages. Payload always sends batch + expiry_date.

## Prioritized Backlog
- P2: Re-enable "By Item Need" mode as a separate advanced feature if needed later
