import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Central Inventory — API Service Layer
 *
 * Post-seed-shutdown: all calls go through proxy → real POS API.
 * This layer handles route paths, payload building, and response
 * normalization so components receive a stable contract.
 */

const client = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// ── Token management ─────────────────────────────────────────────

let _token = null;

function setToken(token) {
  _token = token;
  if (token) {
    client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common["Authorization"];
  }
}

// Eagerly restore token from localStorage on module load
// so that API calls made before React effects run still carry auth.
try {
  const stored = localStorage.getItem("ci_token");
  if (stored) setToken(stored);
} catch { /* SSR or no localStorage */ }

// ── Response normalizers (shared contract layer) ─────────────────

/**
 * Normalize a transfer object from POS API.
 * POS returns transfer + lines as siblings; frontend expects flat with embedded lines.
 * Also parses resolution_meta from JSON string → object.
 */
function normalizeTransfer(raw) {
  if (!raw) return raw;
  // If POS shape: { transfer: {...}, lines: [...] }, flatten
  if (raw.transfer && !raw.status && !raw.id) {
    const t = { ...raw.transfer, lines: raw.lines || [] };
    return enrichTransferMeta(parseResolutionMeta(t));
  }
  // Already flat shape
  return enrichTransferMeta(parseResolutionMeta(raw));
}

/** P17: Enrich transfer with derived P17 fields */
function enrichTransferMeta(t) {
  if (!t) return t;
  t.parentTransferId = t.parent_transfer_id || null;
  t.isModificationRequest = (t.type === "modification_request");
  t.isWithdrawn = (t.status === "withdrawn");
  return t;
}

/**
 * Parse resolution_meta if it's a JSON string.
 */
function parseResolutionMeta(t) {
  if (t && typeof t.resolution_meta === "string") {
    try {
      t.resolution_meta = JSON.parse(t.resolution_meta);
    } catch {
      t.resolution_meta = null;
    }
  }
  return t;
}

/**
 * Normalize a transfer line from POS API.
 * POS field names → frontend expected names.
 * P16: Parse meta_json.approval for line-level lifecycle fields.
 */
function normalizeTransferLine(line) {
  if (!line) return line;
  // Parse meta_json from string → object
  let meta = line.meta_json;
  if (typeof meta === "string") {
    try { meta = JSON.parse(meta); } catch { meta = null; }
  }
  if (!meta) meta = {};

  const approval = meta.approval || {};
  const dispatch = meta.dispatch || {};

  // P16: Derive operational line status from POS status + approval meta.
  // POS returns line.status="approved" even when holdDisplayQty > 0 (partially approved).
  // We derive a more accurate lineStatus for rendering:
  //   - "approved" with hold > 0 → "partially_approved" (still re-approvable)
  //   - "approved" with hold = 0 → "approved" (fully approved)
  //   - "pending" after dispatch → keep "pending" (POS uses this for dispatched lines)
  //   - everything else → pass through from POS
  const rawStatus = (line.status || "requested").toLowerCase();
  const holdQty = approval.hold_display_qty ?? 0;
  const approvedQty = approval.approved_display_qty ?? 0;
  let derivedLineStatus = rawStatus;
  if (rawStatus === "approved" && holdQty > 0) {
    derivedLineStatus = "partially_approved";
  }

  // Compute remaining approvable qty: requested - approved - cancelled
  const requestedQty = approval.requested_display_qty ?? (line.requested_qty != null ? Number(line.requested_qty) : null);
  const cancelledQty = approval.cancelled_display_qty ?? 0;
  const remainingApprovableQty = requestedQty != null ? Math.max(0, requestedQty - approvedQty - cancelledQty) : null;

  return {
    ...line,
    stock_title: line.stock_title || line.source_stock_title || null,
    quantity: line.quantity ?? (line.requested_qty != null ? Number(line.requested_qty) : null),
    unit: line.unit || line.requested_unit || line.display_unit || null,
    accepted_qty: line.accepted_qty ?? null,
    rejected_qty: line.rejected_qty ?? null,
    // P16 line-level fields
    lineStatus: derivedLineStatus,
    rawLineStatus: rawStatus,
    meta,
    requestedDisplayQty: requestedQty,
    originalRequestedDisplayQty: approval.original_requested_display_qty ?? null,
    approvedDisplayQty: approvedQty || null,
    holdDisplayQty: holdQty ? Math.round(holdQty * 10000) / 10000 : null,
    cancelledDisplayQty: cancelledQty ? Math.round(cancelledQty * 10000) / 10000 : null,
    remainingApprovableQty: remainingApprovableQty != null ? Math.round(remainingApprovableQty * 10000) / 10000 : null,
    remainderPolicy: approval.remainder_policy ?? null,
    approvalWaves: approval.approval_waves || [],
    dispatchedDisplayTotal: dispatch.dispatched_display_total ?? null,
    hasApprovalMeta: Object.keys(approval).length > 0,
  };
}

