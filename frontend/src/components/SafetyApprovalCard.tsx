"use client";

import { AlertTriangle, CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import type { PendingPlan } from "@/lib/types";

interface SafetyApprovalCardProps {
  plan: PendingPlan;
  approving: boolean;
  onApprove: () => void;
  onCancel: () => void;
}

export default function SafetyApprovalCard({
  plan,
  approving,
  onApprove,
  onCancel,
}: SafetyApprovalCardProps) {
  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50/70 p-3.5">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 rounded-md bg-white p-1.5 text-warning">
          <ShieldAlert size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">{plan.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{plan.summary}</p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-warning">
            <AlertTriangle size={12} />
            Human approval required — no SQLite writes have occurred.
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {plan.writes.map((write) => (
          <div key={write.id} className="rounded-lg border border-amber-200 bg-white p-2.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold text-ink">{write.label}</p>
              <span
                className={`mono shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                  write.server.startsWith("TS:")
                    ? "bg-blue-50 text-cobalt"
                    : "bg-teal-50 text-synapse"
                }`}
              >
                {write.server}
              </span>
            </div>
            <p className="mono mt-1 truncate text-[10px] text-muted">
              {write.method} {write.endpoint}
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{write.reason}</p>
            <p className="mono mt-1.5 rounded bg-limestone px-2 py-1 text-[10px] text-ink">
              {write.impact}
            </p>
            <pre className="mono mt-2 max-h-32 overflow-auto rounded bg-limestone p-2 text-[10px] leading-relaxed text-ink">
              {JSON.stringify(write.body, null, 2)}
            </pre>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onApprove}
          disabled={approving}
          className="focus-ring inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-cobalt px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          <CheckCircle2 size={14} />
          {approving ? "Executing…" : "Approve & Execute Changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={approving}
          className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-hairline bg-white px-3 py-2 text-xs font-semibold text-muted transition-colors hover:bg-limestone disabled:opacity-60"
        >
          <XCircle size={14} />
          Cancel
        </button>
      </div>
    </div>
  );
}
