import { formatTimestamp } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Check, Circle, X, AlertTriangle, Ban } from "lucide-react";

/**
 * StatusTimeline — Visual transfer lifecycle progression.
 *
 * Handles both request-based and direct-dispatch flows,
 * including branch paths for cancel/reject/partial.
 */

function getTimelineSteps(transfer) {
  if (!transfer) return [];

  const status = (transfer.status || "").toLowerCase();
  const type = (transfer.type || "").toLowerCase();
  const steps = [];

  // Step 1: Requested (only for request-based)
  if (type === "request" || transfer.requested_at) {
    steps.push({
      key: "requested",
      label: "Requested",
      timestamp: transfer.requested_at,
      actor: transfer.requested_by,
      completed: !!transfer.requested_at,
      active: status === "requested",
      icon: "circle",
    });
  }

  // Branch: Rejected (terminates after requested)
  if (status === "rejected") {
    steps.push({
      key: "rejected",
      label: "Rejected",
      timestamp: transfer.updated_at,
      actor: null,
      completed: true,
      active: true,
      icon: "x",
      isBranch: true,
    });
    return steps;
  }

  // Branch: Withdrawn (P17 — terminal, franchise-initiated)
  if (status === "withdrawn") {
    steps.push({
      key: "withdrawn",
      label: "Withdrawn",
      timestamp: transfer.updated_at,
      actor: null,
      completed: true,
      active: true,
      icon: "ban",
      isBranch: true,
    });
    return steps;
  }

  // Step 2: Partially Approved (P16 — intermediate state)
  if (status === "partially_approved" || (transfer.approved_at && ["partially_approved"].includes(status))) {
    steps.push({
      key: "partially_approved",
      label: "Partially Approved",
      timestamp: transfer.approved_at,
      actor: transfer.approved_by,
      completed: true,
      active: status === "partially_approved",
      icon: "alert",
    });
  }

  // Step 2b: Approved (only for request-based)
  if (type === "request" || transfer.approved_at) {
    const isPartial = status === "partially_approved";
    const approvedDone = !isPartial && (!!transfer.approved_at || ["approved", "dispatched", "received", "partially_received", "receive_dispute_pending"].includes(status));
    // Skip if partially_approved step already added AND status is still partially_approved
    if (!isPartial) {
      steps.push({
        key: "approved",
        label: "Approved",
        timestamp: isPartial ? null : transfer.approved_at,
        actor: transfer.approved_by,
        completed: approvedDone,
        active: status === "approved",
        icon: "circle",
      });
    }
  }

  // Step 3: Dispatched
  const dispatchedDone = !!transfer.dispatched_at || ["dispatched", "received", "partially_received", "receive_dispute_pending"].includes(status);
  steps.push({
    key: "dispatched",
    label: "Dispatched",
    timestamp: transfer.dispatched_at,
    actor: transfer.dispatched_by,
    completed: dispatchedDone,
    active: status === "dispatched",
    icon: "circle",
  });

  // Branch: Cancelled (can happen at various stages)
  if (status === "cancelled") {
    steps.push({
      key: "cancelled",
      label: "Cancelled",
      timestamp: transfer.cancelled_at,
      actor: transfer.cancelled_by,
      completed: true,
      active: true,
      icon: "ban",
      isBranch: true,
      reason: transfer.resolution_meta?.reason,
    });
    return steps;
  }

  // Step 3b: Receive Dispute Pending (P16)
  if (status === "receive_dispute_pending") {
    steps.push({
      key: "receive_dispute_pending",
      label: "Dispute Pending",
      timestamp: transfer.updated_at,
      actor: null,
      completed: true,
      active: true,
      icon: "alert",
    });
    return steps;
  }

  // Step 4: Received / Partially Received
  if (status === "partially_received") {
    steps.push({
      key: "partially_received",
      label: "Partially Received",
      timestamp: transfer.received_at,
      actor: transfer.received_by,
      completed: true,
      active: true,
      icon: "alert",
      reason: transfer.resolution_meta?.reason,
    });
  } else {
    const receivedDone = !!transfer.received_at || status === "received";
    steps.push({
      key: "received",
      label: "Received",
      timestamp: transfer.received_at,
      actor: transfer.received_by,
      completed: receivedDone,
      active: status === "received",
      icon: "circle",
    });
  }

  return steps;
}

function StepIcon({ step }) {
  const size = "h-4 w-4";

  if (step.icon === "x" || step.key === "rejected") {
    return <X className={cn(size, "text-rose-600")} />;
  }
  if (step.icon === "ban" || step.key === "cancelled") {
    return <Ban className={cn(size, "text-red-600")} />;
  }
  if (step.icon === "alert" || step.key === "partially_received") {
    return <AlertTriangle className={cn(size, "text-teal-600")} />;
  }
  if (step.completed) {
    return <Check className={cn(size, "text-emerald-600")} />;
  }
  if (step.active) {
    return <Circle className={cn(size, "text-blue-600 fill-blue-600")} />;
  }
  return <Circle className={cn(size, "text-muted-foreground/40")} />;
}

function getStepRingColor(step) {
  if (step.key === "rejected") return "border-rose-300 bg-rose-50";
  if (step.key === "cancelled") return "border-red-300 bg-red-50";
  if (step.key === "withdrawn") return "border-slate-300 bg-slate-50";
  if (step.key === "partially_received") return "border-teal-300 bg-teal-50";
  if (step.key === "partially_approved") return "border-sky-300 bg-sky-50";
  if (step.key === "receive_dispute_pending") return "border-orange-300 bg-orange-50";
  if (step.completed) return "border-emerald-300 bg-emerald-50";
  if (step.active) return "border-blue-400 bg-blue-50";
  return "border-muted bg-muted/30";
}

function getConnectorColor(step, nextStep) {
  if (step.completed && nextStep?.completed) return "bg-emerald-300";
  if (step.completed && nextStep?.active) return "bg-blue-300";
  return "bg-muted";
}

export default function StatusTimeline({ transfer }) {
  const steps = getTimelineSteps(transfer);

  if (steps.length === 0) return null;

  return (
    <div data-testid="status-timeline" className="mb-4">
      <div className="flex items-start gap-0 overflow-x-auto pb-2">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          return (
            <div key={step.key} className="flex items-start" data-testid={`timeline-step-${step.key}`}>
              {/* Step node */}
              <div className="flex flex-col items-center min-w-[100px] max-w-[140px]">
                {/* Icon ring */}
                <div
                  className={cn(
                    "h-8 w-8 rounded-full border-2 flex items-center justify-center shrink-0",
                    getStepRingColor(step)
                  )}
                >
                  <StepIcon step={step} />
                </div>

                {/* Label */}
                <p
                  className={cn(
                    "text-[10px] font-medium mt-1.5 text-center leading-tight",
                    step.active || step.completed ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>

                {/* Timestamp */}
                {step.timestamp && (
                  <p className="text-[9px] text-muted-foreground mt-0.5 text-center">
                    {formatTimestamp(step.timestamp)}
                  </p>
                )}

                {/* Reason (for branch steps) */}
                {step.reason && (
                  <p className="text-[9px] text-amber-600 mt-0.5 text-center max-w-[130px] truncate" title={step.reason}>
                    {step.reason}
                  </p>
                )}
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex items-center pt-3.5 px-0.5">
                  <div
                    className={cn(
                      "h-0.5 w-6 shrink-0",
                      getConnectorColor(step, steps[idx + 1])
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
