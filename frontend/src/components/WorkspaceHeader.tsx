"use client";

import { Command, RefreshCw, Search, Sparkles, Wand2 } from "lucide-react";
import { VIEW_META, type WorkspaceView } from "@/lib/navigation";

interface WorkspaceHeaderProps {
  view: WorkspaceView;
  discovered: boolean;
  discovering: boolean;
  refreshing: boolean;
  generatedAt?: string;
  onOpenCopilot: () => void;
  onRefresh: () => void;
  onOpenDiscovery: () => void;
}

export default function WorkspaceHeader({
  view,
  discovered,
  discovering,
  refreshing,
  generatedAt,
  onOpenCopilot,
  onRefresh,
  onOpenDiscovery,
}: WorkspaceHeaderProps) {
  const meta = VIEW_META[view];

  return (
    <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          <span>NexusOps</span>
          <span className="text-hairline">/</span>
          <span className="text-cobalt">{meta.label}</span>
        </div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-ink sm:text-[28px]">
          {meta.title}
        </h1>
        <p className="mt-1 max-w-2xl text-xs text-muted sm:text-sm">{meta.description}</p>
        <p className="mono mt-2 text-[10px] text-muted">
          Last synced {generatedAt ? new Date(generatedAt).toLocaleTimeString() : "—"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onOpenCopilot}
          className="focus-ring hidden h-10 min-w-[230px] items-center gap-2 rounded-xl border border-hairline bg-white px-3 text-xs text-muted shadow-card transition-colors hover:border-cobalt sm:flex"
        >
          <Search size={14} />
          <span className="flex-1 text-left">Ask across both systems…</span>
          <span className="mono inline-flex items-center gap-0.5 rounded border border-hairline bg-limestone px-1.5 py-0.5 text-[9px]">
            <Command size={9} />K
          </span>
        </button>
        <button
          type="button"
          onClick={onRefresh}
          className="focus-ring grid h-10 w-10 place-items-center rounded-xl border border-hairline bg-white text-muted shadow-card transition-colors hover:border-cobalt hover:text-cobalt"
          aria-label="Refresh information"
          title="Refresh information"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
        </button>
        <button
          type="button"
          onClick={onOpenDiscovery}
          className="focus-ring inline-flex h-10 items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 text-xs font-semibold text-synapse transition-colors hover:bg-teal-100"
        >
          <Wand2 size={14} />
          {discovering ? "Working…" : discovered ? "View discovery" : "Try discovery"}
        </button>
        <button
          type="button"
          onClick={onOpenCopilot}
          className="focus-ring inline-flex h-10 items-center gap-2 rounded-xl bg-ink px-3 text-xs font-semibold text-white shadow-card transition-opacity hover:opacity-90"
        >
          <Sparkles size={14} />
          Ask Copilot
        </button>
      </div>
    </div>
  );
}
