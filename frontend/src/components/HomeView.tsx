"use client";

import {
  ArrowRight,
  Bot,
  ClipboardList,
  FlaskConical,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import KpiRibbon from "./KpiRibbon";
import { formatCurrency, formatSla, tierTone } from "@/lib/format";
import type { WorkspaceView } from "@/lib/navigation";
import type { CrossSystemRow, OverviewResponse, ServiceStatus } from "@/lib/types";

interface HomeViewProps {
  overview: OverviewResponse | null;
  status: ServiceStatus | null;
  discovered: boolean;
  onSelectView: (view: WorkspaceView) => void;
  onInvestigate: (row: CrossSystemRow) => void;
  onOpenCopilot: () => void;
}

export default function HomeView({
  overview,
  status,
  discovered,
  onSelectView,
  onInvestigate,
  onOpenCopilot,
}: HomeViewProps) {
  const rows = overview?.rows ?? [];
  const priorities = rows
    .filter(
      (row) =>
        row.order.status === "Delayed" &&
        (row.order.is_vip || row.hasStockDeficit || row.ticket?.is_sla_critical),
    )
    .slice(0, 4);
  const allHealthy =
    status?.orders.state === "online" && status?.warehouse.state === "online";

  return (
    <div className="space-y-5">
      <section className="hero-surface relative overflow-hidden rounded-2xl shadow-card">
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-100 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-300" />
              Your operations at a glance
            </span>
            <h2 className="mt-4 max-w-xl text-2xl font-extrabold leading-[1.12] tracking-[-0.035em] text-white sm:text-3xl">
              Command the entire operation from one place.
            </h2>
            <p className="mt-3 max-w-xl text-xs leading-relaxed text-slate-200 sm:text-sm">
              Start with what needs attention. Ask questions in everyday language, review the
              evidence, and approve changes only when you are ready.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onSelectView("orders")}
                className="focus-ring inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-ink shadow-card transition-transform hover:-translate-y-0.5"
              >
                <ClipboardList size={14} className="text-cobalt" />
                Review priorities
              </button>
              <button
                type="button"
                onClick={onOpenCopilot}
                className="focus-ring inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-xs font-bold text-white backdrop-blur transition-colors hover:bg-white/15"
              >
                <Sparkles size={14} />
                Ask a question
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <HeroStat label="Systems connected" value={allHealthy ? "2 of 2" : "Check"} detail="live" />
            <HeroStat
              label="Available checks"
              value={String((status?.orders.toolCount ?? 4) + (status?.warehouse.toolCount ?? 5))}
              detail={discovered ? "including COD risk" : "ready to use"}
            />
            <HeroStat label="Answers" value="Traced" detail="every call shown" />
            <HeroStat label="Changes" value="Gated" detail="you approve first" />
          </div>
        </div>
      </section>

      <KpiRibbon kpis={overview?.kpis ?? null} />

      <section className="hairline-card p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-ink">Where to start</h2>
            <p className="mt-1 text-xs text-muted">Choose what you want to do today.</p>
          </div>
          <button
            type="button"
            onClick={() => onSelectView("orders")}
            className="focus-ring inline-flex items-center gap-1 text-xs font-semibold text-cobalt hover:underline"
          >
            See all orders
            <ArrowRight size={13} />
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <ActionCard
            icon={ClipboardList}
            title="Review urgent orders"
            description="See which customers are waiting and why."
            action="Open orders"
            onClick={() => onSelectView("orders")}
          />
          <ActionCard
            icon={MessageSquare}
            title="Ask the assistant"
            description="Get a clear answer with the sources shown."
            action="Open Copilot"
            onClick={() => onSelectView("copilot")}
          />
          <ActionCard
            icon={FlaskConical}
            title="Try a new check"
            description="Add the COD risk check without rewriting code."
            action="Open discovery"
            onClick={() => onSelectView("discovery")}
          />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <section className="hairline-card overflow-hidden shadow-card">
          <div className="flex items-center justify-between border-b border-hairline p-4 sm:p-5">
            <div>
              <h2 className="text-sm font-bold text-ink">Needs your attention</h2>
              <p className="mt-1 text-xs text-muted">The most important orders right now.</p>
            </div>
            <span className="mono rounded-full border border-hairline bg-limestone px-2 py-1 text-[10px] text-muted">
              {priorities.length} shown
            </span>
          </div>
          <div className="divide-y divide-hairline">
            {priorities.length === 0 ? (
              <div className="p-5 text-xs text-muted">Nothing urgent right now. Everything is moving normally.</div>
            ) : (
              priorities.map((row) => (
                <PriorityRow key={row.order.order_id} row={row} onInvestigate={onInvestigate} />
              ))
            )}
          </div>
        </section>

        <section className="hairline-card p-4 shadow-card sm:p-5">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-synapse" />
            <h2 className="text-sm font-bold text-ink">How NexusOps works</h2>
          </div>
          <div className="mt-4 space-y-4">
            <GuideStep
              number="1"
              icon={MessageSquare}
              title="Ask in plain English"
              description="Type what you want to know. No special commands needed."
            />
            <GuideStep
              number="2"
              icon={Search}
              title="See where it came from"
              description="Every answer shows the systems and calls used."
            />
            <GuideStep
              number="3"
              icon={ShieldCheck}
              title="Approve before changes"
              description="Nothing is written until you say yes."
            />
          </div>
          <button
            type="button"
            onClick={() => onSelectView("copilot")}
            className="focus-ring mt-5 w-full rounded-xl bg-ink px-3 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            Start with the Copilot
          </button>
        </section>
      </div>
    </div>
  );
}

function HeroStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-sm">
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-300">{label}</p>
      <p className="mt-1.5 text-xl font-extrabold tracking-tight text-white">{value}</p>
      <p className="mt-0.5 text-[10px] text-slate-300">{detail}</p>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  description,
  action,
  onClick,
}: {
  icon: typeof ClipboardList;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring group flex flex-col items-start rounded-xl border border-hairline bg-white p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-cobalt"
    >
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-cobalt">
        <Icon size={16} />
      </span>
      <h3 className="mt-3 text-xs font-bold text-ink">{title}</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">{description}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-cobalt">
        {action}
        <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

function GuideStep({
  number,
  icon: Icon,
  title,
  description,
}: {
  number: string;
  icon: typeof Search;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="mono grid h-7 w-7 shrink-0 place-items-center rounded-full border border-hairline bg-limestone text-[10px] font-bold text-cobalt">
        {number}
      </span>
      <div>
        <p className="flex items-center gap-1.5 text-xs font-bold text-ink">
          <Icon size={12} className="text-muted" />
          {title}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{description}</p>
      </div>
    </div>
  );
}

function PriorityRow({
  row,
  onInvestigate,
}: {
  row: CrossSystemRow;
  onInvestigate: (row: CrossSystemRow) => void;
}) {
  const delay = row.order.delay_hours ? `${row.order.delay_hours} hours late` : "Needs review";
  const stock = row.stock ? `${row.stock.net_available} units available` : "No stock record";
  const ticket = row.ticket
    ? `${row.ticket.ticket_id} · ${formatSla(row.ticket.sla_minutes_remaining)} left`
    : "No open ticket";

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mono text-xs font-bold text-ink">{row.order.order_id}</span>
          <span className="text-xs font-semibold text-muted">{row.order.customer_name}</span>
          <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${tierTone(row.order.customer_tier)}`}>
            {row.order.customer_tier}
          </span>
        </div>
        <p className="mt-1.5 text-[11px] text-ink">{delay} · {row.order.product_name}</p>
        <p className="mt-1 truncate text-[11px] text-muted">
          {row.order.delay_reason ?? "Waiting for review"}
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted">
          <span>Value {formatCurrency(row.order.total_amount)}</span>
          <span className={row.hasStockDeficit ? "font-semibold text-critical" : ""}>{stock}</span>
          <span className={row.ticket?.is_sla_critical ? "font-semibold text-critical" : ""}>
            {ticket}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onInvestigate(row)}
        className="focus-ring shrink-0 rounded-lg border border-hairline bg-white px-3 py-2 text-[11px] font-semibold text-cobalt transition-colors hover:border-cobalt hover:bg-blue-50"
      >
        Investigate
      </button>
    </div>
  );
}
