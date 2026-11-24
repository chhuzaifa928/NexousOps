"use client";

import { ArrowRight, Bot, Boxes, Database, FileJson, Network, Server } from "lucide-react";
import { useState } from "react";
import { getToolCatalog } from "@/lib/tools";
import type { ServiceStatus } from "@/lib/types";

interface SystemTopologyProps {
  discovered: boolean;
  status: ServiceStatus | null;
}

export default function SystemTopology({ discovered, status }: SystemTopologyProps) {
  const tools = getToolCatalog(discovered);
  const [selectedToolId, setSelectedToolId] = useState(tools[0]?.id ?? "");
  const selectedTool = tools.find((tool) => tool.id === selectedToolId) ?? tools[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
      <section className="hairline-card p-4 shadow-card">
        <div className="flex items-center gap-2">
          <Network size={16} className="text-synapse" />
          <div>
            <h2 className="text-sm font-bold text-ink">Live MCP Topology</h2>
            <p className="text-[11px] text-muted">
              Zero-rewrite bridge from polyglot services to the Copilot.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
          <TopologyNode
            icon={Boxes}
            title="System A"
            subtitle="TypeScript · Express"
            detail=":4001 · orders.sqlite"
            tone="cobalt"
            online={status?.orders.state === "online"}
          />
          <div className="flex items-center justify-center lg:min-w-[34px]">
            <ArrowRight size={18} className="rotate-90 text-muted lg:rotate-0" />
          </div>
          <div className="flex flex-1 flex-col gap-3">
            <TopologyNode
              icon={Server}
              title="orders-mcp"
              subtitle="Synapse MCP · stdio"
              detail={`${tools.filter((tool) => tool.serverKey === "orders").length} typed tools`}
              tone="cobalt"
              online={status?.orders.state === "online"}
            />
            <TopologyNode
              icon={Database}
              title="warehouse-support-mcp"
              subtitle="Synapse MCP · stdio"
              detail="5 typed tools"
              tone="synapse"
              online={status?.warehouse.state === "online"}
            />
          </div>
          <div className="flex items-center justify-center lg:min-w-[34px]">
            <ArrowRight size={18} className="rotate-90 text-muted lg:rotate-0" />
          </div>
          <TopologyNode
            icon={Bot}
            title="Copilot"
            subtitle="Tool-calling agent"
            detail="Traces + safety gate"
            tone="synapse"
            online
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-hairline bg-limestone/50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              Orders service schema
            </p>
            <p className="mono mt-1.5 text-[10px] leading-relaxed text-ink">
              customers(customer_id, tier, lifetime_value, cod_rejection_rate)
            </p>
            <p className="mono mt-1 text-[10px] leading-relaxed text-ink">
              orders(order_id, sku, status, delay_hours, priority_flagged)
            </p>
          </div>
          <div className="rounded-lg border border-hairline bg-limestone/50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              Warehouse service schema
            </p>
            <p className="mono mt-1.5 text-[10px] leading-relaxed text-ink">
              inventory(sku, physical_stock, reserved_units, pending_restock_qty)
            </p>
            <p className="mono mt-1 text-[10px] leading-relaxed text-ink">
              support_tickets(ticket_id, priority, sentiment_score, sla_minutes_remaining)
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-[11px] text-synapse">
          <Boxes size={13} />
          Both MCP servers were generated with{" "}
          <span className="mono font-semibold">synapse build --auto --smart-names</span>.
        </div>
      </section>

      <section className="hairline-card overflow-hidden shadow-card">
        <div className="flex items-center gap-2 border-b border-hairline p-4">
          <FileJson size={16} className="text-cobalt" />
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-ink">Schema Explorer</h2>
            <p className="text-[11px] text-muted">
              {tools.length} discovered tool signatures · click to inspect.
            </p>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto border-b border-hairline">
          {tools.map((tool) => {
            const active = selectedTool?.id === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setSelectedToolId(tool.id)}
                className={`focus-ring flex w-full items-center gap-2 border-b border-hairline px-3 py-2 text-left last:border-0 ${
                  active ? "bg-blue-50" : "bg-white hover:bg-limestone"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    tool.serverKey === "orders" ? "bg-cobalt" : "bg-synapse"
                  }`}
                />
                <span className="mono min-w-0 flex-1 truncate text-[11px] font-semibold text-ink">
                  {tool.name}
                </span>
                <span className="mono shrink-0 text-[9px] text-muted">{tool.method}</span>
                {tool.mutating ? (
                  <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-warning">
                    WRITE
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {selectedTool ? (
          <div className="p-4">
            <p className="text-xs font-bold text-ink">{selectedTool.name}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              {selectedTool.description}
            </p>
            <p className="mono mt-2 text-[10px] text-cobalt">
              {selectedTool.method} {selectedTool.endpoint}
            </p>
            <pre className="mono mt-3 max-h-72 overflow-auto rounded-md bg-limestone p-3 text-[10px] leading-relaxed text-ink">
              {JSON.stringify(
                {
                  name: selectedTool.name,
                  server: selectedTool.server,
                  method: selectedTool.method,
                  endpoint: selectedTool.endpoint,
                  mutating: selectedTool.mutating,
                  inputSchema: selectedTool.inputSchema,
                  output: selectedTool.outputSummary,
                },
                null,
                2,
              )}
            </pre>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function TopologyNode({
  icon: Icon,
  title,
  subtitle,
  detail,
  tone,
  online,
}: {
  icon: typeof Boxes;
  title: string;
  subtitle: string;
  detail: string;
  tone: "cobalt" | "synapse";
  online: boolean;
}) {
  const color = tone === "cobalt" ? "text-cobalt border-blue-200" : "text-synapse border-teal-200";
  return (
    <div className={`flex min-w-0 items-center gap-2.5 rounded-lg border bg-white p-3 ${color}`}>
      <span className={`shrink-0 rounded-md bg-limestone p-2 ${color.split(" ")[0]}`}>
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-ink">{title}</p>
        <p className="truncate text-[10px] text-muted">{subtitle}</p>
        <p className="mono truncate text-[10px] text-muted">{detail}</p>
      </div>
      <span
        className={`ml-auto h-2 w-2 shrink-0 rounded-full ${
          online ? "bg-success" : "bg-critical"
        }`}
      />
    </div>
  );
}