/**
 * Normalize hierarchy-detail stock summary item.
 * POS: total_quantity/display_quantity → frontend: cal_quantity/display_qty.
 */
function normalizeStockSummaryItem(item) {
  if (!item) return item;
  return {
    ...item,
    cal_quantity: item.cal_quantity ?? item.total_quantity ?? item.display_quantity ?? null,
    display_qty: item.display_qty ?? item.display_quantity ?? null,
  };
}

/**
 * Normalize hierarchy-detail batch item.
 * POS: available_quantity → frontend: cal_quantity.
 */
function normalizeBatchItem(batch) {
  if (!batch) return batch;
  return {
    ...batch,
    cal_quantity: batch.cal_quantity ?? batch.available_quantity ?? batch.display_quantity ?? null,
  };
}

// ── Auth ─────────────────────────────────────────────────────────

function login(email, password) {
  return client.post("/proxy/auth/login", {
    email,
    password,
    fcm_token: "central_inventory_web",
  });
}

// ── Hierarchy & Reporting ────────────────────────────────────────

/**
 * FIX: POS requires store_type as mandatory.
 * Default to "franchise" if caller doesn't provide storeType.
 */
function getHierarchySummary({ storeType, fromDate, toDate } = {}) {
  const payload = {
    store_type: storeType || "franchise",
  };
  if (fromDate) payload.from_date = fromDate;
  if (toDate) payload.to_date = toDate;
  return client.post("/proxy/v2/inventory-transfer/hierarchy-summary", payload);
}

function getHierarchyDetail({ storeRestaurantId, selectedStockTitle, selectedUnitId, transactionsStockTitle, fromDate, toDate } = {}) {
  const payload = {};
  if (storeRestaurantId) payload.store_restaurant_id = storeRestaurantId;
  if (selectedStockTitle) payload.selected_stock_title = selectedStockTitle;
  if (selectedUnitId) payload.selected_unit_id = selectedUnitId;
  if (transactionsStockTitle) payload.transactions_stock_title = transactionsStockTitle;
  if (fromDate) payload.from_date = fromDate;
  if (toDate) payload.to_date = toDate;
  return client.post("/proxy/v2/inventory-transfer/hierarchy-detail", payload).then((resp) => {
    // Normalize stock summary and batch items
    const data = resp.data?.data || resp.data;
    if (data?.child_stock_summary) {
      data.child_stock_summary = data.child_stock_summary.map(normalizeStockSummaryItem);
    }
    if (data?.child_stock_batches) {
      data.child_stock_batches = data.child_stock_batches.map(normalizeBatchItem);
    }
    return resp;
  });
}

// ── Pending Queues ───────────────────────────────────────────────

function getPendingQueues() {
  return client.post("/proxy/v2/inventory-transfer/pending-queues", {});
}

// ── Transfer ─────────────────────────────────────────────────────

/**
 * FIX: POS returns { data: { transfer: {...}, lines: [...] } }.
 * Normalize to flat object with embedded lines.
 */
