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
 * P15/P16 independent hold-wave lifecycle:
 * - Hold waves can be approved after dispatch/receive (same transfer).
 * - partially_received transfers remain actionable for source (approve hold, dispatch, cancel-remainder).
 * - "Approve More" appears whenever outstanding hold exists, regardless of header status.
 *
 * @param {object} options - Transfer + user context
 * @returns {Array<{id: string, label: string, variant: string}>} Visible actions
 */
export function getAvailableActions(
  transferStatus,
  transferType,
  userRestaurantType,
  userRestaurantId,
  fromRestaurantId,
  toRestaurantId,
  { hasOutstandingHold = false, hasApprovedUndispatched = false } = {}
) {
  if (!transferStatus || !userRestaurantType) return [];

  const status = transferStatus.toLowerCase().trim();
  const userId = String(userRestaurantId);
  const fromId = String(fromRestaurantId);
  const toId = String(toRestaurantId);

  const isSource = userId === fromId;
  const isDestination = userId === toId;

  // Fully terminal — no actions for anyone
  if (["received", "cancelled", "rejected", "withdrawn"].includes(status)) {
    return [];
  }

  const actions = [];

  // ── Source-side actions (central/master who owns the stock) ──
  if (isSource) {
    if (status === "requested") {
      actions.push({ id: "approve", label: "Approve All", variant: "default" });
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
      // Independent hold: if hold remains, source can approve more or cancel remainder
      if (hasOutstandingHold) {
        actions.push({ id: "partial-approve", label: "Approve Hold", variant: "default" });
        actions.push({ id: "cancel-remainder", label: "Cancel Remainder", variant: "outline" });
      }
      // If newly approved qty awaits dispatch (follow-up wave)
      if (hasApprovedUndispatched) {
        actions.push({ id: "dispatch", label: "Dispatch Wave", variant: "default" });
      }
      actions.push({ id: "cancel", label: "Cancel", variant: "destructive" });

    } else if (status === "partially_received") {
      // Independent hold: partially_received is NOT terminal for source
      if (hasOutstandingHold) {
        actions.push({ id: "partial-approve", label: "Approve Hold", variant: "default" });
        actions.push({ id: "cancel-remainder", label: "Cancel Remainder", variant: "outline" });
      }
      if (hasApprovedUndispatched) {
        actions.push({ id: "dispatch", label: "Dispatch Wave", variant: "default" });
      }

    } else if (status === "receive_dispute_pending") {
      actions.push({ id: "resolve-dispute", label: "Resolve Dispute", variant: "default" });
    }
  }

  // ── Destination-side actions (franchise/outlet who requested/receives) ──
  if (isDestination) {
    if (status === "requested" && transferType === "request") {
      actions.push({ id: "amend", label: "Amend Request", variant: "outline" });
      actions.push({ id: "withdraw", label: "Withdraw", variant: "destructive" });
    }
    // Modification: post-approval, franchise can request qty changes (creates child transfer)
    if (["approved", "partially_approved", "dispatched", "partially_received"].includes(status) && transferType === "request") {
      actions.push({ id: "modification", label: "Request Modification", variant: "outline" });
    }
    if (status === "dispatched") {
      actions.push({ id: "receive", label: "Receive", variant: "default" });
      actions.push({ id: "report-issue", label: "Report Issue", variant: "destructive" });
    } else if (status === "partially_received") {
      // Follow-up receive for next dispatch wave
      // (only show if there's dispatched qty to receive — backend handles validation)
      actions.push({ id: "receive", label: "Receive", variant: "default" });
    }
  }

  return actions;
}
