# L7 — File Ownership (Frozen vs Active)

> **Updated:** 2026-07-11 (CR-037→044 Gap Adoption batch implemented — 16 files: 2 new + 14 modified)

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
| `services/api.js` | MODIFIED — `getVendorItemList()`, 10 PO methods, extended `getStockInventory` params |
| `VendorManagement.jsx` | **FULL REWRITE** — master-detail, purchase intelligence |
| `IngredientCatalogue.jsx` | **FULL REWRITE** — expandable rows, intelligence, filters |
| `AddStockPurchaseForm.jsx` | MODIFIED — PO gate redirect |
| `PurchaseOrderList.jsx` **(NEW)** | PO list with status tabs, 4 KPI cards |
| `PurchaseOrderCreate.jsx` **(NEW)** | By Vendor + By Item Need + multi-PO auto-group |
| `PurchaseOrderDetail.jsx` **(NEW)** | Detail + card-per-line receive |
| `App.js` | MODIFIED — 3 PO routes |

### BUG-026/027/028: Raw Material + PO Fixes (2 files, prior session)
| File | Change |
|------|--------|
| `IngredientCatalogue.jsx` | +isSubRecipeItem, +filterRawCategories, +consumptionMap, "Used In" column |
| `PurchaseOrderCreate.jsx` | +rawMaterialItems filter, +vendorSearch, column renames |

### BUG-029→035: Implementation Batch (8 files, this session 2026-06-15)
| File | Change | Bug |
|------|--------|-----|
| `IngredientCatalogue.jsx` | MODIFIED — name-based fallback join in consumptionMap | BUG-029 |
| `PurchaseOrderCreate.jsx` | MODIFIED — display_qty, consumption API, rate=0, search, KPIs | BUG-030 |
| `StockInventorySummary.jsx` | MODIFIED — conditional tabs, Sub Recipe filter, expiry inline, Adjust Stock removed, KPIs type-aware | BUG-031, BUG-032 |
| `useStockInventory.js` | MODIFIED — Option C hybrid segment loading (include_segments only, no include_consumption) | BUG-032 |
| `DirectDispatchForm.jsx` | MODIFIED — useSearchParams, pre-select from ?item= | BUG-033 |
| `WastageEntryForm.jsx` | MODIFIED — useSearchParams, pre-select from ?item= | BUG-033 |
| `SubRecipeMaster.jsx` | MODIFIED — Delete → Active/Inactive toggle (Switch), removed ConfirmActionDialog for delete | BUG-034 |
| `ProductionHistory.jsx` | MODIFIED — computeAllocQty function, batch qty summing with unit normalization | BUG-035 |

### G-031 BUG-FIX: Push Timeout + 409 Handling (session 2026-07-15)
| File | Change | Item |
|------|--------|------|
| `backend/server.py` | MODIFIED — proxy timeout 30→50s for push endpoints | G-031 |
| `frontend/src/services/api.js` | MODIFIED — per-call timeout 50s for pushBundle + reversePushFromChild | G-031 |
| `frontend/src/hooks/useHierarchyManagement.js` | MODIFIED — 409 PUSH_IN_PROGRESS + REVERSE_PUSH_IN_PROGRESS handling | G-031 |
| `frontend/src/components/central-inventory/ReversePushWizardDialog.jsx` | MODIFIED — not_seeded status in StatusChip | G-031 |

### Orphaned Files (not deleted, not imported)
| File | Reason |
|------|--------|
| `VendorFormDialog.jsx` | Replaced by inline form in VendorManagement. Still on disk, no longer imported. |

### BUG-038→045: Implementation Batch (7 files, session 2026-07-11)
| File | Change | Bug |
|------|--------|-----|
| `frontend/src/hooks/useRestaurantMap.js` | MODIFIED — Added hierarchy-detail fetch for parent/sibling resolution | BUG-041 |
| `frontend/src/components/central-inventory/DailyConsumptionReport.jsx` | MODIFIED — Per-restaurant closing_stock in multi-store mode | BUG-042 |
| `frontend/src/components/central-inventory/PurchaseOrderCreate.jsx` | MODIFIED — Merged vendor dropdown (BUG-039), min=0 on qty (BUG-043), payment/total removed (BUG-044) | BUG-039, BUG-043, BUG-044 |
| `frontend/src/components/central-inventory/PurchaseOrderDetail.jsx` | MODIFIED — Payment/Total conditional on received/closed status | BUG-044 |
| `frontend/src/components/central-inventory/PurchaseOrderList.jsx` | MODIFIED — Items column removed (BUG-038), Payment/Total conditional (BUG-044) | BUG-038, BUG-044 |
| `frontend/src/components/central-inventory/StoreManagement.jsx` | MODIFIED — Indirect outlet label with parent name | BUG-040 |
| `frontend/src/components/central-inventory/PendingQueues.jsx` | MODIFIED — Dispatched tab added | BUG-045 |

