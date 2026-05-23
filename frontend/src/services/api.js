import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Central Inventory — API Service Layer
 *
 * Centralizes all API calls. Uses proxy endpoints on our backend
 * which forward to preprod.mygenie.online.
 *
 * Read APIs only for Phase 1 Slice 1.
 * Write APIs are intentionally omitted (UNIT_CONVERSION_NOT_DEFINED blocker).
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

// ── Auth ─────────────────────────────────────────────────────────

function login(email, password) {
  return client.post("/proxy/auth/login", {
    email,
    password,
    fcm_token: "central_inventory_web",
  });
}

// ── Hierarchy & Reporting (READ — verified working) ──────────────

function getHierarchySummary({ storeType, fromDate, toDate } = {}) {
  const payload = {};
  if (storeType) payload.store_type = storeType;
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
  return client.post("/proxy/v2/inventory-transfer/hierarchy-detail", payload);
}

// ── Pending Queues (READ — verified working) ─────────────────────

function getPendingQueues() {
  return client.post("/proxy/v2/inventory-transfer/pending-queues", {});
}

// ── Transfer (READ — verified working) ───────────────────────────

function getTransferDetails(transferId) {
  return client.get(`/proxy/v2/inventory-transfer/details/${transferId}`);
}

function getTransferHistory({ fromDate, toDate, status, limit, page } = {}) {
  const payload = {};
  if (fromDate) payload.from_date = fromDate;
  if (toDate) payload.to_date = toDate;
  if (status) payload.status = status;
  if (limit) payload.limit = limit;
  if (page) payload.page = page;
  return client.post("/proxy/v2/inventory-transfer/history", payload);
}

// ── Source Options (READ — verified working) ─────────────────────

function getSourceOptions({ inventoryMasterId, restaurantId } = {}) {
  const payload = {};
  if (inventoryMasterId) payload.inventory_master_id = inventoryMasterId;
  if (restaurantId) payload.restaurant_id = restaurantId;
  return client.post("/proxy/v2/inventory-transfer/source-options", payload);
}

// ── Inventory (READ — verified working) ──────────────────────────

function getInventoryMaster() {
  return client.get("/proxy/v2/inventory/get-inventory-master");
}

// ── Franchise (READ — verified working) ──────────────────────────

function getFranchiseList(limit = 25) {
  return client.get(`/proxy/v2/franchise/list?limit=${limit}`);
}

function getFranchiseHistory({ fromDate, toDate } = {}) {
  const payload = {};
  if (fromDate) payload.from_date = fromDate;
  if (toDate) payload.to_date = toDate;
  return client.post("/proxy/v2/franchise/history", payload);
}

// ── Write APIs (Slice 4 — verified_ready, 52/52 E2E PASS) ───────

function initiateTransfer({ fromRestaurantId, toRestaurantId, items }) {
  return client.post("/proxy/v2/inventory-transfer/initiate", {
    from_restaurant_id: fromRestaurantId,
    to_restaurant_id: toRestaurantId,
    items,
  });
}

function requestStock({ items }) {
  return client.post("/proxy/v2/inventory-transfer/request", { items });
}

function approveTransfer(transferId) {
  return client.post(`/proxy/v2/inventory-transfer/approve/${transferId}`, {});
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
  // Slice 4 write APIs
  initiateTransfer,
  requestStock,
  approveTransfer,
  rejectTransfer,
  dispatchTransfer,
  receiveTransfer,
  cancelTransfer,
};

export default api;
