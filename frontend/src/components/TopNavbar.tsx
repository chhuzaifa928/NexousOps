"use client";

import { Activity, Bot, ChevronDown, Menu, Radio, Server, Wand2, Zap } from "lucide-react";
import { useState } from "react";
import { VIEW_META, type WorkspaceView } from "@/lib/navigation";
import { getToolCatalog, getServerToolCount } from "@/lib/tools";
import type { McpServerKey, ServiceStatus, ToolDefinition } from "@/lib/types";

interface McpDetailsData {
  id: string;
  transport: Record<string, unknown>;
  latency: number | null;
  tools: ToolDefinition[];
}

interface TopNavbarProps {
  view: WorkspaceView;
  discovered: boolean;
  status: ServiceStatus | null;
  discovering: boolean;
  onDiscover: () => void;
  onToggleNav: () => void;
  onOpenCopilot: () => void;
}

export default function TopNavbar({
  view,
  discovered,
  status,
  discovering,
  onDiscover,
  onToggleNav,
  onOpenCopilot,
}: TopNavbarProps) {
  const [openPill, setOpenPill] = useState<McpServerKey | null>(null);
  const bridgeActive = status?.orders.state === "online" && status?.warehouse.state === "online";

  const details = (serverKey: McpServerKey): McpDetailsData => {
    const tools = getToolCatalog(discovered).filter((tool) => tool.serverKey === serverKey);
    const server = status?.[serverKey];
    return {
      id: serverKey === "orders" ? "orders-mcp" : "warehouse-support-mcp",
      transport: {
        transport: "internal service binding",
        caller: "frontend",
        service: serverKey === "orders" ? "orders-service" : "warehouse-support-service",
        env: serverKey === "orders" ? "ORDERS_SERVICE_URL" : "WAREHOUSE_SERVICE_URL",
      },
      latency: server?.latencyMs ?? null,
      tools,
    };
  };

  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1800px] items-center gap-3 px-3 sm:px-5 lg:px-6">
        <button
          type="button"
          onClick={onToggleNav}
          aria-label="Open navigation"
          className="focus-ring rounded-md border border-hairline p-2 text-muted hover:bg-limestone lg:hidden"
        >
          <Menu size={18} />
        </button>

        <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink text-white">
            <Zap size={18} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-extrabold tracking-tight text-ink sm:text-base">
              NexusOps
            </h1>
            <p className="hidden text-[10px] font-medium text-muted sm:block">
              Operations app
            </p>
          </div>
        </div>

        <div className="hidden min-w-0 items-center gap-2 lg:flex">
          <span className="text-xs font-bold text-ink">NexusOps</span>
          <span className="text-hairline">/</span>
          <span className="truncate text-xs text-muted">{VIEW_META[view].label}</span>
        </div>

        <div className="ml-2 hidden items-center gap-1.5 rounded-full border border-hairline bg-limestone px-2.5 py-1.5 xl:inline-flex">
          <Activity size={12} className={bridgeActive ? "text-success" : "text-warning"} />
          <span className="whitespace-nowrap text-[10px] font-semibold text-muted">
            {bridgeActive ? "All systems connected" : "Checking connections"}
          </span>
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-2">
          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setOpenPill((current) => (current === "orders" ? null : "orders"))}
              className={`focus-ring inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                status?.orders.state === "online"
                  ? "border-blue-200 bg-blue-50 text-cobalt"
                  : "border-hairline bg-limestone text-muted"
              }`}
            >
              <Radio size={12} />
              Orders · {getServerToolCount("orders", discovered)} checks
              <ChevronDown size={11} />
            </button>
            {openPill === "orders" ? (
              <div className="absolute right-0 top-10 z-40 w-[380px] rounded-xl border border-hairline bg-white p-3 shadow-drawer">
                <McpDetails server={details("orders")} />
              </div>
            ) : null}
          </div>

          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() =>
                setOpenPill((current) => (current === "warehouse" ? null : "warehouse"))
              }
              className={`focus-ring inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                status?.warehouse.state === "online"
                  ? "border-teal-200 bg-teal-50 text-synapse"
                  : "border-hairline bg-limestone text-muted"
              }`}
            >
              <Server size={12} />
              Warehouse · 5 checks
              <ChevronDown size={11} />
            </button>
            {openPill === "warehouse" ? (
              <div className="absolute right-0 top-10 z-40 w-[380px] rounded-xl border border-hairline bg-white p-3 shadow-drawer">
                <McpDetails server={details("warehouse")} />
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onOpenCopilot}
            className="focus-ring hidden h-9 items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 text-[11px] font-semibold text-synapse transition-colors hover:bg-teal-100 lg:inline-flex xl:hidden"
          >
            <Bot size={13} />
            Copilot
          </button>

          <button
            type="button"
            onClick={onDiscover}
            disabled={discovering}
            className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-cobalt px-2.5 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60 sm:px-3"
          >
            <Wand2 size={13} />
            <span className="hidden sm:inline">
              {discovering ? "Adding check…" : discovered ? "Check added" : "Try new check"}
            </span>
            <span className="sm:hidden">Demo</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function McpDetails({ server }: { server: McpDetailsData }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-ink">{server.id}</p>
        <span className="mono text-[10px] text-muted">
          {server.latency === null ? "offline" : `${server.latency}ms`}
        </span>
      </div>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
        Technical details
      </p>
      <pre className="mono mt-1 max-h-28 overflow-auto rounded-md bg-limestone p-2 text-[10px] leading-relaxed text-ink">
        {JSON.stringify(server.transport, null, 2)}
      </pre>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
        Available checks
      </p>
      <ul className="mono mt-1 max-h-44 space-y-1 overflow-auto text-[10px] text-ink">
        {server.tools.map((tool) => (
          <li key={tool.id} className="truncate rounded bg-limestone px-2 py-1">
            {tool.name}({Object.keys(tool.inputSchema.properties ?? {}).join(", ")})
          </li>
        ))}
      </ul>
    </div>
  );
}
