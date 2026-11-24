"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Clock3, Terminal } from "lucide-react";
import { useState } from "react";
import type { ToolTrace } from "@/lib/types";

interface ToolExecutionCardProps {
  trace: ToolTrace;
}

export default function ToolExecutionCard({ trace }: ToolExecutionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isTypeScript = trace.server.startsWith("TS:");

  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-white">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="focus-ring flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-limestone"
      >
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded border px-2 py-0.5 font-mono text-[10px] font-semibold ${
            isTypeScript
              ? "border-blue-200 bg-blue-50 text-cobalt"
              : "border-teal-200 bg-teal-50 text-synapse"
          }`}
        >
          <Terminal size={11} />
          {trace.server}
        </span>
        <span className="min-w-0 flex-1">
          <span className="mono block truncate text-xs font-semibold text-ink">{trace.tool}</span>
          <span className="mono block truncate text-[10px] text-muted">
            {trace.method} {trace.endpoint}
          </span>
        </span>
        <span className="mono inline-flex shrink-0 items-center gap-1 text-[11px] text-muted">
          <Clock3 size={11} />
          {trace.latencyMs}ms
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            trace.status === "success" ? "bg-emerald-50 text-success" : "bg-red-50 text-critical"
          }`}
        >
          {trace.status}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="payloads"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-hairline"
          >
            <div className="grid gap-3 p-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Request
                </p>
                <pre className="mono max-h-48 overflow-auto rounded-md bg-limestone p-2 text-[10px] leading-relaxed text-ink">
                  {JSON.stringify(trace.request, null, 2)}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Response
                </p>
                <pre className="mono max-h-48 overflow-auto rounded-md bg-limestone p-2 text-[10px] leading-relaxed text-ink">
                  {JSON.stringify(trace.response, null, 2)}
                </pre>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
