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
    return parseResolutionMeta(t);
  }
  // Already flat shape
  return parseResolutionMeta(raw);
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

/** P16: Cancel hold on partially_approved transfer */
function cancelRemainder(transferId) {
  return client.post(`/proxy/v2/inventory-transfer/approve/${transferId}/cancel-remainder`, {});
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
 * FIX: Response is an object with wastage_records array inside, not a flat array.
 * Normalize to return { data: { data: [...records] } } for frontend consumption.
 */
function getWastageReport({ restaurantIds, fromDate, toDate } = {}) {
  const payload = {};
  if (restaurantIds) payload.restaurant_ids = restaurantIds;
  if (fromDate) payload.from_date = fromDate;
  if (toDate) payload.to_date = toDate;
  return client.post("/proxy/v2/inventory/wastage-report", payload).then((resp) => {
    const raw = resp.data;
    // Normalize: extract wastage_records as the data array
    if (raw && !Array.isArray(raw.data) && raw.wastage_records) {
      resp.data = { ...raw, data: raw.wastage_records };
    }
    return resp;
  });
}

// ── Export ────────────────────────────────────────────────────────

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
  dispatchTransfer,
  receiveTransfer,
  cancelTransfer,
  // Slice 5 — Stock Adjustment + Wastage APIs
  adjustStockDecrease,
  adjustStockIncrease,
  recordWastage,
  getWastageReport,
};

export default api;
