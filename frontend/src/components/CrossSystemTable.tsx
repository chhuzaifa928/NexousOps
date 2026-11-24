"use client";

import { ArrowUpRight, Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { formatCurrency, formatSla, statusTone, stockTone, tierTone } from "@/lib/format";
import type { CrossSystemRow } from "@/lib/types";

interface CrossSystemTableProps {
  rows: CrossSystemRow[];
  discovered: boolean;
  onInvestigate: (row: CrossSystemRow) => void;
}

type FilterKey = "all" | "vip" | "deficit" | "ticket" | "cod";

const FILTERS: Array<{ id: FilterKey; label: string }> = [
  { id: "all", label: "All" },
  { id: "vip", label: "VIP Only" },
  { id: "deficit", label: "Stock Deficit" },
  { id: "ticket", label: "Open Ticket" },
  { id: "cod", label: "High COD Risk" },
];

export default function CrossSystemTable({ rows, discovered, onInvestigate }: CrossSystemTableProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "vip" && !row.order.is_vip) return false;
      if (filter === "deficit" && !row.hasStockDeficit) return false;
      if (filter === "ticket" && !row.hasOpenTicket) return false;
      if (filter === "cod" && !row.isHighCodRisk) return false;
      if (!needle) return true;
      return [
        row.order.order_id,
        row.order.customer_id,
        row.order.customer_name,
        row.order.sku,
        row.order.product_name,
        row.order.status,
        row.ticket?.ticket_id ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [rows, query, filter]);

  return (
    <div className="hairline-card overflow-hidden shadow-card">
      <div className="flex flex-col gap-3 border-b border-hairline p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-cobalt">
            <Filter size={15} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-ink">Unified cross-system matrix</h2>
              <span className="mono rounded-full border border-hairline bg-limestone px-2 py-0.5 text-[9px] font-semibold text-muted">
                {rows.length} orders
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[9px] font-semibold text-synapse">
                <span className="h-1.5 w-1.5 rounded-full bg-synapse" />
                live join
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted">
              Orders, inventory and support signals resolved into one operational queue.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative block">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search order, customer, SKU, ticket…"
              className="focus-ring w-full rounded-xl border border-hairline bg-white py-2 pl-8 pr-3 text-xs text-ink outline-none placeholder:text-muted/70 sm:w-64"
            />
          </label>
          <span className="mono shrink-0 text-[10px] text-muted">
            {filtered.length}/{rows.length} rows
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-hairline bg-white px-4 py-2.5">
        <Filter size={12} className="shrink-0 text-muted" />
        {FILTERS.map((item) => {
          const disabled = item.id === "cod" && !discovered;
          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => setFilter(item.id)}
              className={`focus-ring shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                filter === item.id
                  ? "border-cobalt bg-cobalt text-white"
                  : disabled
                    ? "cursor-not-allowed border-hairline bg-limestone text-muted/50"
                    : "border-hairline bg-white text-muted hover:border-cobalt hover:text-cobalt"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-collapse text-left">
          <thead className="limestone-header">
            <tr className="text-[10px] uppercase tracking-wider text-muted">
              <th className="sticky left-0 z-10 border-b border-hairline bg-limestone px-4 py-2.5 font-semibold">
                Order / Customer
              </th>
              <th className="border-b border-hairline px-3 py-2.5 font-semibold">Product</th>
              <th className="border-b border-hairline px-3 py-2.5 font-semibold">Order Status</th>
              <th className="border-b border-hairline px-3 py-2.5 font-semibold">Warehouse</th>
              <th className="border-b border-hairline px-3 py-2.5 font-semibold">Support SLA</th>
              <th className="border-b border-hairline px-3 py-2.5 font-semibold">Value</th>
              <th className="border-b border-hairline px-3 py-2.5 text-right font-semibold">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.order.order_id}
                className={`border-b border-hairline text-xs transition-colors last:border-0 hover:bg-limestone/60 ${
                  row.isHighCodRisk ? "bg-red-50/40" : ""
                }`}
              >
                <td className="sticky left-0 z-10 bg-white px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-limestone text-[10px] font-bold text-ink">
                      {row.order.customer_name
                        .split(" ")
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")}
                    </span>
                    <div className="min-w-0">
                      <p className="mono font-semibold text-ink">{row.order.order_id}</p>
                      <p className="truncate text-[11px] text-muted">
                        {row.order.customer_name} · {row.order.customer_id}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold ${tierTone(
                        row.order.customer_tier,
                      )}`}
                    >
                      {row.order.customer_tier}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <p className="max-w-[190px] truncate font-medium text-ink">
                    {row.order.product_name}
                  </p>
                  <p className="mono text-[10px] text-muted">{row.order.sku}</p>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-semibold ${statusTone(
                      row.order.status,
                    )}`}
                  >
                    {row.order.status}
                  </span>
                  {row.order.delay_hours ? (
                    <p className="mono mt-1 text-[10px] text-warning">
                      +{row.order.delay_hours}h delayed
                    </p>
                  ) : null}
                  {row.isHighCodRisk ? (
                    <p className="mono mt-1 text-[10px] font-semibold text-critical">
                      COD {Math.round(row.order.cod_rejection_rate * 100)}% risk
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  {row.stock ? (
                    <>
                      <p className={`numeric font-semibold ${stockTone(row.stock.net_available)}`}>
                        {row.stock.net_available} net units
                      </p>
                      <p className="mono text-[10px] text-muted">
                        {row.stock.physical_stock} physical · {row.stock.reserved_units} reserved
                      </p>
                      <p className="mono text-[10px] text-muted">
                        {row.stock.warehouse_zone} · {row.stock.supplier_name}
                      </p>
                    </>
                  ) : (
                    <span className="text-[11px] text-muted">No stock record</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  {row.ticket ? (
                    <>
                      <p className="mono font-semibold text-ink">{row.ticket.ticket_id}</p>
                      <p className="text-[10px] text-muted">{row.ticket.subject}</p>
                      <p
                        className={`mono text-[10px] font-semibold ${
                          row.ticket.is_sla_critical ? "text-critical" : "text-warning"
                        }`}
                      >
                        {formatSla(row.ticket.sla_minutes_remaining)} SLA ·{" "}
                        {row.ticket.sentiment_score.toFixed(2)} sentiment
                      </p>
                    </>
                  ) : (
                    <span className="text-[11px] text-muted">No ticket</span>
                  )}
                </td>
                <td className="numeric px-3 py-3 font-semibold text-ink">
                  {formatCurrency(row.order.total_amount)}
                </td>
                <td className="px-3 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onInvestigate(row)}
                    className="focus-ring inline-flex items-center gap-1 rounded-md border border-hairline bg-white px-2 py-1.5 text-[10px] font-semibold text-cobalt transition-colors hover:border-cobalt hover:bg-blue-50"
                  >
                    Investigate
                    <ArrowUpRight size={11} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted">
            No rows match the current search and filter selection.
          </div>
        ) : null}
      </div>

      <p className="border-t border-hairline bg-limestone/40 px-4 py-2 text-[10px] text-muted">
        Mobile tip: swipe horizontally inside the matrix. The first column stays pinned.
      </p>
    </div>
  );
}
