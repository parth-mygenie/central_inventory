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
 * Format items count: "3 items" / "1 item"
 */
export function formatItemsCount(count) {
  if (count == null || count === undefined) return "—";
  const n = Number(count);
  if (isNaN(n)) return "—";
  return n === 1 ? "1 item" : `${n} items`;
}
