"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bot, ClipboardList, Database, FlaskConical, Home, X } from "lucide-react";
import type { WorkspaceView } from "@/lib/navigation";

interface MobileNavDrawerProps {
  open: boolean;
  activeView: WorkspaceView;
  discovered: boolean;
  onClose: () => void;
  onSelectView: (view: WorkspaceView) => void;
}

const LINKS = [
  { id: "home" as const, label: "Home", icon: Home, hint: "Today's priorities" },
  { id: "orders" as const, label: "Orders", icon: ClipboardList, hint: "Needs attention" },
  { id: "copilot" as const, label: "Copilot", icon: Bot, hint: "Ask a question" },
  { id: "data" as const, label: "Data", icon: Database, hint: "Connected information" },
  { id: "discovery" as const, label: "Discovery", icon: FlaskConical, hint: "Add a new check" },
];

export default function MobileNavDrawer({
  open,
  activeView,
  discovered,
  onClose,
  onSelectView,
}: MobileNavDrawerProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="absolute inset-0 bg-ink/20"
          />
          <motion.nav
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col border-r border-hairline bg-white p-4 pb-24 shadow-drawer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-extrabold text-ink">NexusOps</p>
                <p className="text-[10px] text-muted">Where would you like to go?</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close navigation"
                className="focus-ring rounded-md p-1.5 text-muted hover:bg-limestone"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-1.5">
              {LINKS.map((link) => {
                const Icon = link.icon;
                const active = activeView === link.id;
                return (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => {
                      onSelectView(link.id);
                      onClose();
                    }}
                    className={`focus-ring flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      active
                        ? "border-blue-200 bg-blue-50 text-cobalt"
                        : "border-hairline bg-white text-ink hover:bg-limestone"
                    }`}
                  >
                    <Icon size={16} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold">{link.label}</span>
                      <span className="block text-[10px] text-muted">{link.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-auto rounded-xl border border-hairline bg-limestone p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Current state
              </p>
              <p className="mt-1 text-[11px] text-ink">
                {discovered ? "COD risk check is available" : "4 checks are available"}
              </p>
            </div>
          </motion.nav>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
