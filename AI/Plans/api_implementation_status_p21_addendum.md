
---

## Addendum: P21 Smart Dispatch/Request Assistance — Planning Summary (27 May 2026)

> **Status:** PLANNING ONLY — no code changes
> **Document:** `AI/Plans/phase3/P21_smart_dispatch_request_assistance.md`

### Concept

Destination-aware intelligence layer for dispatch and request flows. When operator selects a destination store, surfaces that store's stock health, suggests items to dispatch, and pre-fills smart quantities.

### Data Sources (All Existing — No New Endpoints Needed for Phase 1-3)

| Source | Endpoint | Used For |
|--------|----------|----------|
| Own store stock | `GET /stock-inventory` (P20) | Request form: own low-stock awareness |
| Destination store stock | `POST /hierarchy-detail` | Dispatch form: destination item-level stock |
| Source inventory | `GET /get-inventory-master` | Source availability check |
| Transfer history | `POST /history` | Recent dispatch context |
| Pending queues | `POST /pending-queues` | Open request awareness |

### Recommendation Tier System

| Tier | Trigger | Color | Action |
|------|---------|-------|--------|
| CRITICAL | Destination item at 0 qty + is_low_stock | Red | Auto-suggest, "Add to dispatch" |
| LOW | Destination item below threshold | Amber | Suggest, not auto-added |
| PENDING_REQUEST | Open request from destination | Blue | Show context, "Approve instead" link |
| RECENTLY_SENT | Dispatched in last 7 days | Gray | Informational warning |

### Phased Roadmap

| Phase | Scope | Effort | Risk |
|-------|-------|--------|------|
| 1: Low-stock suggestions | Destination stock panel + request awareness banner | 4-5h | ZERO |
| 2: Recommended quantities | Qty formulas + source confidence + bulk add | 3-4h | LOW |
| 3: History context | Recently sent + pending requests + duplicate warning | 3-4h | LOW |
| 4: Consumption-aware (future) | Days-to-stockout, transfer frequency analysis | 8-12h | MEDIUM |
| 5: Network optimization (long-term) | Cross-store rebalancing suggestions | 15-20h | HIGH |

### Key Architectural Decision

`stock-inventory` is auth-scoped (self-store only). For destination store stock, use `hierarchy-detail` with `store_restaurant_id`. Different field names require normalization (existing `normalizeStockSummaryItem()` handles this). `min_qty_alert` not available in hierarchy-detail — Phase 1 uses qty=0 as CRITICAL signal.

### Design Principles

- Operator always in control (suggest, never auto-execute)
- Deterministic + explainable (no black-box ML)
- Additive UI (side panel, not redesigned form)
- Fail-safe (if intel fetch fails, form works exactly as before)