function getTransferDetails(transferId) {
  return client.get(`/proxy/v2/inventory-transfer/details/${transferId}`).then((resp) => {
    const raw = resp.data?.data || resp.data;
    const normalized = normalizeTransfer(raw);
    if (normalized?.lines) {
      normalized.lines = normalized.lines.map(normalizeTransferLine);
    }
    // Replace resp.data.data with normalized
    if (resp.data?.data) {
      resp.data.data = normalized;
    } else {
      resp.data = normalized;
    }
    return resp;
  });
}

/**
 * FIX: POS history items have resolution_meta as JSON string and missing restaurant names.
 * Parse resolution_meta for each item.
 */
function getTransferHistory({ fromDate, toDate, status, limit, page } = {}) {
  const payload = {};
  if (fromDate) payload.from_date = fromDate;
  if (toDate) payload.to_date = toDate;
  if (status) payload.status = status;
  if (limit) payload.limit = limit;
  if (page) payload.page = page;
  return client.post("/proxy/v2/inventory-transfer/history", payload).then((resp) => {
    const data = resp.data?.data || resp.data;
    if (Array.isArray(data)) {
      data.forEach(parseResolutionMeta);
    }
    return resp;
  });
}

// ── Source Options ────────────────────────────────────────────────

/**
 * FIX: POS requires source_inventory_master_id + from_restaurant_id.
 * Frontend was sending inventory_master_id + restaurant_id.
 */
function getSourceOptions({ inventoryMasterId, restaurantId } = {}) {
  const payload = {};
  if (inventoryMasterId) payload.source_inventory_master_id = inventoryMasterId;
  if (restaurantId) payload.from_restaurant_id = restaurantId;
  return client.post("/proxy/v2/inventory-transfer/source-options", payload);
}

// ── Inventory ────────────────────────────────────────────────────

function getInventoryMaster() {
  return client.get("/proxy/v2/inventory/get-inventory-master");
}

// ── Franchise ────────────────────────────────────────────────────

function getFranchiseList(limit = 25) {
  return client.get(`/proxy/v2/franchise/list?limit=${limit}`);
}

function getFranchiseHistory({ fromDate, toDate } = {}) {
  const payload = {};
  if (fromDate) payload.from_date = fromDate;
  if (toDate) payload.to_date = toDate;
  return client.post("/proxy/v2/franchise/history", payload);
}

// ── Write APIs (Slice 4 — Transfers) ─────────────────────────────

function initiateTransfer({ fromRestaurantId, toRestaurantId, items }) {
  return client.post("/proxy/v2/inventory-transfer/initiate", {
    from_restaurant_id: fromRestaurantId,
    to_restaurant_id: toRestaurantId,
    items,
  });
}

/**
 * Request Stock — canonical 3-step flow (25 May 2026 contract).
 *
 * Step 1: requestSources()   → sources[] with can_submit_request
 * Step 2: requestCatalog()   → items[] from SOURCE store (source_inventory_master_id)
 * Step 3: requestStock()     → create transfer (type=request, status=requested)
 *
 * Do NOT use getHierarchySummary or getInventoryMaster for request flow.
 */

function requestSources() {
  return client.post("/proxy/v2/inventory-transfer/request-sources", {});
}

function requestCatalog(sourceRestaurantId) {
  return client.post("/proxy/v2/inventory-transfer/request-catalog", {
    source_restaurant_id: sourceRestaurantId,
  });
}

function requestStock({ items, fromRestaurantId }) {
  const payload = { items };
  if (fromRestaurantId) payload.from_restaurant_id = fromRestaurantId;
  return client.post("/proxy/v2/inventory-transfer/request", payload);
}

function approveTransfer(transferId) {
  return client.post(`/proxy/v2/inventory-transfer/approve/${transferId}`, {});
}

