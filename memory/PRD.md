# Central Inventory - PRD

## Original Problem Statement
Clone repo, fix G-031, raise timeout to 100s, add loading UI, add Select All/Unselect All, remove invoice total, fix consumption report date crash, fix duplicate React key search bug.

## Architecture
- **Backend**: FastAPI proxy → preprod.mygenie.online POS API
- **Frontend**: React 19 + CRACO + Tailwind CSS + Radix UI + React Router

## What's Been Implemented
- [2026-07-15] Repo clone + env setup
- [2026-07-15] G-031: Timeout 30→100s, 409 handling, not_seeded, loading UI
- [2026-07-15] CR-046: Select All / Unselect All in PO Create + Direct Dispatch
- [2026-07-15] BUG-FIX: Commented out Invoice Total display on Receive Goods
- [2026-07-15] BUG-FIX: Guarded dateRange null/empty in Consumption Report
- [2026-07-15] BUG-FIX: Duplicate React key → ghost rows on search. Fixed 4 locations with composite keys + realIdx toggle fix

## Test Credentials
- Master (RID 809): owner@bholechature.com / Qplazm@10
- Franchise (RID 689): owner@kunafamahal.com / Qplazm@10