### CR-037→044: Gap Adoption Batch (16 files: 2 new + 14 modified, session 2026-07-11)
| File | Change | CR |
|------|--------|-----|
| `frontend/src/services/api.js` | MODIFIED — +10 methods: getStockLedger, getReturnEligible, initiateReturn, addWastageReason, checkInvoiceNumber, getCatalogPolicy, updateCatalogPolicy, getPOImportTemplate, parsePOImport; cache invalidation | CR-037/038/039/040/043 |
| `frontend/src/components/central-inventory/HistoryLedger.jsx` | MODIFIED — Server-driven ledger (G-005), source_type badges, before/after, pagination | CR-037 |
| `frontend/src/components/central-inventory/TransferDetail.jsx` | MODIFIED — qty_before/after columns + Return Items button + ReturnStockDialog | CR-037/038 |
| `frontend/src/components/central-inventory/ReturnStockDialog.jsx` | **NEW** — Stock return dialog (line picker, qty subset, error mapping) | CR-038 |
| `frontend/src/hooks/useWastageReasons.js` | MODIFIED — Exposed canEdit from API for add-reason inline | CR-038 |
| `frontend/src/components/central-inventory/WastageEntryForm.jsx` | MODIFIED — Add new reason inline (when can_edit) | CR-038 |
| `frontend/src/components/central-inventory/PurchaseOrderDetail.jsx` | MODIFIED — Invoice duplicate pre-check (debounced, warn-only) | CR-040 |
| `frontend/src/components/central-inventory/StockDetailPanel.jsx` | MODIFIED — Unit Cost + Batch Value columns in FEFO table, total value | CR-041 |
| `frontend/src/components/central-inventory/IngredientCatalogue.jsx` | MODIFIED — Unit conversion edit/create/display (G-020) + pushed lock badge + error mapping (G-028/029) | CR-042/043 |
| `frontend/src/components/central-inventory/ProductCatalogue.jsx` | MODIFIED — Pushed lock badge + friendly 403 mapping | CR-043 |
| `frontend/src/components/central-inventory/SubRecipeMaster.jsx` | MODIFIED — Pushed lock badge + friendly 403 mapping | CR-043 |
| `frontend/src/components/central-inventory/RecipeCatalogue.jsx` | MODIFIED — Manufactured toggle + fields (G-030) + pushed lock badge + error mapping | CR-043/044 |
| `frontend/src/components/central-inventory/StoreManagement.jsx` | MODIFIED — CatalogPolicyCard (6 switches, per-child, G-029) | CR-043 |
| `frontend/src/lib/apiErrors.js` | **NEW** — friendlyCatalogError() for PUSHED_CATALOG_LOCKED/CHILD_CATALOG_POLICY_DENIED | CR-043 |
| `backend/server.py` | MODIFIED — +2 passthrough routes (binary template GET, multipart parse POST) | CR-039 |
| `frontend/src/components/central-inventory/AddStockPurchaseForm.jsx` | MODIFIED — Template download + file upload + parse preview + continue to PO | CR-039 |
| `frontend/src/components/central-inventory/PurchaseOrderCreate.jsx` | MODIFIED — Accept importedLines from location.state | CR-039 |

## Key Dependencies

### BUG-036: App-Wide Consumption Unit Mismatch (2026-06-15)
| File | Change |
|------|--------|
| `frontend/src/lib/formatters.js` | Added `parseConsumedQty`, `normalizeToDisplayUnit`, `smartConsumptionDisplay` |
| `frontend/src/components/central-inventory/PurchaseOrderCreate.jsx` | Unit normalization in By Vendor + By Item Need modes |
| `frontend/src/components/central-inventory/IngredientCatalogue.jsx` | Shared import, Option A display fallback |
| `frontend/src/components/central-inventory/DirectDispatchForm.jsx` | parseConsumedQty + normalizeToDisplayUnit |
| `frontend/src/components/central-inventory/RequestStockForm.jsx` | parseConsumedQty + normalizeToDisplayUnit |
| `frontend/src/hooks/useProductionRun.js` | parseConsumedQty (fixes Number() NaN) |
| `frontend/src/components/central-inventory/ProductionRunForm.jsx` | Object-format consumptionMap handling |
| `frontend/src/components/central-inventory/StockInventorySummary.jsx` | 3 decimal precision display |

| Component | Depends On |
|-----------|-----------|
| All frontend components | `api.js` (with cache), `terminology.js`, `useLoginContext.js` |
| Intelligence screens | `useStockIntelligence.js`, `StockIntelligenceBar.jsx`, `formatters.js` |
| Intelligent PO | `api.js` (getStockInventory, getDailyConsumptionReport, requestCatalog, getHierarchyDetail) |
| PO Module | `api.js` (10 PO methods + getVendorItemList + getStockInventory + getOperationalSettings) |
| Transfer write forms | `useWriteAction.js` |
| Approval inbox | `FulfillmentVerdict.jsx`, `StoreHealthStrip.jsx`, `useRestaurantMap.js` |
| Stock Inventory segments | `useStockInventory.js` background load (~6s, include_segments only) |
