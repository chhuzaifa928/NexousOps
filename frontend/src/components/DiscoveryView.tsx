"use client";

import { ArrowRight, CheckCircle2, FlaskConical, Search, Sparkles } from "lucide-react";
import LiveDiscoverPanel from "./LiveDiscoverPanel";

interface DiscoveryViewProps {
  active: boolean;
  running: boolean;
  output: string[];
  onRun: (action: "activate" | "deactivate") => void;
}

export default function DiscoveryView({ active, running, output, onRun }: DiscoveryViewProps) {
  return (
    <div className="space-y-5">
      <section className="hero-surface relative overflow-hidden rounded-2xl shadow-card">
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative p-5 sm:p-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-100 backdrop-blur">
            <Sparkles size={12} />
            Guided demo
          </span>
          <h2 className="mt-4 max-w-2xl text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl">
            Add a new check without touching code.
          </h2>
          <p className="mt-3 max-w-2xl text-xs leading-relaxed text-slate-200 sm:text-sm">
            Today the assistant can check orders, stock and support. With one click, it will also
            learn to flag high-risk cash-on-delivery orders. Watch each step below.
          </p>
        </div>
      </section>

      <section className="hairline-card p-4 shadow-card sm:p-5">
        <h2 className="text-sm font-bold text-ink">What will happen</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Step
            number="1"
            icon={Search}
            title="Find the new check"
            description="NexusOps scans the orders service for a hidden route."
          />
          <Step
            number="2"
            icon={FlaskConical}
            title="Make it available"
            description="The new check is added to the assistant's toolkit."
          />
          <Step
            number="3"
            icon={CheckCircle2}
            title="Try it right away"
            description="A new suggested question appears in the Copilot."
          />
        </div>
      </section>

      <LiveDiscoverPanel active={active} running={running} output={output} onRun={onRun} />

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="hairline-card p-4 shadow-card">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Before</p>
          <p className="mt-2 text-xs text-ink">4 checks available</p>
          <p className="mt-1 text-[11px] text-muted">Orders, stock, customer and support lookups.</p>
        </div>
        <div className="hairline-card border-teal-200 p-4 shadow-card">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-synapse">After</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-ink">
            5 checks available
            <ArrowRight size={12} className="text-synapse" />
          </p>
          <p className="mt-1 text-[11px] text-muted">Plus the new COD fraud-risk check.</p>
        </div>
      </section>
    </div>
  );
}

function Step({
  number,
  icon: Icon,
  title,
  description,
}: {
  number: string;
  icon: typeof Search;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-limestone/40 p-4">
      <div className="flex items-center justify-between">
        <span className="mono grid h-7 w-7 place-items-center rounded-full bg-white text-[10px] font-bold text-cobalt">
          {number}
        </span>
        <Icon size={15} className="text-synapse" />
      </div>
      <p className="mt-3 text-xs font-bold text-ink">{title}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">{description}</p>
    </div>
  );
}
