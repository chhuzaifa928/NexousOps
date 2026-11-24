"use client";

import { AlertOctagon, CircleDollarSign, ClockAlert, PackageX } from "lucide-react";
import type { Kpis } from "@/lib/types";
import { formatCompactCurrency } from "@/lib/format";

interface KpiRibbonProps {
  kpis: Kpis | null;
}

const CARDS = [
  {
    key: "delayedVipOrders" as const,
    label: "Delayed VIP orders",
    source: "From orders",
    icon: ClockAlert,
    accent: "bg-red-50 text-critical",
    bar: "bg-critical",
  },
  {
    key: "stockoutBottlenecks" as const,
    label: "Stockout bottlenecks",
    source: "From warehouse stock",
    icon: PackageX,
    accent: "bg-amber-50 text-warning",
    bar: "bg-warning",
  },
  {
    key: "slaCriticalTickets" as const,
    label: "SLA-critical tickets",
    source: "From support tickets",
    icon: AlertOctagon,
    accent: "bg-red-50 text-critical",
    bar: "bg-critical",
  },
  {
    key: "revenueAtRisk" as const,
    label: "Revenue at risk",
    source: "Combined estimate",
    icon: CircleDollarSign,
    accent: "bg-blue-50 text-cobalt",
    bar: "bg-cobalt",
  },
];

export default function KpiRibbon({ kpis }: KpiRibbonProps) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const raw = kpis ? kpis[card.key] : 0;
        const value = kpis
          ? card.key === "revenueAtRisk"
            ? formatCompactCurrency(kpis.revenueAtRisk)
            : String(kpis[card.key])
          : "—";
        const progress = kpis ? Math.min(100, Math.max(10, raw * 8)) : 0;

        return (
          <article
            key={card.key}
            className="group relative overflow-hidden rounded-xl border border-hairline bg-white p-4 shadow-card transition-transform duration-200 hover:-translate-y-0.5"
          >
            <span className={`absolute inset-x-0 top-0 h-0.5 ${card.bar}`} />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-muted">{card.label}</p>
                <p className="numeric mt-2 text-[28px] font-extrabold leading-none tracking-tight text-ink">
                  {value}
                </p>
              </div>
              <span className={`rounded-xl p-2.5 ${card.accent}`}>
                <Icon size={18} />
              </span>
            </div>
            <p className="mono mt-3 text-[10px] text-muted">{card.source}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-limestone">
              <div
                className={`h-full rounded-full transition-all duration-500 ${card.bar}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </article>
        );
      })}
    </section>
  );
}
