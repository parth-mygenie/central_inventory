/**
 * Central Inventory — Terminology Adapter
 *
 * Single source of truth for backend→business term mapping.
 * Backend uses INVERTED terminology:
 *   backend "master"    = business "Central Store"  (TOP)
 *   backend "central"   = business "Master Store"   (MIDDLE)
 *   backend "franchise"  = business "Outlet"         (BOTTOM)
 *
 * NEVER display raw backend terms in the UI.
 * Always pass through these mapping functions.
 */

// ── Core mapping ─────────────────────────────────────────────────

export const TERM_MAP = {
  master: "Central Store",
  central: "Master Store",
  franchise: "Outlet",
};

export const TERM_MAP_SHORT = {
  master: "Central",
  central: "Master",
  franchise: "Outlet",
};

// Reverse map: business label → backend value
export const REVERSE_TERM_MAP = {
  "Central Store": "master",
  "Master Store": "central",
  Outlet: "franchise",
};

// ── Hierarchy level (numeric for comparisons) ────────────────────

export const HIERARCHY_LEVEL = {
  master: 0,   // TOP
  central: 1,  // MIDDLE
  franchise: 2, // BOTTOM
};

// ── Restaurant type → UI label ──────────────────────────────────

export function mapRestaurantType(backendType) {
  if (!backendType) return "Unknown";
  const key = backendType.toLowerCase().trim();
  return TERM_MAP[key] || backendType;
}

export function mapRestaurantTypeShort(backendType) {
  if (!backendType) return "?";
  const key = backendType.toLowerCase().trim();
  return TERM_MAP_SHORT[key] || backendType;
}

// ── Store-type filter mapping (CRITICAL — inverted) ──────────────
// UI "Master Stores" tab → send store_type: "central" to backend
// UI "Outlets" tab       → send store_type: "franchise" to backend

export const STORE_TYPE_FILTERS = {
  masterStores: "central",    // UI tab "Master Stores" → backend "central"
  outlets: "franchise",       // UI tab "Outlets"       → backend "franchise"
};

export function mapStoreTypeFilter(uiTab) {
  return STORE_TYPE_FILTERS[uiTab] || uiTab;
}

// ── Role mapping ─────────────────────────────────────────────────

export const ROLE_MAP = {
  master: "Central Store Manager",
  central: "Master Store Manager",
  franchise: "Outlet Manager",
};

export function mapRole(backendType) {
  if (!backendType) return "Unknown Role";
  return ROLE_MAP[backendType.toLowerCase().trim()] || backendType;
}

// ── Transfer status colors ───────────────────────────────────────

export const STATUS_CONFIG = {
  requested:                { label: "Requested",              color: "bg-amber-100 text-amber-800",     dot: "bg-amber-500" },
  partially_approved:       { label: "Partially Approved",     color: "bg-sky-100 text-sky-800",         dot: "bg-sky-500" },
  approved:                 { label: "Approved",               color: "bg-blue-100 text-blue-800",       dot: "bg-blue-500" },
  dispatched:               { label: "Dispatched",             color: "bg-indigo-100 text-indigo-800",   dot: "bg-indigo-500" },
  received:                 { label: "Received",               color: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  partially_received:       { label: "Partially Received",     color: "bg-teal-100 text-teal-800",       dot: "bg-teal-500" },
  receive_dispute_pending:  { label: "Dispute Pending",        color: "bg-orange-100 text-orange-800",   dot: "bg-orange-500" },
  cancelled:                { label: "Cancelled",              color: "bg-red-100 text-red-800",         dot: "bg-red-500" },
  rejected:                 { label: "Rejected",               color: "bg-rose-100 text-rose-800",       dot: "bg-rose-500" },
  withdrawn:                { label: "Withdrawn",              color: "bg-slate-100 text-slate-700",     dot: "bg-slate-400" },
};

// Transfer type display mapping
export const TYPE_LABELS = {
  request: "Request",
  dispatch: "Direct Dispatch",
  modification_request: "Modification",
};

// Line-level status vocabulary (P16)
export const LINE_STATUS_CONFIG = {
  requested:            { label: "Requested",          color: "bg-amber-100 text-amber-800",   dot: "bg-amber-500" },
  partially_approved:   { label: "Partially Approved", color: "bg-sky-100 text-sky-800",       dot: "bg-sky-500" },
  approved:             { label: "Approved",           color: "bg-blue-100 text-blue-800",     dot: "bg-blue-500" },
  on_hold:              { label: "On Hold",            color: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-500" },
  cancelled_remainder:  { label: "Cancelled",          color: "bg-red-100 text-red-800",       dot: "bg-red-500" },
  pending:              { label: "Pending",            color: "bg-slate-100 text-slate-700",   dot: "bg-slate-400" },
};

export function getLineStatusConfig(status) {
  if (!status) return { label: "—", color: "bg-gray-100 text-gray-800", dot: "bg-gray-400" };
  return LINE_STATUS_CONFIG[status.toLowerCase().trim()] || { label: status, color: "bg-gray-100 text-gray-800", dot: "bg-gray-400" };
}

export function getStatusConfig(status) {
  if (!status) return { label: "Unknown", color: "bg-gray-100 text-gray-800", dot: "bg-gray-400" };
  return STATUS_CONFIG[status.toLowerCase().trim()] || { label: status, color: "bg-gray-100 text-gray-800", dot: "bg-gray-400" };
}

// ── Store type badge colors ──────────────────────────────────────

export const STORE_TYPE_BADGE = {
  master:    { bg: "bg-violet-100", text: "text-violet-800", border: "border-violet-200" },
  central:   { bg: "bg-sky-100",    text: "text-sky-800",    border: "border-sky-200" },
  franchise: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200" },
};

export function getStoreTypeBadge(backendType) {
  if (!backendType) return { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" };
  return STORE_TYPE_BADGE[backendType.toLowerCase().trim()] || { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" };
}

// ── API error message mapping ─────────────────────────────────────

export function mapApiErrorMessage(message) {
  if (!message || typeof message !== "string") return message;
  return message
    .replace(/\bfranchise\b/gi, "Outlet")
    .replace(/\bcentral\b/gi, "Master Store")
    .replace(/\bmaster\b/gi, "Central Store");
}

// ── Scan text for raw backend terms (dev/debug utility) ──────────

export function scanForTerminology(text) {
  if (!text || typeof text !== "string") return [];
  const warnings = [];
  const patterns = [
    { raw: /\bmaster\b/gi,    business: "Central Store" },
    { raw: /\bcentral\b/gi,   business: "Master Store" },
    { raw: /\bfranchise\b/gi, business: "Outlet" },
  ];
  for (const p of patterns) {
    const matches = text.match(p.raw);
    if (matches) {
      warnings.push({
        raw: matches[0],
        business: p.business,
        count: matches.length,
      });
    }
  }
  return warnings;
}
