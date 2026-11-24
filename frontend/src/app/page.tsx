"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bot, ClipboardList, Home } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AppSidebar from "@/components/AppSidebar";
import CopilotPanel from "@/components/CopilotPanel";
import CopilotView from "@/components/CopilotView";
import DataView from "@/components/DataView";
import DiscoveryView from "@/components/DiscoveryView";
import HomeView from "@/components/HomeView";
import MobileNavDrawer from "@/components/MobileNavDrawer";
import OrdersView from "@/components/OrdersView";
import TopNavbar from "@/components/TopNavbar";
import WorkspaceHeader from "@/components/WorkspaceHeader";
import {
  getLiveDiscoverState,
  getOverview,
  getStatus,
  postCopilot,
  setLiveDiscoverState,
} from "@/lib/api";
import type { WorkspaceView } from "@/lib/navigation";
import type {
  CopilotMessage,
  CopilotRequest,
  CopilotResponse,
  CrossSystemRow,
  LiveDiscoverResponse,
  OverviewResponse,
  StatusResponse,
} from "@/lib/types";

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function makeMessage(
  role: CopilotMessage["role"],
  content: string,
  response?: CopilotResponse,
): CopilotMessage {
  return {
    id: createId(),
    role,
    content,
    workflow: response?.workflow,
    traces: response?.traces,
    createdAt: new Date().toISOString(),
  };
}

