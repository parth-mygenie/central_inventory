/**
 * Central Inventory — Transfer Action Matrix
 *
 * Determines which actions are visible on Transfer Detail
 * based on transfer status, user role, and actor position (source vs destination).
 *
 * All actions remain DISABLED (write API blocked) — only visibility is controlled.
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
  if (["received", "partially_received", "cancelled", "rejected"].includes(status)) {
    return [];
  }

  const actions = [];

  if (role === "master") {
    // Central Store — top level
    if (status === "requested" && isSource) {
      actions.push({ id: "approve", label: "Approve", variant: "default" });
      actions.push({ id: "reject", label: "Reject", variant: "destructive" });
    } else if (status === "approved" && isSource) {
      actions.push({ id: "dispatch", label: "Dispatch", variant: "default" });
      actions.push({ id: "cancel", label: "Cancel", variant: "destructive" });
    } else if (status === "dispatched") {
      if (isSource) {
        actions.push({ id: "cancel", label: "Cancel", variant: "destructive" });
      }
      if (isDestination) {
        actions.push({ id: "receive", label: "Receive", variant: "default" });
      }
    }
  } else if (role === "central") {
    // Master Store — middle level
    if (status === "requested") {
      if (isSource) {
        // Parent approving child's request
        actions.push({ id: "approve", label: "Approve", variant: "default" });
        actions.push({ id: "reject", label: "Reject", variant: "destructive" });
      } else if (isDestination && transferType === "request") {
        // Own request — can edit
        actions.push({ id: "edit", label: "Edit", variant: "outline" });
      }
    } else if (status === "approved" && isSource) {
      actions.push({ id: "dispatch", label: "Dispatch", variant: "default" });
      actions.push({ id: "cancel", label: "Cancel", variant: "destructive" });
    } else if (status === "dispatched") {
      if (isSource) {
        actions.push({ id: "cancel", label: "Cancel", variant: "destructive" });
      }
      if (isDestination) {
        actions.push({ id: "receive", label: "Receive", variant: "default" });
      }
    }
  } else if (role === "franchise") {
    // Outlet — bottom level
    if (status === "requested" && isDestination && transferType === "request") {
      // Own request — can edit
      actions.push({ id: "edit", label: "Edit", variant: "outline" });
    } else if (status === "dispatched" && isDestination) {
      actions.push({ id: "receive", label: "Receive", variant: "default" });
    }
  }

  return actions;
}
