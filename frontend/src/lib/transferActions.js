/**
 * Central Inventory — Transfer Action Matrix (Slice 4 — Write-Enabled)
 *
 * Determines which actions are visible on Transfer Detail
 * based on transfer status, user role, and actor position (source vs destination).
 *
 * Slice 4: Actions are now ENABLED and wired to real preprod APIs.
 * "Report Issue" added per Q-XFER-006 override (Q-S4-006: C).
 *
 * Role mapping:
 *   backend "master"    = business "Central Store"  (TOP)
 *   backend "central"   = business "Master Store"   (MIDDLE)
 *   backend "franchise" = business "Outlet"         (BOTTOM)
 */

/**
 * Get available actions for a transfer given the current user context.
 *
 * @param {string} transferStatus - Transfer status (requested, approved, dispatched, etc.)
 * @param {string} transferType - Transfer type ("request" or "dispatch")
 * @param {string} userRestaurantType - Backend restaurant_type of logged-in user
 * @param {number|string} userRestaurantId - Restaurant ID of logged-in user
 * @param {number|string} fromRestaurantId - Source restaurant of the transfer
 * @param {number|string} toRestaurantId - Destination restaurant of the transfer
 * @returns {Array<{id: string, label: string, variant: string}>} Visible actions
 */
export function getAvailableActions(
  transferStatus,
  transferType,
  userRestaurantType,
  userRestaurantId,
  fromRestaurantId,
  toRestaurantId
) {
  if (!transferStatus || !userRestaurantType) return [];

  const status = transferStatus.toLowerCase().trim();
  const role = userRestaurantType.toLowerCase().trim();
  const userId = String(userRestaurantId);
  const fromId = String(fromRestaurantId);
  const toId = String(toRestaurantId);

  const isSource = userId === fromId;
  const isDestination = userId === toId;

  // Terminal statuses — no actions
  if (["received", "cancelled", "rejected"].includes(status)) {
    return [];
  }

  const actions = [];

  // ── Source-side actions (central/master who owns the stock) ──
  if (isSource) {
    if (status === "requested") {
      actions.push({ id: "approve", label: "Approve", variant: "default" });
      actions.push({ id: "partial-approve", label: "Partial Approve", variant: "outline" });
      actions.push({ id: "reject", label: "Reject", variant: "destructive" });
    } else if (status === "partially_approved") {
      actions.push({ id: "partial-approve", label: "Approve More", variant: "default" });
      actions.push({ id: "dispatch", label: "Dispatch Approved", variant: "default" });
      actions.push({ id: "cancel-remainder", label: "Cancel Remainder", variant: "outline" });
      actions.push({ id: "reject", label: "Reject", variant: "destructive" });
    } else if (status === "approved") {
      actions.push({ id: "dispatch", label: "Dispatch", variant: "default" });
      actions.push({ id: "cancel", label: "Cancel", variant: "destructive" });
    } else if (status === "dispatched") {
      actions.push({ id: "cancel", label: "Cancel", variant: "destructive" });
    } else if (status === "receive_dispute_pending") {
      actions.push({ id: "resolve-dispute", label: "Resolve Dispute", variant: "default" });
    }
  }

  // ── Destination-side actions (franchise/outlet who requested/receives) ──
  if (isDestination) {
    if (status === "requested" && transferType === "request") {
      actions.push({ id: "edit", label: "Edit", variant: "outline" });
    } else if (status === "dispatched") {
      actions.push({ id: "receive", label: "Receive", variant: "default" });
      actions.push({ id: "report-issue", label: "Report Issue", variant: "destructive" });
    }
    // partially_received is terminal for destination — no actions
  }

  return actions;
}
