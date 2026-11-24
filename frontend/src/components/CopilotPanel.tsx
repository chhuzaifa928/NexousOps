"use client";

import { motion } from "framer-motion";
import {
  AlertCircle,
  Bot,
  Loader2,
  Network,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import SafetyApprovalCard from "./SafetyApprovalCard";
import ToolExecutionCard from "./ToolExecutionCard";
import type { CopilotMessage, PendingPlan } from "@/lib/types";

interface CopilotPanelProps {
  messages: CopilotMessage[];
  loading: boolean;
  approving: boolean;
  pendingPlan: PendingPlan | null;
  discovered: boolean;
  onSend: (message: string) => void;
  onApprove: () => void;
  onCancel: () => void;
  onClose?: () => void;
  mobile?: boolean;
}

const DEMO_PROMPTS = [
  {
    id: "vip",
    label: "VIP bottleneck investigation",
    hint: "Join orders, stock and SLA data",
    prompt:
      "Which VIP customers have delayed orders, what is the warehouse bottleneck, and have they filed a support ticket?",
    requiresDiscovery: false,
    icon: Search,
  },
  {
    id: "remediate",
    label: "Draft remediation plan",
    hint: "Restock + escalate with approval",
    prompt:
      "Draft a restock PO for the SKUs blocking VIP orders and escalate their support tickets — ask my confirmation first.",
    requiresDiscovery: false,
    icon: ShieldCheck,
  },
  {
    id: "cod",
    label: "COD fraud-risk join",
    hint: "Unlocked by live discovery",
    prompt:
      "Use the newly discovered COD fraud-risk tool to find high-risk COD orders and check if those customers have open dispute tickets.",
    requiresDiscovery: true,
    icon: Network,
  },
];

export default function CopilotPanel({
  messages,
  loading,
  approving,
  pendingPlan,
  discovered,
  onSend,
  onApprove,
  onCancel,
  onClose,
  mobile = false,
}: CopilotPanelProps) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pendingPlan, loading]);

  function submit() {
    const value = input.trim();
    if (!value || loading) return;
    onSend(value);
    setInput("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-ink text-white">
            <Bot size={18} />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-success" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-ink">AI Operations Copilot</h2>
            <p className="text-[11px] text-muted">Cross-system orchestration engine</p>
          </div>
        </div>
        {mobile ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Copilot"
            className="focus-ring rounded-md p-1.5 text-muted hover:bg-limestone"
          >
            <X size={18} />
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2 py-1 text-[10px] font-bold text-synapse">
            <span className="h-1.5 w-1.5 rounded-full bg-synapse" />
            LIVE
          </span>
        )}
      </div>

      <div className="shrink-0 border-b border-hairline bg-limestone/30 px-4 py-3">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          <Sparkles size={12} className="text-cobalt" />
          Guided workflows
        </p>
        <div className="space-y-1.5">
          {DEMO_PROMPTS.map((prompt) => {
            const Icon = prompt.icon;
            const disabled = prompt.requiresDiscovery && !discovered;
            return (
              <button
                key={prompt.id}
                type="button"
                disabled={disabled || loading}
                title={disabled ? "Run the Live --discover Demo first" : prompt.prompt}
                onClick={() => onSend(prompt.prompt)}
                className={`focus-ring flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors ${
                  disabled
                    ? "cursor-not-allowed border-hairline bg-limestone text-muted/60"
                    : "border-hairline bg-white text-ink hover:border-cobalt hover:bg-blue-50/40"
                }`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                    disabled ? "bg-white text-muted/60" : "bg-blue-50 text-cobalt"
                  }`}
                >
                  <Icon size={13} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-bold">{prompt.label}</span>
                  <span className="block truncate text-[10px] text-muted">{prompt.hint}</span>
                </span>
                {prompt.requiresDiscovery ? (
                  <span className="mono shrink-0 text-[9px] font-semibold text-synapse">
                    {discovered ? "READY" : "LOCKED"}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="app-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={`max-w-[96%] rounded-2xl border px-3 py-2.5 ${
                message.role === "user"
                  ? "rounded-br-sm border-blue-200 bg-blue-50"
                  : "rounded-bl-sm border-hairline bg-white shadow-card"
              }`}
            >
              <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                {message.role === "user" ? (
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-cobalt text-[8px] text-white">
                    AM
                  </span>
                ) : (
                  <Bot size={11} className="text-synapse" />
                )}
                {message.role === "user" ? "Operations manager" : message.workflow ?? "Copilot"}
              </p>
              <p className="whitespace-pre-line text-xs leading-relaxed text-ink">{message.content}</p>

              {message.traces && message.traces.length > 0 ? (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                    Tool execution trace · {message.traces.length} call
                    {message.traces.length === 1 ? "" : "s"}
                  </p>
                  {message.traces.map((trace) => (
                    <ToolExecutionCard key={trace.id} trace={trace} />
                  ))}
                </div>
              ) : null}
            </div>
          </motion.div>
        ))}

        {pendingPlan ? (
          <SafetyApprovalCard
            plan={pendingPlan}
            approving={approving}
            onApprove={onApprove}
            onCancel={onCancel}
          />
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 rounded-xl border border-hairline bg-limestone px-3 py-2 text-xs text-muted">
            <Loader2 size={14} className="animate-spin text-cobalt" />
            Orchestrating tools across orders-mcp and warehouse-support-mcp…
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 border-t border-hairline bg-white px-4 py-3">
        <div className="flex items-end gap-2 rounded-xl border border-hairline bg-limestone/40 p-2 transition-colors focus-within:border-cobalt focus-within:bg-white">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            rows={2}
            placeholder="Ask about delayed VIPs, stock deficits, SLAs, or COD risk…"
            className="max-h-28 min-h-[44px] flex-1 resize-none border-0 bg-transparent px-1 text-xs text-ink outline-none placeholder:text-muted/70"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cobalt text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted">
          <AlertCircle size={10} className="text-warning" />
          State-mutating tools always require explicit approval.
        </p>
      </div>
    </div>
  );
}