/** P16: Partial approve with approval_lines + segments per line */
function approveTransferPartial(transferId, { approvalLines, defaultRemainderPolicy = "hold" }) {
  return client.post(`/proxy/v2/inventory-transfer/approve/${transferId}`, {
    approval_lines: approvalLines,
    default_remainder_policy: defaultRemainderPolicy,
  });
}

/** P16: Cancel hold on partially_approved transfer — pass line_ids for targeted cancel */
function cancelRemainder(transferId, lineIds) {
  const payload = {};
  if (lineIds && lineIds.length > 0) payload.line_ids = lineIds;
  return client.post(`/proxy/v2/inventory-transfer/approve/${transferId}/cancel-remainder`, payload);
}

/** P17: Amend request — franchise replaces lines in-place (status=requested, type=request only) */
function amendRequest(transferId, items) {
  return client.post(`/proxy/v2/inventory-transfer/request/${transferId}/amend`, { items });
}

/** P17: Withdraw request — terminal status (status=requested, type=request only) */
function withdrawRequest(transferId) {
  return client.post(`/proxy/v2/inventory-transfer/request/${transferId}/withdraw`, {});
}

/** P17: Request modification — creates child transfer (post-approval, type=request only) */
function requestModification(transferId, items) {
  return client.post(`/proxy/v2/inventory-transfer/request/${transferId}/modification`, { items });
}

/** P16: Resolve receive dispute (central/sender only) */
function resolveDispute(transferId, { accept, note }) {
  return client.post(`/proxy/v2/inventory-transfer/receive-dispute/${transferId}/resolve`, {
    accept,
    note,
  });
}

function rejectTransfer(transferId, payload) {
  return client.post(`/proxy/v2/inventory-transfer/reject/${transferId}`, payload);
}

function dispatchTransfer(transferId) {
  return client.post(`/proxy/v2/inventory-transfer/dispatch/${transferId}`, {});
}

function receiveTransfer(transferId, payload = {}) {
  return client.post(`/proxy/v2/inventory-transfer/receive/${transferId}`, payload);
}

function cancelTransfer(transferId, payload) {
  return client.post(`/proxy/v2/inventory-transfer/cancel/${transferId}`, payload);
}

// ── Stock Adjustment APIs (Slice 5) ──────────────────────────────

/**
 * FIX: POS requires restaurant_id in payload.
 */
function adjustStockDecrease(payload) {
  return client.post("/proxy/v2/inventory-transfer/decrease-adjustment", {
    source_inventory_master_id: payload.sourceInventoryMasterId,
    quantity: payload.quantity,
    unit: payload.unit,
    source_selector: payload.sourceSelector,
    reason: payload.reason,
    restaurant_id: payload.restaurantId,
  });
}

/**
 * FIX: Correct path is /inventory/add-stock/{inventory_master_id} (ID in URL).
 * POS also requires vendor_id in body.
 */
function adjustStockIncrease(payload) {
  return client.post(`/proxy/v2/inventory/add-stock/${payload.sourceInventoryMasterId}`, {
    quantity: payload.quantity,
    unit: payload.unit,
    reason: payload.reason,
    vendor_id: payload.vendorId || payload.restaurantId,
  });
}

// ── Wastage APIs ─────────────────────────────────────────────────

/**
 * FIX: Correct path is /inventory-transfer/record-wastage (not /inventory/record-wastage).
 * POS also requires restaurant_id in payload.
 */
function recordWastage(payload) {
  return client.post("/proxy/v2/inventory-transfer/record-wastage", {
    source_inventory_master_id: payload.sourceInventoryMasterId,
    quantity: payload.quantity,
    unit: payload.unit,
    source_selector: payload.sourceSelector,
    reason: payload.reason,
    restaurant_id: payload.restaurantId,
  });
}

/**
 * P25: Get store's configured wastage reasons (for picker dropdown).
 * Falls back to master reasons (rid=0) if store has none.
 */
function getWastageReasons() {
  return client.get("/proxy/v2/inventory/wastage-reasons").then((resp) => {
    const data = resp.data;
    return { ...resp, data: data?.reasons || [] };
  });
}

