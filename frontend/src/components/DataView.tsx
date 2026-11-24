"use client";

import { CheckCircle2, Database, Network, RefreshCw, Table2 } from "lucide-react";
import { useState } from "react";
import ServiceInspector from "./ServiceInspector";
import SystemTopology from "./SystemTopology";
import type { DatabaseTables, OverviewResponse, ServiceStatus } from "@/lib/types";

interface DataViewProps {
  overview: OverviewResponse | null;
  status: ServiceStatus | null;
  discovered: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

type DataSection = "connections" | "tables";

export default function DataView({
  overview,
  status,
  discovered,
  refreshing,
  onRefresh,
}: DataViewProps) {
  const [section, setSection] = useState<DataSection>("connections");
  const ordersOnline = status?.orders.state === "online";
  const warehouseOnline = status?.warehouse.state === "online";

  const databases: DatabaseTables = overview?.databases ?? {
    orders: null,
    warehouse: null,
  };

  return (
    <div className="space-y-5">
      <section className="hairline-card p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-cobalt">
              <Database size={18} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-ink">Simple view of your systems</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                NexusOps reads from two live systems. This page shows what is connected and what
                information is available, without changing anything.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="focus-ring inline-flex items-center gap-2 rounded-xl border border-hairline bg-white px-3 py-2.5 text-xs font-semibold text-muted transition-colors hover:border-cobalt hover:text-cobalt"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh data
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ConnectionCard
            title="Orders"
            description="Customer and delivery information"
            online={ordersOnline}
            detail={`${status?.orders.toolCount ?? 4} checks available`}
          />
          <ConnectionCard
            title="Warehouse & support"
            description="Stock levels and customer tickets"
            online={warehouseOnline}
            detail={`${status?.warehouse.toolCount ?? 5} checks available`}
          />
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSection("connections")}
          className={`focus-ring inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-colors ${
            section === "connections"
              ? "border-blue-200 bg-blue-50 text-cobalt"
              : "border-hairline bg-white text-muted hover:bg-limestone"
          }`}
        >
          <Network size={14} />
          How systems connect
        </button>
        <button
          type="button"
          onClick={() => setSection("tables")}
          className={`focus-ring inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-colors ${
            section === "tables"
              ? "border-blue-200 bg-blue-50 text-cobalt"
              : "border-hairline bg-white text-muted hover:bg-limestone"
          }`}
        >
          <Table2 size={14} />
          Stored information
        </button>
      </div>

      <section className="rounded-2xl border border-hairline bg-white p-3 shadow-card sm:p-4">
        {section === "connections" ? (
          <SystemTopology discovered={discovered} status={status} />
        ) : (
          <ServiceInspector databases={databases} refreshing={refreshing} onRefresh={onRefresh} />
        )}
      </section>

      <section className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-[11px] leading-relaxed text-muted">
        <p className="font-bold text-cobalt">What this means</p>
        <p className="mt-1">
          The assistant uses these connections to answer questions. You do not need to change code
          or understand the underlying database to use NexusOps.
        </p>
      </section>
    </div>
  );
}

function ConnectionCard({
  title,
  description,
  online,
  detail,
}: {
  title: string;
  description: string;
  online: boolean;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-hairline bg-white p-3.5">
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
          online ? "bg-emerald-50 text-success" : "bg-red-50 text-critical"
        }`}
      >
        <CheckCircle2 size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-ink">{title}</p>
        <p className="mt-0.5 text-[11px] text-muted">{description}</p>
        <p className="mono mt-1 text-[10px] text-muted">{detail}</p>
      </div>
      <span
        className={`rounded-full px-2 py-1 text-[10px] font-bold ${
          online ? "bg-emerald-50 text-success" : "bg-red-50 text-critical"
        }`}
      >
        {online ? "Connected" : "Offline"}
      </span>
    </div>
  );
}