export default function HomePage() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [discoverState, setDiscoverState] = useState<LiveDiscoverResponse | null>(null);
  const [discovered, setDiscovered] = useState(false);
  const [discoverOutput, setDiscoverOutput] = useState<string[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [activeView, setActiveView] = useState<WorkspaceView>("home");
  const [navOpen, setNavOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([
    makeMessage(
      "assistant",
      "NexusOps is online. Ask a question in plain English, choose a suggested question, or select an order to investigate. Every answer shows where it came from, and nothing is changed without your approval.",
    ),
  ]);
  const [pendingPlan, setPendingPlan] = useState<CopilotResponse["pendingPlan"]>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refreshOverview = useCallback(async () => {
    try {
      const data = await getOverview();
      setOverview(data);
      setStatus({
        orders: data.services.orders,
        warehouse: data.services.warehouse,
        generatedAt: data.generatedAt,
      });
    } catch {
      setOverview(null);
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      setStatus(await getStatus());
    } catch {
      setStatus(null);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshOverview(), refreshStatus()]);
    setRefreshing(false);
  }, [refreshOverview, refreshStatus]);

  useEffect(() => {
    void refreshOverview();
    void refreshStatus();
    getLiveDiscoverState()
      .then((state) => {
        setDiscoverState(state);
        setDiscovered(state.active);
        setDiscoverOutput(state.cliOutput);
      })
      .catch(() => undefined);

    const interval = window.setInterval(() => {
      void refreshStatus();
    }, 20000);
    return () => window.clearInterval(interval);
  }, [refreshOverview, refreshStatus]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCopilotOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const selectView = useCallback((view: WorkspaceView) => {
    setActiveView(view);
    setNavOpen(false);
    setCopilotOpen(false);
  }, []);

  const appendResponse = useCallback(
    (userText: string, response: CopilotResponse) => {
      setMessages((current) => [
        ...current,
        makeMessage("user", userText),
        makeMessage("assistant", response.answer, response),
      ]);
      setPendingPlan(response.pendingPlan);
      void refreshOverview();
    },
    [refreshOverview],
  );

  const sendCopilot = useCallback(
    async (message: string, context: CopilotRequest["context"]) => {
      if (copilotLoading) return;
      setCopilotLoading(true);
      try {
        const response = await postCopilot({ message, context, discovered });
        appendResponse(message, response);
      } catch (error) {
        const text = error instanceof Error ? error.message : "Copilot request failed.";
        setMessages((current) => [
          ...current,
          makeMessage("user", message),
          makeMessage("assistant", `Copilot request failed: ${text}`),
        ]);
      } finally {
        setCopilotLoading(false);
      }
    },
    [appendResponse, copilotLoading, discovered],
  );

  const approvePlan = useCallback(async () => {
    if (!pendingPlan || approving) return;
    setApproving(true);
    try {
      const response = await postCopilot({
        message: "Approve and execute the proposed database writes.",
        approval: { token: pendingPlan.token, approved: true },
        discovered,
      });
      appendResponse("Approve & Execute Changes", response);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Approval execution failed.";
      setMessages((current) => [
        ...current,
        makeMessage("assistant", `Approval execution failed: ${text}`),
      ]);
    } finally {
      setApproving(false);
    }
  }, [appendResponse, approving, discovered, pendingPlan]);

  const cancelPlan = useCallback(async () => {
    if (!pendingPlan) return;
    try {
      const response = await postCopilot({
        message: "Cancel the proposed database writes.",
        approval: { token: pendingPlan.token, approved: false },
        discovered,
      });
      appendResponse("Cancel", response);
    } catch {
      setPendingPlan(null);
      setMessages((current) => [
        ...current,
        makeMessage("assistant", "Changes cancelled. No database writes were executed."),
      ]);
    }
  }, [appendResponse, discovered, pendingPlan]);

  const runDiscover = useCallback(
    async (action: "activate" | "deactivate") => {
      if (discovering) return;
      setDiscovering(true);
      try {
        const state = await setLiveDiscoverState(action);
        setDiscoverState(state);
        setDiscovered(state.active);
        setDiscoverOutput(state.cliOutput);
        setMessages((current) => [
          ...current,
          makeMessage("assistant", `${state.message}\n\n${state.cliOutput.join("\n")}`),
        ]);
        await refreshOverview();
      } catch (error) {
        const text = error instanceof Error ? error.message : "Adding the new check failed.";
        setDiscoverOutput([`Error: ${text}`]);
      } finally {
        setDiscovering(false);
      }
    },
    [discovering, refreshOverview],
  );

  const investigate = useCallback(
    (row: CrossSystemRow) => {
      selectView("copilot");
      setCopilotOpen(true);
      void sendCopilot(
        `Investigate order ${row.order.order_id} for customer ${row.order.customer_id}. Correlate the delay with warehouse stock and any open support ticket.`,
        { order: row.order },
      );
    },
    [selectView, sendCopilot],
  );

  const copilotProps = {
    messages,
    loading: copilotLoading,
    approving,
    pendingPlan,
    discovered,
    onSend: (message: string) => void sendCopilot(message, undefined),
    onApprove: () => void approvePlan(),
    onCancel: () => void cancelPlan(),
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-canvas">
      <AppSidebar
        activeView={activeView}
        discovered={discovered}
        status={status}
        onSelectView={selectView}
      />

      <div className="min-h-screen lg:pl-[248px]">
        <TopNavbar
          view={activeView}
          discovered={discovered}
          status={status}
          discovering={discovering}
          onDiscover={() => selectView("discovery")}
          onToggleNav={() => setNavOpen(true)}
          onOpenCopilot={() => setCopilotOpen(true)}
        />

        <MobileNavDrawer
          open={navOpen}
          activeView={activeView}
          discovered={discovered}
          onClose={() => setNavOpen(false)}
          onSelectView={selectView}
        />

        <main className="mx-auto w-full max-w-[1680px] px-3 pb-28 pt-5 sm:px-5 lg:px-7 lg:pb-10 lg:pt-7">
          <WorkspaceHeader
            view={activeView}
            discovered={discovered}
            discovering={discovering}
            refreshing={refreshing}
            generatedAt={overview?.generatedAt}
            onOpenCopilot={() => selectView("copilot")}
            onRefresh={() => void refreshAll()}
            onOpenDiscovery={() => selectView("discovery")}
          />

          <div
            className={`grid min-w-0 gap-5 ${
              activeView === "copilot" ? "" : "xl:grid-cols-[minmax(0,1fr)_380px]"
            }`}
          >
            <div className="min-w-0">
              {activeView === "home" ? (
                <HomeView
                  overview={overview}
                  status={status}
                  discovered={discovered}
                  onSelectView={selectView}
                  onInvestigate={investigate}
                  onOpenCopilot={() => selectView("copilot")}
                />
              ) : null}
              {activeView === "orders" ? (
                <OrdersView
                  rows={overview?.rows ?? []}
                  discovered={discovered}
                  onInvestigate={investigate}
                  onOpenCopilot={() => selectView("copilot")}
                />
              ) : null}
              {activeView === "copilot" ? <CopilotView copilotProps={copilotProps} /> : null}
              {activeView === "data" ? (
                <DataView
                  overview={overview}
                  status={status}
                  discovered={discovered}
                  refreshing={refreshing}
                  onRefresh={() => void refreshAll()}
                />
              ) : null}
              {activeView === "discovery" ? (
                <DiscoveryView
                  active={discovered}
                  running={discovering}
                  output={discoverOutput}
                  onRun={(action) => void runDiscover(action)}
                />
              ) : null}
            </div>

            {activeView !== "copilot" ? (
              <aside className="hidden min-w-0 xl:block">
                <div className="sticky top-20 h-[calc(100vh-6rem)] overflow-hidden rounded-2xl border border-hairline bg-white shadow-card">
                  <CopilotPanel {...copilotProps} />
                </div>
              </aside>
            ) : null}
          </div>
        </main>
      </div>

      <AnimatePresence>
        {copilotOpen ? (
          <motion.div
            className="fixed inset-0 z-50 xl:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Close Copilot"
              onClick={() => setCopilotOpen(false)}
              className="absolute inset-0 bg-ink/20"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 260 }}
              className="absolute inset-x-0 bottom-0 h-[88vh] overflow-hidden rounded-t-2xl border-t border-hairline bg-white shadow-drawer"
            >
              <CopilotPanel {...copilotProps} mobile onClose={() => setCopilotOpen(false)} />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-hairline bg-white lg:hidden">
        <button
          type="button"
          onClick={() => selectView("home")}
          className={`focus-ring flex items-center justify-center gap-1.5 py-3 text-[11px] font-semibold ${
            activeView === "home" && !copilotOpen ? "text-cobalt" : "text-muted"
          }`}
        >
          <Home size={15} />
          Home
        </button>
        <button
          type="button"
          onClick={() => selectView("orders")}
          className={`focus-ring flex items-center justify-center gap-1.5 py-3 text-[11px] font-semibold ${
            activeView === "orders" && !copilotOpen ? "text-cobalt" : "text-muted"
          }`}
        >
          <ClipboardList size={15} />
          Orders
        </button>
        <button
          type="button"
          onClick={() => setCopilotOpen(true)}
          className={`focus-ring flex items-center justify-center gap-1.5 py-3 text-[11px] font-semibold ${
            copilotOpen ? "text-synapse" : "text-muted"
          }`}
        >
          <Bot size={15} />
          Ask
        </button>
      </nav>
    </div>
  );
}