/**
 * P25: Wastage report with full filter support.
 * Preserves full response shape (summary, totals, by_restaurant, wastage_records, segment_snapshot).
 */
function getWastageReport({ restaurantIds, fromDate, toDate, wasteType, foodId, hasBatch, includeSegments } = {}) {
  const payload = {};
  if (restaurantIds) payload.restaurant_ids = restaurantIds;
  if (fromDate) payload.start_date = fromDate;
  if (toDate) payload.end_date = toDate;
  if (wasteType) payload.waste_type = wasteType;
  if (foodId) payload.food_id = foodId;
  if (hasBatch) payload.has_batch = true;
  if (includeSegments) payload.include_segments = true;
  return client.post("/proxy/v2/inventory/wastage-report", payload).then((resp) => {
    const d = resp.data;
    d.summary = d.summary || { total_records: 0, total_loss: 0, total_gain: 0, net_wastage: 0, applied_restaurant_ids: [] };
    d.totals = d.totals || {};
    d.by_restaurant = d.by_restaurant || [];
    d.wastage_records = d.wastage_records || [];
    d.segment_snapshot = (d.segment_snapshot || []).map(s => ({
      ...s,
      cal_quantity: parseFloat(s.cal_quantity) || 0,
      display_qty: parseFloat(s.display_qty) || 0,
    }));
    d.segment_snapshot_note = d.segment_snapshot_note || "";
    // Backward compat: also set .data for old consumers
    d.data = d.wastage_records;
    return resp;
  });
}

// ── P20 Stock Inventory Summary ───────────────────────────────────

/**
 * P20: Get logged-in store's stock inventory summary.
 * CAUTION: This is for summary/dashboard only.
 * Do NOT use for request flow source catalog (use requestCatalog instead).
 */
function getStockInventory() {
  return client.get("/proxy/v2/inventory/stock-inventory").then((resp) => {
    const data = resp.data;
    if (data?.current_stocks) {
      data.current_stocks = data.current_stocks.map(normalizeStockItem);
    }
    return resp;
  });
}

/**
 * P20: Normalize stock-inventory item.
 * POS returns quantities as strings; parse to floats for sorting/comparison.
 */
function normalizeStockItem(item) {
  if (!item) return item;
  return {
    ...item,
    cal_quantity: parseFloat(item.cal_quantity) || 0,
    display_qty: parseFloat(item.display_qty) || 0,
    quantity: parseFloat(item.quantity) || 0,
    min_qty_alert: parseFloat(item.min_qty_alert) || 0,
  };
}

// ── P24 Stock Detail (FEFO Batch View) ────────────────────────────

/**
 * P24: Get FEFO stock detail for a single inventory item.
 * Returns: summary, segments, quantity_reconciliation, consumption_summary, consumption_lines
 */
function getStockDetail(inventoryMasterId, { consumptionFrom, consumptionTo, consumptionLimit } = {}) {
  const params = new URLSearchParams();
  if (consumptionFrom) params.set("consumption_from", consumptionFrom);
  if (consumptionTo) params.set("consumption_to", consumptionTo);
  if (consumptionLimit) params.set("consumption_limit", consumptionLimit);
  const queryString = params.toString();
  const url = `/proxy/v2/inventory/stock-inventory/${inventoryMasterId}${queryString ? `?${queryString}` : ""}`;
  return client.get(url);
}

// ── P17 Operational Settings ─────────────────────────────────────

function getOperationalSettings(restaurantId) {
  const payload = {};
  if (restaurantId) payload.restaurant_id = restaurantId;
  return client.post("/proxy/v2/inventory-transfer/operational-settings/get", payload);
}

function updateOperationalSettings(restaurantId, settings) {
  return client.post("/proxy/v2/inventory-transfer/operational-settings/update", {
    restaurant_id: restaurantId,
    settings,
  });
}

// ── P18 Vendor Management ────────────────────────────────────────

