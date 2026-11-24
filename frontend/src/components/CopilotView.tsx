"use client";

import { Bot, MessageSquare, Search, ShieldCheck, Sparkles } from "lucide-react";
import type { ComponentProps } from "react";
import CopilotPanel from "./CopilotPanel";

interface CopilotViewProps {
  copilotProps: ComponentProps<typeof CopilotPanel>;
}

const SUGGESTIONS = [
  {
    title: "Find urgent VIP delays",
    description: "See who is waiting and why.",
    icon: Search,
    prompt:
      "Which VIP customers have delayed orders, what is the warehouse bottleneck, and have they filed a support ticket?",
  },
  {
    title: "Prepare a safe repair plan",
    description: "Get recommendations without changes yet.",
    icon: ShieldCheck,
    prompt:
      "Draft a restock PO for the SKUs blocking VIP orders and escalate their support tickets — ask my confirmation first.",
  },
  {
    title: "Check COD fraud risk",
    description: "Available after discovery is enabled.",
    icon: Sparkles,
    prompt:
      "Use the newly discovered COD fraud-risk tool to find high-risk COD orders and check if those customers have open dispute tickets.",
  },
];

export default function CopilotView({ copilotProps }: CopilotViewProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)]">
      <section className="hairline-card p-4 shadow-card sm:p-5">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-synapse">
            <Bot size={17} />
          </span>
          <div>
            <h2 className="text-sm font-bold text-ink">Ask anything</h2>
            <p className="text-[11px] text-muted">Pick a starting point or write your own.</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {SUGGESTIONS.map((item) => {
            const Icon = item.icon;
            const locked = item.title.includes("COD") && !copilotProps.discovered;
            return (
              <button
                key={item.title}
                type="button"
                disabled={locked || copilotProps.loading}
                onClick={() => copilotProps.onSend(item.prompt)}
                className={`focus-ring flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                  locked
                    ? "cursor-not-allowed border-hairline bg-limestone text-muted/60"
                    : "border-hairline bg-white hover:border-teal-200 hover:bg-teal-50/40"
                }`}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-cobalt">
                  <Icon size={14} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-ink">{item.title}</span>
                  <span className="mt-0.5 block text-[11px] text-muted">{item.description}</span>
                  {locked ? (
                    <span className="mono mt-1 block text-[9px] font-semibold text-synapse">
                      Enable discovery first
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-cobalt">
            <MessageSquare size={12} />
            Plain language works best
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            Ask “Which orders are stuck?” or “What should I do first?” NexusOps will find the right
            checks and show its work.
          </p>
        </div>
      </section>

      <section className="h-[72vh] min-h-[520px] overflow-hidden rounded-2xl border border-hairline bg-white shadow-card">
        <CopilotPanel {...copilotProps} />
      </section>
    </div>
  );
}
