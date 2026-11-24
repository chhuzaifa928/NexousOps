"use client";

import { Database, RefreshCw } from "lucide-react";
import { useState } from "react";
import type { DatabaseTables } from "@/lib/types";

interface ServiceInspectorProps {
  databases: DatabaseTables;
  refreshing: boolean;
  onRefresh: () => void;
}

type OrdersTable = "customers" | "orders";
type WarehouseTable = "inventory" | "support_tickets";

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function RawTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) {
    return <p className="p-4 text-xs text-muted">No rows available.</p>;
  }

  const columns = Object.keys(rows[0]);

  return (
    <div className="max-h-[420px] overflow-auto">
      <table className="w-full min-w-max border-collapse text-left">
        <thead className="limestone-header sticky top-0 z-10">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className="mono whitespace-nowrap border-b border-hairline px-3 py-2 text-[10px] font-semibold text-muted"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-hairline last:border-0 hover:bg-limestone/60">
              {columns.map((column) => (
                <td
                  key={column}
                  className="mono max-w-[240px] truncate whitespace-nowrap px-3 py-2 text-[10px] text-ink"
                  title={displayValue(row[column])}
                >
                  {displayValue(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ServiceInspector({
  databases,
  refreshing,
  onRefresh,
}: ServiceInspectorProps) {
  const [ordersTable, setOrdersTable] = useState<OrdersTable>("orders");
  const [warehouseTable, setWarehouseTable] = useState<WarehouseTable>("inventory");

  const ordersRows =
    ordersTable === "orders"
      ? databases.orders?.tables.orders ?? []
      : databases.orders?.tables.customers ?? [];
  const warehouseRows =
    warehouseTable === "inventory"
      ? databases.warehouse?.tables.inventory ?? []
      : databases.warehouse?.tables.support_tickets ?? [];

  return (
    <div>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-cobalt" />
          <div>
            <h2 className="text-sm font-bold text-ink">Raw Service & Database Inspector</h2>
            <p className="text-[11px] text-muted">
              Source-of-truth SQLite rows for post-approval mutation verification.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-hairline bg-white px-3 py-2 text-xs font-semibold text-ink hover:bg-limestone disabled:opacity-60"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          Refresh live databases
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="hairline-card overflow-hidden shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline p-3">
            <div>
              <p className="text-xs font-bold text-ink">orders.sqlite</p>
              <p className="mono text-[10px] text-muted">System A · TypeScript · :4001</p>
            </div>
            <div className="flex rounded-md border border-hairline bg-limestone p-0.5">
              {(["orders", "customers"] as const).map((table) => (
                <button
                  key={table}
                  type="button"
                  onClick={() => setOrdersTable(table)}
                  className={`focus-ring rounded px-2 py-1 text-[10px] font-semibold ${
                    ordersTable === table ? "bg-white text-cobalt shadow-card" : "text-muted"
                  }`}
                >
                  {table}
                </button>
              ))}
            </div>
          </div>
          <p className="mono border-b border-hairline bg-white px-3 py-1.5 text-[10px] text-muted">
            {ordersRows.length} rows
          </p>
          {databases.orders ? (
            <RawTable rows={ordersRows} />
          ) : (
            <p className="p-4 text-xs text-critical">orders-service is offline.</p>
          )}
        </section>

        <section className="hairline-card overflow-hidden shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline p-3">
            <div>
              <p className="text-xs font-bold text-ink">warehouse.sqlite</p>
              <p className="mono text-[10px] text-muted">System B · Python · :4002</p>
            </div>
            <div className="flex rounded-md border border-hairline bg-limestone p-0.5">
              {(["inventory", "support_tickets"] as const).map((table) => (
                <button
                  key={table}
                  type="button"
                  onClick={() => setWarehouseTable(table)}
                  className={`focus-ring rounded px-2 py-1 text-[10px] font-semibold ${
                    warehouseTable === table ? "bg-white text-synapse shadow-card" : "text-muted"
                  }`}
                >
                  {table}
                </button>
              ))}
            </div>
          </div>
          <p className="mono border-b border-hairline bg-white px-3 py-1.5 text-[10px] text-muted">
            {warehouseRows.length} rows
          </p>
          {databases.warehouse ? (
            <RawTable rows={warehouseRows} />
          ) : (
            <p className="p-4 text-xs text-critical">warehouse-support-service is offline.</p>
          )}
        </section>
      </div>
    </div>
  );
}