function getVendors() {
  return client.get("/proxy/v2/inventory/get-vendor").then((resp) => {
    // Normalize: POS returns raw array, wrap in data if needed
    if (Array.isArray(resp.data)) {
      resp.data = { data: resp.data };
    }
    return resp;
  });
}

function addVendor(payload) {
  return client.post("/proxy/v2/inventory/add-vendor", payload);
}

function updateVendor(id, payload) {
  return client.put(`/proxy/v2/inventory/update-vendor/${id}`, payload);
}

function deleteVendor(id) {
  return client.delete(`/proxy/v2/inventory/vendor-delete/${id}`);
}

// ── P19 Add Stock (Procurement) ──────────────────────────────────

function addStockPurchase(inventoryMasterId, payload) {
  return client.post(`/proxy/v2/inventory/add-stock/${inventoryMasterId}`, payload);
}

// ── P21 Catalogue — Inventory Categories ─────────────────────────

function getStockItemCategories() {
  return client.get("/proxy/v2/inventory/stock-item-categories").then(r => {
    const d = r.data; return { ...r, data: d?.data || [] };
  });
}
function getStockItemCategoryById(id) {
  return client.get(`/proxy/v2/inventory/stock-item-categories/get/${id}`).then(r => {
    return { ...r, data: r.data?.data || r.data };
  });
}
function createStockItemCategory(payload) {
  return client.post("/proxy/v2/inventory/stock-item-categories/store", payload);
}
function updateStockItemCategory(id, payload) {
  return client.put(`/proxy/v2/inventory/stock-item-categories/update/${id}`, payload);
}
function deleteStockItemCategory(id) {
  return client.delete(`/proxy/v2/inventory/stock-item-categories/delete/${id}`);
}

// ── P21 Catalogue — Inventory Items ──────────────────────────────

function addInventoryItem(items) {
  return client.post("/proxy/v2/inventory/add-inventory", items);
}
function updateStockItem(id, payload) {
  return client.put(`/proxy/v2/inventory/update-stock/${id}`, payload);
}

// ── P21 Catalogue — Products / Foods ─────────────────────────────

function getFoodsList() {
  return client.get("/proxy/v2/product/foods-list").then(r => {
    const foods = (r.data?.foods || []).map(f => ({
      ...f, price: Number(f.price) || 0, tax: parseFloat(f.tax) || 0,
    }));
    return { ...r, data: foods };
  });
}
function getFoodCategories() {
  return client.get("/proxy/v2/product/categories").then(r => {
    return { ...r, data: Array.isArray(r.data) ? r.data : [] };
  });
}
function createFoodCategory(payload) {
  return client.post("/proxy/v2/product/add-categories", payload);
}
function updateFoodCategory(id, payload) {
  // CRITICAL: POS uses POST not PUT for this route
  return client.post(`/proxy/v2/product/update-categories/${id}`, payload);
}
function deleteFoodCategory(id) {
  return client.delete(`/proxy/v2/product/delete-categories/${id}`);
}
function addFood(payload) { return client.post("/proxy/v2/product/add-food", payload); }
function updateFood(id, payload) { return client.put(`/proxy/v2/product/foods/${id}`, payload); }
function deleteFood(id) { return client.delete(`/proxy/v2/product/delete/${id}`); }
function getAddonList() {
  return client.get("/proxy/v2/product/addon-list").then(r => {
    return { ...r, data: r.data?.addons || [] };
  });
}
function createAddon(payload) {
  return client.post("/proxy/v2/product/add-addon", payload);
}
function updateAddon(id, payload) {
  // CRITICAL: route is addon-update (noun-verb), NOT update-addon
  return client.put(`/proxy/v2/product/addon-update/${id}`, payload);
}
function deleteAddon(id) {
  return client.delete(`/proxy/v2/product/delete-addon/${id}`);
}

// ── P21 Catalogue — Recipes ──────────────────────────────────────

