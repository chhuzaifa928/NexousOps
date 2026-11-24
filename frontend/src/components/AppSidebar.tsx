"use client";

import { motion } from "framer-motion";
import {
  Activity,
  Bot,
  ClipboardList,
  Database,
  FlaskConical,
  Home,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { VIEW_META, type WorkspaceView } from "@/lib/navigation";
import type { ServiceStatus } from "@/lib/types";

interface AppSidebarProps {
  activeView: WorkspaceView;
  discovered: boolean;
  status: ServiceStatus | null;
  onSelectView: (view: WorkspaceView) => void;
}

const MAIN_LINKS = [
  { id: "home" as const, label: "Home", icon: Home, hint: "Today's priorities" },
  { id: "orders" as const, label: "Orders", icon: ClipboardList, hint: "What needs attention" },
  { id: "copilot" as const, label: "Copilot", icon: Bot, hint: "Ask and get answers" },
];

const EXPLORE_LINKS = [
  { id: "data" as const, label: "Data", icon: Database, hint: "Connected information" },
  { id: "discovery" as const, label: "Discovery", icon: FlaskConical, hint: "Add a new check" },
];

export default function AppSidebar({
  activeView,
  discovered,
  status,
  onSelectView,
}: AppSidebarProps) {
  const ordersOnline = status?.orders.state === "online";
  const warehouseOnline = status?.warehouse.state === "online";
  const healthy = ordersOnline && warehouseOnline;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-hairline bg-white lg:flex">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-hairline px-5">
        <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-ink text-white">
          <Zap size={17} fill="currentColor" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-synapse" />
        </span>
        <div>
          <p className="text-sm font-extrabold tracking-tight text-ink">NexusOps</p>
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted">
            Operations app
          </p>
        </div>
      </div>

      <div className="px-3 pt-3">
        <div className="flex items-center gap-3 rounded-xl border border-hairline bg-limestone/70 px-3 py-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-cobalt shadow-card">
            <Activity size={15} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold text-ink">Operations Workspace</span>
            <span className="block text-[9px] text-muted">
              {healthy ? "All systems connected" : "Checking connections"}
            </span>
          </span>
          <span className={`h-2 w-2 rounded-full ${healthy ? "bg-success" : "bg-warning"}`} />
        </div>
      </div>

      <nav className="app-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-5">
        <p className="sidebar-label">Main</p>
        <div className="mt-2 space-y-1">
          {MAIN_LINKS.map((link) => (
            <NavButton
              key={link.id}
              link={link}
              active={activeView === link.id}
              onSelect={onSelectView}
            />
          ))}
        </div>

        <p className="sidebar-label mt-7">Explore</p>
        <div className="mt-2 space-y-1">
          {EXPLORE_LINKS.map((link) => (
            <NavButton
              key={link.id}
              link={link}
              active={activeView === link.id}
              onSelect={onSelectView}
            />
          ))}
        </div>

        <div className="mt-7 rounded-xl border border-hairline bg-limestone/50 p-3">
          <div className="flex items-center justify-between">
            <p className="sidebar-label">Connections</p>
            <Activity size={12} className={healthy ? "text-success" : "text-warning"} />
          </div>
          <div className="mt-3 space-y-2.5">
            <SidebarHealth label="Orders" detail="customer and delivery data" online={ordersOnline} />
            <SidebarHealth
              label="Warehouse & support"
              detail="stock and tickets"
              online={warehouseOnline}
            />
          </div>
          {discovered ? (
            <p className="mt-3 rounded-lg border border-teal-200 bg-teal-50 px-2 py-1.5 text-[10px] font-semibold text-synapse">
              COD risk check is on
            </p>
          ) : null}
        </div>
      </nav>

      <div className="shrink-0 border-t border-hairline p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 text-[11px] font-bold text-cobalt">
            AM
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-ink">Alex Morgan</p>
            <p className="truncate text-[9px] text-muted">Operations manager</p>
          </div>
          <ShieldCheck size={15} className="text-success" />
        </div>
      </div>
    </aside>
  );
}

function NavButton({
  link,
  active,
  onSelect,
}: {
  link: { id: WorkspaceView; label: string; hint: string; icon: typeof Home };
  active: boolean;
  onSelect: (view: WorkspaceView) => void;
}) {
  const Icon = link.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(link.id)}
      className={`focus-ring group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
        active ? "bg-blue-50 text-cobalt" : "text-muted hover:bg-limestone hover:text-ink"
      }`}
    >
      <Icon size={16} className={active ? "text-cobalt" : "text-muted group-hover:text-ink"} />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold">{link.label}</span>
        <span className="block text-[9px] text-muted">
          {active ? VIEW_META[link.id].description.slice(0, 32) : link.hint}
        </span>
      </span>
      {active ? (
        <motion.span layoutId="sidebar-active" className="h-6 w-0.5 rounded-full bg-cobalt" />
      ) : null}
    </button>
  );
}

function SidebarHealth({
  label,
  detail,
  online,
}: {
  label: string;
  detail: string;
  online: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${online ? "bg-success" : "bg-critical"}`}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-semibold text-ink">{label}</p>
        <p className="truncate text-[9px] text-muted">{detail}</p>
      </div>
      <span className={`text-[9px] font-semibold ${online ? "text-success" : "text-critical"}`}>
        {online ? "Live" : "Off"}
      </span>
    </div>
  );
}
