"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Loader2,
  Play,
  RotateCcw,
  Server,
  Terminal,
} from "lucide-react";

interface LiveDiscoverPanelProps {
  active: boolean;
  running: boolean;
  output: string[];
  onRun: (action: "activate" | "deactivate") => void;
}

export default function LiveDiscoverPanel({
  active,
  running,
  output,
  onRun,
}: LiveDiscoverPanelProps) {
  const steps = [
    { label: "Find the check", done: active },
    { label: "Add the check", done: active },
    { label: "Ready to ask", done: active },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-hairline bg-white shadow-card">
      <div className="flex flex-col gap-4 border-b border-hairline p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl bg-teal-50 p-2 text-synapse">
              <Terminal size={16} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                Guided walkthrough
              </p>
              <h2 className="text-sm font-bold text-ink">Add the COD risk check</h2>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                active
                  ? "border-emerald-200 bg-emerald-50 text-success"
                  : "border-hairline bg-limestone text-muted"
              }`}
            >
              {active ? <CheckCircle2 size={10} /> : <CircleDot size={10} />}
              {active ? "5 checks available" : "4 checks · new one hidden"}
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            With one click, NexusOps reveals the hidden COD risk check, scans the orders system, and
            makes the new check available in the Copilot.
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => onRun("activate")}
            disabled={running || active}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-cobalt px-3.5 py-2.5 text-xs font-semibold text-white shadow-card transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
            Add the new check
          </button>
          <button
            type="button"
            onClick={() => onRun("deactivate")}
            disabled={running || !active}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl border border-hairline bg-white px-3.5 py-2.5 text-xs font-semibold text-muted transition-colors hover:bg-limestone disabled:opacity-50"
          >
            <RotateCcw size={13} />
            Reset
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-hairline bg-limestone/40 px-4 py-3 sm:px-5">
        {steps.map((step, index) => (
          <div key={step.label} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                step.done
                  ? "border-emerald-200 bg-white text-success"
                  : "border-hairline bg-white text-muted"
              }`}
            >
              {step.done ? <CheckCircle2 size={11} /> : <CircleDot size={11} />}
              <span className="mono text-[9px]">0{index + 1}</span>
              {step.label}
            </div>
            {index < steps.length - 1 ? <ArrowRight size={12} className="text-hairline" /> : null}
          </div>
        ))}
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="border-b border-hairline p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            What runs behind the scenes
          </p>
          <pre className="mono mt-2 overflow-x-auto rounded-xl bg-limestone p-3 text-[11px] leading-relaxed text-ink">
            npx @2ndbrainlabs-ai/synapse-cli build --discover --smart-names
          </pre>
          <div className="mt-4 space-y-2 text-[11px]">
            <InfoRow label="System" value="Orders" />
            <InfoRow label="Connection" value="Stable" />
            <InfoRow label="Checks available" value={active ? "5" : "4"} />
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] text-cobalt">
            <Server size={13} />
            Your current connection and checks stay exactly as they are.
          </div>
        </div>

        <div className="bg-limestone/50 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              Progress
            </p>
            <span className="mono text-[9px] text-muted">{output.length} lines</span>
          </div>
          <motion.div
            key={output.join("|")}
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            className="mono mt-2 max-h-44 overflow-auto rounded-xl border border-hairline bg-white p-3 text-[10px] leading-relaxed text-ink"
          >
            {output.length === 0 ? (
              <span className="text-muted">Ready. Run the discovery demo to stream output here.</span>
            ) : (
              output.map((line, index) => <div key={`${index}-${line}`}>{line}</div>)
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="mono font-semibold text-ink">{value}</span>
    </div>
  );
}
