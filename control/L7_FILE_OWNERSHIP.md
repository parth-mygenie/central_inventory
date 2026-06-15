# L7 — File Ownership (Frozen vs Active)

> **Updated:** 2026-06-14 (CR-030 complete)

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
| `frontend/src/services/api.js` | Cache layer: `_cached()`, TTL, in-flight dedup, mutation invalidation |

### CR-025: Intelligent PO (2 files — full rewrites)
| File | Change |
|------|--------|
| `RequestStockForm.jsx` | Coverage selector, consumption-based ordering |
| `DirectDispatchForm.jsx` | Integrated dispatch table with Source Segment picker |

### CR-025 Sub-task: Wire `reference_code` (9 files)
| File | Change |
|------|--------|
| `lib/formatters.js`, `PendingQueues.jsx`, `TransferDetail.jsx`, `HistoryLedger.jsx`, `OperationsHub.jsx`, `ApproveWaveDialog.jsx`, `ReceiveDialog.jsx`, `DisputeResolutionDialog.jsx`, `StockInventorySummary.jsx` | Pass `reference_code` at display sites |

### CR-026: Production Unit Module (9 files)
| File | Change |
|------|--------|
| `hooks/useProductionRun.js` **(NEW)** | Production run data hook |
| `ProductionRunForm.jsx` **(NEW)** | Form with demand sort, health strips, coverage, post-run NBA |
| `ProductionHistory.jsx` **(NEW)** | History with KPIs, staleness, cost trend, audit detail |
| `services/api.js` | `runProduction`, `getProductionRunDetail`, `getProductionRunHistory` |
| `lib/screenVisibility.js` | Production screen + action |
| `App.js` | 3 production routes |
| `components/layout/Sidebar.jsx` | Factory, ClipboardList icons |
| `hooks/useStockIntelligence.js` | FG low stock detection |
| `OperationsHub.jsx` | Run Production card + FG NBA banner |

### CR-030: Inward Screens Audit (8 files: 3 new + 5 modified)
| File | Change |
|------|--------|
| `services/api.js` | MODIFIED — `getVendorItemList()`, 10 PO methods, extended `getStockInventory` params (+~105 lines) |
| `VendorManagement.jsx` | **FULL REWRITE** — master-detail, purchase intelligence |
| `IngredientCatalogue.jsx` | **FULL REWRITE** — expandable rows, intelligence, filters |
| `AddStockPurchaseForm.jsx` | MODIFIED — PO gate redirect (proactive + reactive) |
| `PurchaseOrderList.jsx` **(NEW)** | PO list with status tabs, 4 KPI cards, filters |
| `PurchaseOrderCreate.jsx` **(NEW)** | By Vendor + By Item Need + multi-PO auto-group |
| `PurchaseOrderDetail.jsx` **(NEW)** | Detail + card-per-line receive + stock context columns |
| `App.js` | MODIFIED — 3 PO routes + 3 imports |

### Orphaned Files (not deleted, not imported)
| File | Reason |
|------|--------|
| `VendorFormDialog.jsx` | Replaced by inline form in VendorManagement. Still on disk, no longer imported. |

## Key Dependencies

| Component | Depends On |
|-----------|-----------|
| All frontend components | `api.js` (with cache), `terminology.js`, `useLoginContext.js` |
| Intelligence screens | `useStockIntelligence.js`, `StockIntelligenceBar.jsx`, `formatters.js` |
| Intelligent PO | `api.js` (getStockInventory, getDailyConsumptionReport, requestCatalog, getHierarchyDetail) |
| PO Module | `api.js` (10 PO methods + getVendorItemList + getStockInventory + getOperationalSettings) |
| Transfer write forms | `useWriteAction.js` |
| Approval inbox | `FulfillmentVerdict.jsx`, `StoreHealthStrip.jsx`, `useRestaurantMap.js` |
