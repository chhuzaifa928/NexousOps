"use client";

import { AlertCircle, ArrowUpRight, Bot, ClipboardList, PackageX } from "lucide-react";
import { useMemo, useState } from "react";
import CrossSystemTable from "./CrossSystemTable";
import { formatCurrency, formatSla, statusTone, tierTone } from "@/lib/format";
import type { CrossSystemRow } from "@/lib/types";

interface OrdersViewProps {
  rows: CrossSystemRow[];
  discovered: boolean;
  onInvestigate: (row: CrossSystemRow) => void;
  onOpenCopilot: () => void;
}

type FilterKey = "all" | "urgent" | "vip" | "support";

const FILTERS: Array<{ id: FilterKey; label: string }> = [
  { id: "all", label: "All orders" },
  { id: "urgent", label: "Needs review" },
  { id: "vip", label: "VIP delays" },
  { id: "support", label: "Support risk" },
];

export default function OrdersView({
  rows,
  discovered,
  onInvestigate,
  onOpenCopilot,
}: OrdersViewProps) {
  const [filter, setFilter] = useState<FilterKey>("urgent");

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (filter === "urgent") {
          return (
            row.order.status === "Delayed" ||
            row.hasStockDeficit ||
            Boolean(row.ticket?.is_sla_critical)
          );
        }
        if (filter === "vip") return row.order.is_vip && row.order.status === "Delayed";
        if (filter === "support") return Boolean(row.ticket?.is_sla_critical || row.hasOpenTicket);
        return true;
      }),
    [rows, filter],
  );

  return (
    <div className="space-y-5">
      <section className="hairline-card p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-cobalt">
              <ClipboardList size={18} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-ink">Order queue</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Each card shows the customer, what is late, and whether stock or support is involved.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenCopilot}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-3.5 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Bot size={14} />
            Ask about an order
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`focus-ring rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                filter === item.id
                  ? "border-blue-200 bg-blue-50 text-cobalt"
                  : "border-hairline bg-white text-muted hover:bg-limestone"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        {filtered.length === 0 ? (
          <div className="hairline-card p-6 text-xs text-muted lg:col-span-2">
            No orders match this filter. Try another view.
          </div>
        ) : (
          filtered.map((row) => <OrderCard key={row.order.order_id} row={row} onInvestigate={onInvestigate} />)
        )}
      </section>

      <details className="hairline-card group overflow-hidden shadow-card">
        <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-xs font-semibold text-muted transition-colors hover:bg-limestone/40 sm:p-5">
          <span className="flex items-center gap-2">
            <ArrowUpRight size={14} />
            Open the detailed data table
          </span>
          <span className="text-[10px] font-normal text-muted group-open:hidden">Show advanced view</span>
          <span className="text-[10px] font-normal text-muted group-open:block hidden">Hide advanced view</span>
        </summary>
        <div className="border-t border-hairline p-3 sm:p-4">
          <CrossSystemTable rows={rows} discovered={discovered} onInvestigate={onInvestigate} />
        </div>
      </details>
    </div>
  );
}

function OrderCard({
  row,
  onInvestigate,
}: {
  row: CrossSystemRow;
  onInvestigate: (row: CrossSystemRow) => void;
}) {
  return (
    <article className="hairline-card p-4 shadow-card transition-shadow hover:shadow-drawer">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mono text-sm font-bold text-ink">{row.order.order_id}</span>
            <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${tierTone(row.order.customer_tier)}`}>
              {row.order.customer_tier}
            </span>
            <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${statusTone(row.order.status)}`}>
              {row.order.status}
            </span>
          </div>
          <p className="mt-2 text-xs font-semibold text-ink">
            {row.order.customer_name}
            <span className="font-normal text-muted"> · {row.order.customer_city}</span>
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            {row.order.delay_reason ?? "No delay reason recorded."}
          </p>
        </div>
        <span className="shrink-0 text-right">
          <span className="numeric block text-sm font-bold text-ink">
            {formatCurrency(row.order.total_amount)}
          </span>
          <span className="block text-[10px] text-muted">order value</span>
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Fact
          icon={AlertCircle}
          label="Delay"
          value={row.order.delay_hours ? `${row.order.delay_hours}h late` : "On track"}
          urgent={row.order.status === "Delayed"}
        />
        <Fact
          icon={PackageX}
          label="Stock"
          value={row.stock ? `${row.stock.net_available} units` : "Not found"}
          urgent={row.hasStockDeficit}
        />
        <Fact
          icon={ClipboardList}
          label="Support"
          value={
            row.ticket
              ? `${row.ticket.priority} · ${formatSla(row.ticket.sla_minutes_remaining)}`
              : "No ticket"
          }
          urgent={Boolean(row.ticket?.is_sla_critical)}
        />
      </div>

      <button
        type="button"
        onClick={() => onInvestigate(row)}
        className="focus-ring mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-cobalt hover:underline"
      >
        Investigate this order
        <ArrowUpRight size={12} />
      </button>
    </article>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
  urgent,
}: {
  icon: typeof AlertCircle;
  label: string;
  value: string;
  urgent: boolean;
}) {
  return (
    <div className="rounded-lg border border-hairline bg-limestone/50 p-2.5">
      <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-muted">
        <Icon size={10} />
        {label}
      </p>
      <p className={`mt-1 truncate text-[11px] font-semibold ${urgent ? "text-critical" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}