function getRecipeList() {
  return client.get("/proxy/v2/recipe/get-recipe").then(r => {
    return { ...r, data: r.data?.recipes || [] };
  });
}
function getRecipeDetail(id) {
  return client.get(`/proxy/v2/recipe/recipe/${id}`).then(r => {
    return { ...r, data: r.data?.recipe || r.data };
  });
}
function createRecipe(payload) { return client.post("/proxy/v2/recipe/store-recipe", payload); }
function updateRecipe(id, payload) { return client.put(`/proxy/v2/recipe/update-recipe/${id}`, payload); }
function deleteRecipe(id) { return client.delete(`/proxy/v2/recipe/delete-recipe/${id}`); }

// ── P21 Catalogue — Sub-recipes ──────────────────────────────────

function getSubRecipeList() {
  return client.get("/proxy/v2/recipe/sub-recipes").then(r => {
    const d = r.data;
    if (d?.sub_recipes) return { ...r, data: d.sub_recipes };
    if (Array.isArray(d)) return { ...r, data: d };
    return { ...r, data: [] };
  });
}
function createSubRecipe(payload) { return client.post("/proxy/v2/recipe/store-sub-recipe", payload); }
function updateSubRecipe(id, payload) { return client.put(`/proxy/v2/recipe/update-sub-recipe/${id}`, payload); }

// ── P21 Catalogue — Addon-recipes ────────────────────────────────

function getAddonRecipes() {
  return client.get("/proxy/v2/product/addon-recipe-list").then(r => {
    return { ...r, data: r.data?.recipes || [] };
  });
}
function getAddonRecipeById(id) {
  return client.get(`/proxy/v2/product/addon-recipe/${id}`).then(r => {
    return { ...r, data: r.data?.recipe || r.data };
  });
}
function getAddonsWithoutRecipe() {
  return client.get("/proxy/v2/product/addons-without-recipe").then(r => {
    return { ...r, data: r.data?.addons || [] };
  });
}
function createAddonRecipe(payload) { return client.post("/proxy/v2/product/store-addon-recipe", payload); }
function updateAddonRecipe(id, payload) { return client.put(`/proxy/v2/product/update-addon-recipe/${id}`, payload); }
function deleteAddonRecipe(id) { return client.delete(`/proxy/v2/product/delete-addon-recipe/${id}`); }

// ── P23 Hierarchy Management ──────────────────────────────────────

function getHierarchyList({ childType, limit, page } = {}) {
  const params = new URLSearchParams();
  if (limit) params.set("limit", limit);
  if (page) params.set("page", page);
  if (childType) params.set("child_type", childType);
  return client.get(`/proxy/v2/franchise/list?${params.toString()}`).then((resp) => {
    const d = resp.data?.data || resp.data;
    // Normalize massive child objects to essential fields
    if (d?.children) {
      d.children = d.children.map(normalizeHierarchyChild);
    }
    return resp;
  });
}

function getCreateMetadata() {
  return client.get("/proxy/v2/franchise/create");
}

function createHierarchyChild({ name, email, phone, password, address, childType }) {
  const payload = { name, email, phone, password, address };
  if (childType) payload.child_type = childType;
  return client.post("/proxy/v2/franchise/create", payload);
}

function getPushForm(childId) {
  return client.get(`/proxy/v2/franchise/push-form/${childId}`);
}

function pushBundle(childId) {
  return client.post(`/proxy/v2/franchise/push/${childId}`, { push_food_bundle: true });
}

function getHierarchyHistory({ limit, page } = {}) {
  const payload = {};
  if (limit) payload.limit = limit;
  if (page) payload.page = page;
  return client.post("/proxy/v2/franchise/history", payload);
}

/**
 * Normalize a child restaurant from franchise/list.
 * Raw objects have ~150 fields; extract only what UI needs.
 */
