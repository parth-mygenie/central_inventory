# CR-016 Session Start — P20-Phase2 Stock Inventory Hierarchy Toggle

> **CR ID:** CR-016
> **Title:** P20-Phase2 — Stock Inventory Hierarchy Toggle
> **Status:** PLANNED
> **Date:** 2026-06-13
> **Author:** E1 agent
> **Requested by:** Owner (Parth) — original scope from P20 planning

---

## Context

The Stock Inventory page (`/inventory`) currently shows only the logged-in store's own stock. Phase 1 (CR-010, CLOSED) delivered the full own-store view: table with search, sort, category filter, KPI cards, CSV export, and drill-down to stock detail.

Phase 2 adds a **hierarchy toggle** that lets Master and Central users see stock levels across all stores in their network — a bird's-eye view of stock health.

## Owner's Original Description

From the P20 planning doc: "Cross-store stock comparison. API validated. ~3-4h estimate."

## Scope

Add a toggle switch to the existing `/inventory` page that, when enabled, fetches `?include_hierarchy=true` and renders:
- Per-store heatmap cards showing low-stock ratios
- "Stores in scope" KPI card
- Cross-hierarchy low-stock alert banner

Franchise users see no toggle (self-only scope = no added value).

## Pre-existing Artifacts

| Document | Path | Relevance |
|----------|------|-----------|
| P20 Planning Doc (original + Section 15 validation) | `AI/Plans/phase2/P20_stock_inventory_summary_plan.md` | Full plan + codebase validation |
| Stock Inventory Summary (Phase 1) | `frontend/src/components/central-inventory/StockInventorySummary.jsx` | Existing 422-line component to enhance |
| useStockInventory hook | `frontend/src/hooks/useStockInventory.js` | Existing 64-line hook to enhance |

## Dependencies

- CR-010 (P20 Phase 1 — Stock Inventory Summary) — CLOSED ✅
- CR-024 (API Response Cache) — CLOSED ✅ (cache wrapper exists on `getStockInventory`)

## Codebase Validation (13 Jun 2026)

Full validation completed and documented in Section 15 of the planning doc. All 12 dependencies confirmed. 5 gaps identified and mitigated. Revised estimate: ~2.5h.

## Governance

This CR follows governance gate process (Artifacts 0-6). Validation report in Section 15 of planning doc serves as primary reference for Impact Analysis and Impl Plan.
