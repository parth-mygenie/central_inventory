# L7 — File Ownership (Frozen vs Active)

> **Updated:** 2026-06-02 (CR-024 + CR-025 complete)

---

## Frozen Files (DO NOT MODIFY without owner approval)

| File / Folder | Reason |
|---------------|--------|
| `memory/central_inventory/CENTRAL_INVENTORY_BUSINESS_RULE_AND_UX_FIELD_FREEZE.md` | Frozen business rules |
| `memory/central_inventory/SYSTEM_HANDOVER_DOCUMENT.md` | Architecture bible |
| `memory/central_inventory/OWNER_ANSWERS_COMPLETE.md` | 104 owner decisions |
| `memory/central_inventory/CENTRAL_INVENTORY_LOGIN_CONTEXT_AND_SCREEN_VISIBILITY_MATRIX.md` | Role-screen matrix |
| `frontend/src/lib/terminology.js` | Terminology inversion — changes break everything |
| `frontend/src/lib/screenVisibility.js` | Role-based nav + access gates |
| `backend/.env` | Protected env vars |
| `frontend/.env` | Protected env vars |
| `control/registry.json` | Single source of truth — edit carefully, regenerate dashboard |
| `control/sessions/INTELLIGENT_UI_FREEZE_PHASE_7_FINAL_FREEZE.md` | Frozen implementation spec |

## Files Modified in S3

### CR-023: API Reality Check (16 files modified + 1 new)
| File | Change |
|------|--------|
| `hooks/useRestaurantMap.js` **(NEW)** | Shared restaurant ID→name resolver |
| `OperationsHub.jsx` | Progressive loading, store health grid fix |
| `PendingQueues.jsx` | Reject/Approve buttons, requester health mini-bar, insufficient warnings |
| `TransferDetail.jsx` | FROM/TO labels, Requester Store Snapshot, Approval Impact |
| `HistoryLedger.jsx` | Restaurant names via map |
| `HierarchySummary.jsx` | Health columns via hierarchy-detail |
| `ReceiveDialog.jsx` | Dispatched vs requested comparison |
| `ApproveWaveDialog.jsx` | FEFO badges, auto-select, "FEFO Recommended" |
| `DirectDispatchForm.jsx` | Destination health strip, duplicate warning |
| + 7 catalogue/dialog files | Various CR-023 batch 6 fixes |

### CR-024: API Response Cache (1 file)
| File | Change |
|------|--------|
| `frontend/src/services/api.js` | Added cache layer: `_cached()`, `_cacheGet/Set`, `_invalidateCache`, TTL config, in-flight dedup, mutation invalidation |

### CR-025: Intelligent PO (2 files — full rewrites)
| File | Change |
|------|--------|
| `RequestStockForm.jsx` | Full rewrite — coverage selector, consumption-based ordering, threshold fallback, category grouping, source cross-validation, order summary |
| `DirectDispatchForm.jsx` | Full rewrite — integrated dispatch table with inline Source Segment picker, "You'll retain X%", review warnings, coverage selector |

## Key Dependencies

| Component | Depends On |
|-----------|-----------|
| All frontend components | `api.js` (with cache), `terminology.js`, `useLoginContext.js` |
| Intelligence screens | `useStockIntelligence.js`, `StockIntelligenceBar.jsx`, `formatters.js` |
| Intelligent PO | `api.js` (getStockInventory, getDailyConsumptionReport, requestCatalog, getHierarchyDetail) |
| Transfer write forms | `useWriteAction.js`, `transferActions.js` |
| Approval inbox | `FulfillmentVerdict.jsx`, `StoreHealthStrip.jsx`, `useRestaurantMap.js` |