function normalizeHierarchyChild(raw) {
  if (!raw) return raw;
  return {
    id: raw.id,
    name: raw.name,
    phone: raw.phone,
    email: raw.email,
    address: raw.address,
    status: raw.status,
    active: raw.active,
    restaurantTypeFlag: raw.restaurant_type_flag,
    parentRestaurantId: raw.parent_restaurant_id,
    slug: raw.slug,
    createdAt: raw.created_at,
    vendor: raw.vendor ? {
      id: raw.vendor.id,
      name: raw.vendor.f_name,
      email: raw.vendor.email,
      phone: raw.vendor.phone,
    } : null,
  };
}

// ── P22 Daily Consumption Report ──────────────────────────────────

function getDailyConsumptionReport({ fromDate, toDate, restaurantIds, includeHierarchy } = {}) {
  const payload = {};
  if (fromDate) payload.from_date = fromDate;
  if (toDate) payload.to_date = toDate;
  if (restaurantIds?.length) payload.restaurant_ids = restaurantIds;
  if (includeHierarchy) payload.include_hierarchy = true;
  return client.post("/proxy/v2/report/daily-consumption-report", payload).then((resp) => {
    const d = resp.data;
    d.stock_summary = d.stock_summary || [];
    d.stock_details = d.stock_details || [];
    d.by_restaurant = d.by_restaurant || [];
    d.hierarchy_scope = d.hierarchy_scope || [];
    d.applied_restaurant_ids = d.applied_restaurant_ids || [];
    d.date_range = d.date_range || [];
    return resp;
  });
}

const api = {
  setToken,
  login,
  getHierarchySummary,
  getHierarchyDetail,
  getPendingQueues,
  getTransferDetails,
  getTransferHistory,
  getSourceOptions,
  getInventoryMaster,
  getFranchiseList,
  getFranchiseHistory,
  // Request Stock 3-step flow
  requestSources,
  requestCatalog,
  // Slice 4 write APIs
  initiateTransfer,
  requestStock,
  approveTransfer,
  approveTransferPartial,
  cancelRemainder,
  resolveDispute,
  rejectTransfer,
  // P17: Amend, Withdraw, Modification
  amendRequest,
  withdrawRequest,
  requestModification,
  dispatchTransfer,
  receiveTransfer,
  cancelTransfer,
  // Slice 5 — Stock Adjustment + Wastage APIs
  adjustStockDecrease,
  adjustStockIncrease,
  recordWastage,
  getWastageReasons,
  getWastageReport,
  // P17-Settings / P18-Vendors / P19-Procurement
  getOperationalSettings,
  updateOperationalSettings,
  getVendors,
  addVendor,
  updateVendor,
  deleteVendor,
  addStockPurchase,
  // P20 Stock Inventory Summary
  getStockInventory,
  // P24 Stock Detail (FEFO Batch View)
  getStockDetail,
  // P21 Catalogue — Inventory
  getStockItemCategories,
  getStockItemCategoryById,
  createStockItemCategory,
  updateStockItemCategory,
  deleteStockItemCategory,
  addInventoryItem,
  updateStockItem,
  // P21 Catalogue — Product
  getFoodsList,
  getFoodCategories,
  createFoodCategory,
  updateFoodCategory,
  deleteFoodCategory,
  addFood,
  updateFood,
  deleteFood,
  getAddonList,
  createAddon,
  updateAddon,
  deleteAddon,
  // P21 Catalogue — Recipes
  getRecipeList,
  getRecipeDetail,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  // P21 Catalogue — Sub-recipes
  getSubRecipeList,
  createSubRecipe,
  updateSubRecipe,
  // P21 Catalogue — Addon-recipes
  getAddonRecipes,
  getAddonRecipeById,
  getAddonsWithoutRecipe,
  createAddonRecipe,
  updateAddonRecipe,
  deleteAddonRecipe,
  // P22 Daily Consumption Report
  getDailyConsumptionReport,
  // P23 Hierarchy Management
  getHierarchyList,
  getCreateMetadata,
  createHierarchyChild,
  getPushForm,
  pushBundle,
  getHierarchyHistory,
};

export default api;
