/**
 * Central Inventory — Formatters
 *
 * Timestamp and display formatting utilities.
 * Uses date-fns (v4.1.0 already installed).
 */

import { format, formatDistanceToNow, parseISO, isValid } from "date-fns";

/**
 * Format ISO timestamp to human-readable: "19 May 2026, 11:30 AM"
 */
export function formatTimestamp(isoString) {
  if (!isoString) return "—";
  try {
    const date = typeof isoString === "string" ? parseISO(isoString) : isoString;
    if (!isValid(date)) return "—";
    return format(date, "d MMM yyyy, h:mm a");
  } catch {
    return "—";
  }
}

/**
 * Format ISO timestamp to short date: "19 May 2026"
 */
export function formatDate(isoString) {
  if (!isoString) return "—";
  try {
    const date = typeof isoString === "string" ? parseISO(isoString) : isoString;
    if (!isValid(date)) return "—";
    return format(date, "d MMM yyyy");
  } catch {
    return "—";
  }
}

/**
 * Format relative time: "3 hours ago"
 */
export function formatRelativeTime(isoString) {
  if (!isoString) return "—";
  try {
    const date = typeof isoString === "string" ? parseISO(isoString) : isoString;
    if (!isValid(date)) return "—";
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "—";
  }
}

/**
 * Validate quantity for UOM: pcs = whole numbers, kg/ltr = up to 2 decimals
 */
export function validateQuantityForUnit(quantity, unit) {
  const n = Number(quantity);
  if (isNaN(n) || n <= 0) return "Quantity must be greater than 0";
  const u = (unit || "").toLowerCase().trim();
  if (u === "pcs" && !Number.isInteger(n)) return "Quantity must be a whole number for pieces";
  if ((u === "kg" || u === "ltr") && n !== Math.round(n * 100) / 100) return "Maximum 2 decimal places allowed";
  return null;
}

/**
 * Format transfer ID as PO number: PO-A1B2
 * Uses last 4 chars of transfer ID, uppercased. Falls back to "XXXX".
 */
export function formatPO(transferId, referenceCode) {
  if (referenceCode) return referenceCode;
  if (!transferId) return "PO-XXXX";
  const s = String(transferId);
  const tail = s.slice(-4).toUpperCase();
  return `PO-${tail.padStart(4, "0")}`;
}

/**
 * Format items count: "3 items" / "1 item"
 */
export function formatItemsCount(count) {
  if (count == null || count === undefined) return "—";
  const n = Number(count);
  if (isNaN(n)) return "—";
  return n === 1 ? "1 item" : `${n} items`;
}

// BUG-036 — Consumption unit helpers

/**
 * Parse a consumed-quantity string like "134.18 gm" → { value: 134.18, unit: "gm" }
 * Handles bare numbers (returns unit "").
 */
export function parseConsumedQty(str) {
  if (!str) return { value: 0, unit: "" };
  if (typeof str === "number") return { value: str, unit: "" };
  const parts = String(str).trim().split(/\s+/);
  return { value: parseFloat(parts[0]) || 0, unit: parts[1] || "" };
}

/**
 * Convert between base unit (gm/ml) and display unit (kg/ltr).
 * Returns the original value if no conversion is known.
 */
export function normalizeToDisplayUnit(value, fromUnit, toUnit) {
  if (!fromUnit || !toUnit || fromUnit === toUnit) return value;
  const f = fromUnit.toLowerCase();
  const t = toUnit.toLowerCase();
  if (f === "gm" && t === "kg") return value / 1000;
  if (f === "kg" && t === "gm") return value * 1000;
  if (f === "ml" && t === "ltr") return value / 1000;
  if (f === "ltr" && t === "ml") return value * 1000;
  return value;
}

/**
 * Format consumption for display: 3 decimals, Option A fallback.
 * If value < 0.05 in displayUnit, show in consumptionUnit instead.
 * Returns { text: "9.584 gm/day", value: 9.584, unit: "gm" } or null if zero.
 */
export function smartConsumptionDisplay(dailyQty, consumptionUnit, displayUnit) {
  if (!dailyQty || dailyQty <= 0) return null;
  const converted = normalizeToDisplayUnit(dailyQty, consumptionUnit, displayUnit);
  if (converted < 0.05 && consumptionUnit && displayUnit && consumptionUnit.toLowerCase() !== displayUnit.toLowerCase()) {
    return { text: `${dailyQty.toFixed(3)} ${consumptionUnit}/day`, value: dailyQty, unit: consumptionUnit };
  }
  return { text: `${converted.toFixed(3)} ${displayUnit || consumptionUnit}/day`, value: converted, unit: displayUnit || consumptionUnit };
}
