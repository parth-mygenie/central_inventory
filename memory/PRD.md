# Central Inventory - PRD

## Original Problem Statement
Clone repo, fix G-031, raise timeout to 100s, add loading UI, add Select All / Unselect All to PO Create.

## Architecture
- **Backend**: FastAPI proxy → preprod.mygenie.online POS API
- **Frontend**: React 19 + CRACO + Tailwind CSS + Radix UI + React Router
- **Database**: MongoDB (local, session/status)

## What's Been Implemented
- [2026-07-15] Repo clone + env setup
- [2026-07-15] G-031: Investigation + BUG FIX (timeout 30→100s, 409 handling, not_seeded, loading UI)
- [2026-07-15] CR-046: Select All / Unselect All buttons in PO Create (both By Vendor + By Item Need modes) with selection counter

## Current Status
- All services ✅ running
- EXIT GATE: ✅ All checks pass

## Prioritized Backlog
- P1: QA re-run of G-031 wizard phases + CR-046 PO buttons
- P2: Per-module progress streaming for push/pull

## Test Credentials
- Master (RID 809): owner@bholechature.com / Qplazm@10
- Franchise (RID 689): owner@kunafamahal.com / Qplazm@10
- Central (RID 806): manager@germanfluid.com / Qplazm@10
