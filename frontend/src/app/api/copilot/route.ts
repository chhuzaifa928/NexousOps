import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  createRestockOrder,
  escalateTicket,
  flagOrderPriority,
  getCodFraudRisk,
  getCustomerProfile,
  getDelayedOrders,
  getLowStock,
  getOpenTickets,
  getOrders,
  getSkuStock,
  type BackendResult,
} from "@/lib/backend";
import { isFraudRouteActive } from "@/lib/discover-state";
import { getToolCatalog } from "@/lib/tools";
import type {
  CopilotRequest,
  CopilotResponse,
  InventoryRecord,
  McpServerLabel,
  OrderRecord,
  PendingPlan,
  PlannedWrite,
  TicketRecord,
  ToolTrace,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const PLAN_TTL_MS = 10 * 60 * 1000;
const PLAN_SECRET = process.env.NEXUSOPS_APP_SECRET ?? "nexusops-local-demo-secret";

interface OrdersPayload {
  orders: OrderRecord[];
}

interface LowStockPayload {
  items: InventoryRecord[];
  count: number;
}

interface TicketsPayload {
  tickets: TicketRecord[];
  count: number;
}

interface FraudOrder extends OrderRecord {
  risk_score: number;
  risk_level: string;
  risk_reasons: string[];
}

interface FraudPayload {
  orders: FraudOrder[];
  count: number;
  threshold: { codRejectionRate: number; minimumOrderValue: number };
}

interface ToolMeta {
  server: McpServerLabel;
  method: "GET" | "POST";
  endpoint: string;
}

const TOOL_META: Record<string, ToolMeta> = {
  getDelayedOrders: {
    server: "TS: orders-mcp",
    method: "GET",
    endpoint: "/api/orders/delayed",
  },
  getCodFraudRisk: {
    server: "TS: orders-mcp",
    method: "GET",
    endpoint: "/api/orders/cod-fraud-risk",
  },
  getCustomerProfile: {
    server: "TS: orders-mcp",
    method: "GET",
    endpoint: "/api/customers/:customerId/profile",
  },
  setOrderPriorityFlag: {
    server: "TS: orders-mcp",
    method: "POST",
    endpoint: "/api/orders/:orderId/priority-flag",
  },
  getLowStock: {
    server: "PY: warehouse-support-mcp",
    method: "GET",
    endpoint: "/api/inventory/low-stock",
  },
  getSkuStock: {
    server: "PY: warehouse-support-mcp",
    method: "GET",
    endpoint: "/api/inventory/sku/{sku}",
  },
  createRestockOrder: {
    server: "PY: warehouse-support-mcp",
    method: "POST",
    endpoint: "/api/inventory/restock-order",
  },
  getOpenTickets: {
    server: "PY: warehouse-support-mcp",
    method: "GET",
    endpoint: "/api/tickets/open",
  },
  escalateTicket: {
    server: "PY: warehouse-support-mcp",
    method: "POST",
    endpoint: "/api/tickets/{ticket_id}/escalate",
  },
};

const ALLOWED_WRITE_ENDPOINTS = new Set([
  "/api/inventory/restock-order",
  "/api/tickets/{ticket_id}/escalate",
  "/api/orders/{orderId}/priority-flag",
]);

interface PlanPayload {
  planId: string;
  title: string;
  summary: string;
  writes: PlannedWrite[];
  exp: number;
  createdAt: string;
  expiresAt: string;
}

interface ChatMessage {
  role: string;
  content?: string | null;
  [key: string]: unknown;
}

interface OpenAiToolCall {
  id: string;
  type: string;
  function: { name: string; arguments: string };
}

interface OpenAiChoice {
  message?: {
    content?: string | null;
    tool_calls?: OpenAiToolCall[];
  };
}

interface AnthropicResponse {
  content?: Array<{ type?: string; text?: string }>;
}

function includesAny(value: string, terms: string[]): boolean {
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function buildTrace(
  tool: string,
  request: unknown,
  result: BackendResult<unknown>,
  startedAt: number,
): ToolTrace {
  const meta = TOOL_META[tool] ?? {
    server: "TS: orders-mcp",
    method: "GET" as const,
    endpoint: "/api/orders",
  };

  return {
    id: randomUUID(),
    server: meta.server,
    tool,
    method: meta.method,
    endpoint: meta.endpoint,
    latencyMs: Math.max(1, Date.now() - startedAt),
    request,
    response: result.ok ? result.data : { error: result.error, status: result.status },
    status: result.ok ? "success" : "error",
  };
}

async function runTool<T>(
  tool: string,
  request: unknown,
  call: () => Promise<BackendResult<T>>,
): Promise<{ data: T | null; trace: ToolTrace }> {
  const startedAt = Date.now();
  const result = await call();
  return { data: result.ok ? result.data : null, trace: buildTrace(tool, request, result, startedAt) };
}

function signPlan(title: string, summary: string, writes: PlannedWrite[]): PendingPlan {
  const createdAtMs = Date.now();
  const exp = createdAtMs + PLAN_TTL_MS;
  const planId = randomUUID();
  const payload: PlanPayload = {
    planId,
    title,
    summary,
    writes,
    exp,
    createdAt: new Date(createdAtMs).toISOString(),
    expiresAt: new Date(exp).toISOString(),
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", PLAN_SECRET).update(encoded).digest("base64url");

  return {
    planId,
    token: `${encoded}.${signature}`,
    title,
    summary,
    writes,
    createdAt: payload.createdAt,
    expiresAt: payload.expiresAt,
  };
}

function isPlannedWrite(value: unknown): value is PlannedWrite {
  if (!value || typeof value !== "object") return false;
  const write = value as Partial<PlannedWrite>;
  return (
    typeof write.id === "string" &&
    typeof write.tool === "string" &&
    write.method === "POST" &&
    typeof write.endpoint === "string" &&
    ALLOWED_WRITE_ENDPOINTS.has(write.endpoint) &&
    !!write.body &&
    typeof write.body === "object" &&
    typeof write.label === "string" &&
    typeof write.reason === "string" &&
    typeof write.impact === "string" &&
    (write.server === "TS: orders-mcp" || write.server === "PY: warehouse-support-mcp")
  );
}

function verifyPlan(token: string): PlanPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = createHmac("sha256", PLAN_SECRET).update(encoded).digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }

  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as PlanPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    if (typeof payload.title !== "string" || typeof payload.summary !== "string") return null;
    if (!Array.isArray(payload.writes) || payload.writes.length === 0) return null;
    if (!payload.writes.every(isPlannedWrite)) return null;
    return payload;
  } catch {
    return null;
  }
}

function ticketForOrder(tickets: TicketRecord[], order: OrderRecord): TicketRecord | null {
  return (
    tickets.find((ticket) => ticket.order_id === order.order_id) ??
    tickets.find((ticket) => ticket.customer_id === order.customer_id) ??
    null
  );
}

function money(value: number): string {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

async function runVipWorkflow(discovered: boolean): Promise<CopilotResponse> {
  const [delayed, lowStock, tickets] = await Promise.all([
    runTool("getDelayedOrders", {}, getDelayedOrders),
    runTool("getLowStock", {}, getLowStock),
    runTool("getOpenTickets", {}, getOpenTickets),
  ]);

  const delayedOrders = (delayed.data?.orders ?? []).filter((order) => order.is_vip);
  const stockItems = lowStock.data?.items ?? [];
  const openTickets = tickets.data?.tickets ?? [];

  const lines = [
    `I correlated ${delayedOrders.length} delayed VIP orders with live warehouse and support telemetry.`,
  ];

  for (const order of delayedOrders) {
    const stock = stockItems.find((item) => item.sku === order.sku) ?? null;
    const ticket = ticketForOrder(openTickets, order);
    const stockLine = stock
      ? `${stock.item_name} (${stock.sku}) has ${stock.physical_stock} physical minus ${stock.reserved_units} reserved = ${stock.net_available} net units against a reorder threshold of ${stock.reorder_threshold}.`
      : `No low-stock record is currently published for ${order.sku}.`;
    const ticketLine = ticket
      ? `Ticket ${ticket.ticket_id} is ${ticket.status.toLowerCase()} at ${ticket.priority.toLowerCase()} priority with ${ticket.sla_minutes_remaining} minutes of SLA remaining and sentiment ${ticket.sentiment_score.toFixed(2)}.`
      : "No open support ticket is linked to this order or customer.";
    lines.push(
      `${order.customer_name} (${order.customer_id}, ${money(order.customer_lifetime_value)} LTV) — ${order.order_id} is ${order.delay_hours ?? 0}h delayed on ${money(order.total_amount)}. ${stockLine} ${ticketLine}`,
    );
  }

  if (delayedOrders.length === 0) {
    lines.push("No delayed VIP orders are present in the live orders database.");
  }

  return {
    answer: lines.join("\n\n"),
    traces: [delayed.trace, lowStock.trace, tickets.trace],
    pendingPlan: null,
    workflow: "vip-bottleneck-join",
    mode: "deterministic",
    data: { delayedVipOrders: delayedOrders, lowStockItems: stockItems, openTickets },
  };
}

async function runRemediationDraft(discovered: boolean): Promise<CopilotResponse> {
  const [delayed, lowStock, tickets] = await Promise.all([
    runTool("getDelayedOrders", {}, getDelayedOrders),
    runTool("getLowStock", {}, getLowStock),
    runTool("getOpenTickets", {}, getOpenTickets),
  ]);

  const vipDelayed = (delayed.data?.orders ?? []).filter((order) => order.is_vip);
  const stockItems = lowStock.data?.items ?? [];
  const openTickets = tickets.data?.tickets ?? [];

  const skuGroups = new Map<string, { stock: InventoryRecord; orders: OrderRecord[] }>();
  for (const order of vipDelayed) {
    const stock = stockItems.find((item) => item.sku === order.sku);
    if (!stock || stock.net_available > stock.reorder_threshold) continue;
    const existing = skuGroups.get(stock.sku);
    if (existing) {
      existing.orders.push(order);
    } else {
      skuGroups.set(stock.sku, { stock, orders: [order] });
    }
  }

  const writes: PlannedWrite[] = [];
  for (const [sku, group] of skuGroups) {
    const quantity = Math.min(100, Math.max(10, Math.abs(group.stock.net_available) * 2, group.stock.reorder_threshold * 2));
    const orderIds = group.orders.map((order) => order.order_id).join(", ");
    writes.push({
      id: randomUUID(),
      server: "PY: warehouse-support-mcp",
      tool: "createRestockOrder",
      method: "POST",
      endpoint: "/api/inventory/restock-order",
      body: {
        sku,
        quantity,
        supplier_name: group.stock.supplier_name,
        reason: `VIP delay recovery for ${orderIds}; net stock ${group.stock.net_available}`,
        requested_by: "NexusOps Copilot",
      },
      label: `Restock ${sku} — ${quantity} units`,
      reason: `${group.stock.item_name} is blocking ${orderIds} with net availability ${group.stock.net_available}.`,
      impact: `inventory.pending_restock_qty: ${group.stock.pending_restock_qty} → ${
        group.stock.pending_restock_qty + quantity
      } in warehouse.sqlite`,
    });
  }

  const blockedIds = new Set(vipDelayed.flatMap((order) => (skuGroups.has(order.sku) ? [order.order_id] : [])));
  const blockedCustomers = new Set(vipDelayed.flatMap((order) => (skuGroups.has(order.sku) ? [order.customer_id] : [])));
  const targetTickets = openTickets.filter(
    (ticket) =>
      (blockedIds.has(ticket.order_id) || blockedCustomers.has(ticket.customer_id)) &&
      (ticket.priority === "Critical" || ticket.priority === "High" || ticket.is_sla_critical) &&
      ticket.status !== "Resolved",
  );

  for (const ticket of targetTickets) {
    writes.push({
      id: randomUUID(),
      server: "PY: warehouse-support-mcp",
      tool: "escalateTicket",
      method: "POST",
      endpoint: "/api/tickets/{ticket_id}/escalate",
      body: {
        notes: `Copilot remediation: linked warehouse deficit and VIP shipment delay. SLA ${ticket.sla_minutes_remaining} minutes.`,
        escalated_by: "NexusOps Copilot",
      },
      label: `Escalate ${ticket.ticket_id} to Critical`,
      reason: `${ticket.subject} has ${ticket.sla_minutes_remaining} minutes of SLA left with sentiment ${ticket.sentiment_score.toFixed(2)}.`,
      impact: `support_tickets.status: ${ticket.status} → Escalated, priority → Critical in warehouse.sqlite`,
    });
  }

  const traces = [delayed.trace, lowStock.trace, tickets.trace];
  if (writes.length === 0) {
    return {
      answer:
        "I checked delayed VIP orders against live stock and the support queue. No SKU blocking a VIP order is below its reorder threshold, and no linked ticket needs escalation, so no changes are proposed.",
      traces,
      pendingPlan: null,
      workflow: "remediation-draft",
      mode: "deterministic",
      data: { skuGroups: skuGroups.size, targetTickets: targetTickets.length },
    };
  }

  const restockCount = writes.filter((write) => write.tool === "createRestockOrder").length;
  const escalateCount = writes.filter((write) => write.tool === "escalateTicket").length;
  const summary = `${restockCount} supplier restock PO${restockCount === 1 ? "" : "s"} and ${escalateCount} support escalation${escalateCount === 1 ? "" : "s"} across warehouse-support-mcp.`;

  return {
    answer: `I prepared a remediation plan: ${summary} Nothing has been written yet. Review the exact database writes below and approve to execute.`,
    traces,
    pendingPlan: signPlan("VIP bottleneck remediation", summary, writes),
    workflow: "remediation-safety-gate",
    mode: "deterministic",
    data: { proposedWrites: writes.length },
  };
}

async function runPriorityDraft(message: string, context: CopilotRequest["context"]): Promise<CopilotResponse> {
  const delayed = await runTool("getDelayedOrders", {}, getDelayedOrders);
  const fromMessage = message.match(/ORD-\d{4}/i)?.[0]?.toUpperCase();
  const orderId = fromMessage ?? context?.order?.order_id ?? null;

  if (!orderId) {
    return {
      answer: "Provide an order ID such as ORD-5001 to flag for expedited courier dispatch.",
      traces: [delayed.trace],
      pendingPlan: null,
      workflow: "priority-flag-safety-gate",
      mode: "deterministic",
    };
  }

  const order =
    (delayed.data?.orders ?? []).find((candidate) => candidate.order_id === orderId) ??
    context?.order ??
    null;

  if (!order) {
    return {
      answer: `Order ${orderId} was not found in the live orders service.`,
      traces: [delayed.trace],
      pendingPlan: null,
      workflow: "priority-flag-safety-gate",
      mode: "deterministic",
    };
  }

  if (order.priority_flagged === 1) {
    return {
      answer: `${order.order_id} already has priority_flagged = 1, so no additional write is required.`,
      traces: [delayed.trace],
      pendingPlan: null,
      workflow: "priority-flag-safety-gate",
      mode: "deterministic",
    };
  }

  const write: PlannedWrite = {
    id: randomUUID(),
    server: "TS: orders-mcp",
    tool: "setOrderPriorityFlag",
    method: "POST",
    endpoint: "/api/orders/{orderId}/priority-flag",
    body: { orderId: order.order_id },
    label: `Flag ${order.order_id} for expedited dispatch`,
    reason: `${order.customer_name} has a ${order.delay_hours ?? 0}h delay on ${money(order.total_amount)}.`,
    impact: `orders.priority_flagged: 0 → 1 for ${order.order_id} in orders.sqlite`,
  };

  return {
    answer: `I found ${order.order_id} and prepared one state mutation. Approve the safety card to set its priority flag.`,
    traces: [delayed.trace],
    pendingPlan: signPlan("Expedited dispatch flag", `Set priority_flagged = 1 for ${order.order_id}.`, [write]),
    workflow: "priority-flag-safety-gate",
    mode: "deterministic",
  };
}

async function executeWrite(write: PlannedWrite): Promise<ToolTrace> {
  const startedAt = Date.now();

  if (write.endpoint === "/api/inventory/restock-order") {
    const result = await createRestockOrder(write.body);
    return buildTrace("createRestockOrder", write.body, result, startedAt);
  }

  const ticketMatch = write.endpoint.match(/^\/api\/tickets\/([^/]+)\/escalate$/);
  if (ticketMatch) {
    const result = await escalateTicket(decodeURIComponent(ticketMatch[1]), write.body);
    return buildTrace("escalateTicket", write.body, result, startedAt);
  }

  const orderMatch = write.endpoint.match(/^\/api\/orders\/([^/]+)\/priority-flag$/);
  if (orderMatch) {
    const result = await flagOrderPriority(decodeURIComponent(orderMatch[1]));
    return buildTrace("setOrderPriorityFlag", write.body, result, startedAt);
  }

  return buildTrace(
    "unknownWrite",
    write.body,
    { ok: false, data: null, error: "Write endpoint is not allowed.", status: null, latencyMs: 0 },
    startedAt,
  );
}

async function runApproval(token: string, approved: boolean): Promise<CopilotResponse> {
  const plan = verifyPlan(token);

  if (!plan) {
    return {
      answer: "That approval token is invalid or expired. Ask the Copilot to prepare a fresh plan before approving.",
      traces: [],
      pendingPlan: null,
      workflow: "approval-gate",
      mode: "deterministic",
    };
  }

  if (!approved) {
    return {
      answer: "Changes cancelled. No state-mutating endpoint was called and both SQLite databases remain unchanged.",
      traces: [],
      pendingPlan: null,
      workflow: "approval-gate",
      mode: "deterministic",
    };
  }

  const traces: ToolTrace[] = [];
  for (const write of plan.writes) {
    traces.push(await executeWrite(write));
  }

  const [lowStock, tickets] = await Promise.all([
    runTool("getLowStock", {}, getLowStock),
    runTool("getOpenTickets", {}, getOpenTickets),
  ]);
  traces.push(lowStock.trace, tickets.trace);

  const succeeded = traces.filter((trace) => trace.status === "success").length;
  const failures = traces.filter((trace) => trace.status === "error").length;
  const details = traces
    .slice(0, plan.writes.length)
    .map((trace) => {
      const response = trace.response as { message?: string; order?: { po_number?: string }; ticket?: { ticket_id?: string } } | null;
      const reference = response?.order?.po_number ?? response?.ticket?.ticket_id ?? trace.endpoint;
      return `• ${trace.tool} → ${reference} (${trace.latencyMs}ms)`;
    })
    .join("\n");

  return {
    answer: `Approval received. Executed ${plan.writes.length} approved change${
      plan.writes.length === 1 ? "" : "s"
    } against live SQLite storage.\n${details}\n\nVerification re-read completed with ${succeeded} successful tool calls${
      failures > 0 ? ` and ${failures} error${failures === 1 ? "" : "s"}` : ""
    }. Open the Raw Service & Database Inspector to confirm the persisted rows.`,
    traces,
    pendingPlan: null,
    workflow: "approval-execution",
    mode: "deterministic",
    data: { planId: plan.planId, executedWrites: plan.writes.length },
  };
}

async function runCodWorkflow(discovered: boolean): Promise<CopilotResponse> {
  const [fraud, tickets] = await Promise.all([
    runTool("getCodFraudRisk", {}, getCodFraudRisk),
    runTool("getOpenTickets", {}, getOpenTickets),
  ]);

  const fraudOrders = fraud.data?.orders ?? [];
  const openTickets = tickets.data?.tickets ?? [];
  const traces = [fraud.trace, tickets.trace];

  if (!discovered && fraud.trace.status === "error") {
    return {
      answer:
        "The COD fraud-risk tool is still dormant. Run the Live --discover Demo control panel to uncomment GET /api/orders/cod-fraud-risk, rebuild the orders MCP server, and unlock this workflow. I still checked the support queue for billing disputes.",
      traces,
      pendingPlan: null,
      workflow: "cod-fraud-risk-locked",
      mode: "deterministic",
      data: { openDisputes: openTickets.filter((ticket) => ticket.category === "Billing/COD").length },
    };
  }

  if (fraud.trace.status === "error") {
    return {
      answer: `The dashboard has getCodFraudRisk registered, but System A returned: ${String(
        (fraud.trace.response as { error?: string })?.error ?? "unknown error",
      )}. Restart the orders service so tsx loads the newly uncommented route, then retry.`,
      traces,
      pendingPlan: null,
      workflow: "cod-fraud-risk",
      mode: "deterministic",
    };
  }

  const lines = [
    `The newly discovered getCodFraudRisk tool flagged ${fraudOrders.length} high-value COD order${
      fraudOrders.length === 1 ? "" : "s"
    } above the ${Math.round((fraud.data?.threshold.codRejectionRate ?? 0.35) * 100)}% rejection threshold.`,
  ];

  for (const order of fraudOrders) {
    const dispute = openTickets.find(
      (ticket) =>
        (ticket.customer_id === order.customer_id || ticket.order_id === order.order_id) &&
        ticket.category === "Billing/COD",
    );
    const disputeLine = dispute
      ? `Linked dispute ${dispute.ticket_id} is ${dispute.status.toLowerCase()} with ${dispute.sla_minutes_remaining} SLA minutes left.`
      : "No open Billing/COD dispute ticket is linked to this customer or order.";
    lines.push(
      `${order.customer_name} (${order.customer_id}) — ${order.order_id} for ${money(
        order.total_amount,
      )} has a ${Math.round(order.cod_rejection_rate * 100)}% COD rejection rate, risk score ${order.risk_score}/${order.risk_level}. ${disputeLine}`,
    );
  }

  if (fraudOrders.length === 0) {
    lines.push("No COD order currently exceeds both risk thresholds.");
  }

  return {
    answer: lines.join("\n\n"),
    traces,
    pendingPlan: null,
    workflow: "cod-fraud-risk-join",
    mode: "deterministic",
    data: { fraudOrders, openTickets },
  };
}

async function runTargetedWorkflow(
  context: CopilotRequest["context"],
  discovered: boolean,
): Promise<CopilotResponse> {
  const order = context?.order;
  if (!order) return runVipWorkflow(discovered);

  const [profile, stock, tickets] = await Promise.all([
    runTool("getCustomerProfile", { customerId: order.customer_id }, () =>
      getCustomerProfile(order.customer_id),
    ),
    runTool("getSkuStock", { sku: order.sku }, () => getSkuStock(order.sku)),
    runTool("getOpenTickets", {}, getOpenTickets),
  ]);

  const linkedTicket =
    (tickets.data?.tickets ?? []).find((ticket) => ticket.order_id === order.order_id) ??
    (tickets.data?.tickets ?? []).find((ticket) => ticket.customer_id === order.customer_id) ??
    null;
  const stockItem = stock.data?.item ?? null;

  const answer = [
    `${order.order_id} belongs to ${order.customer_name} (${order.customer_id}, ${order.customer_tier}, ${money(
      order.customer_lifetime_value,
    )} lifetime value). It is ${order.status.toLowerCase()} at ${money(order.total_amount)} with ${
      order.delay_hours ?? 0
    } delay hours.`,
    stockItem
      ? `${stockItem.item_name} (${stockItem.sku}) has ${stockItem.physical_stock} physical, ${stockItem.reserved_units} reserved and ${stockItem.net_available} net available units; ${stockItem.pending_restock_qty} units are pending restock.`
      : `No warehouse stock record is available for ${order.sku}.`,
    linkedTicket
      ? `${linkedTicket.ticket_id} is ${linkedTicket.status.toLowerCase()} at ${linkedTicket.priority.toLowerCase()} priority with ${linkedTicket.sla_minutes_remaining} SLA minutes remaining.`
      : "No open support ticket is linked to this order.",
  ].join("\n\n");

  return {
    answer,
    traces: [profile.trace, stock.trace, tickets.trace],
    pendingPlan: null,
    workflow: "targeted-order-investigation",
    mode: "deterministic",
    data: { profile: profile.data, stock: stock.data, linkedTicket },
  };
}

async function runGeneralWorkflow(discovered: boolean): Promise<CopilotResponse> {
  const [orders, lowStock, tickets] = await Promise.all([
    runTool("getDelayedOrders", {}, getDelayedOrders),
    runTool("getLowStock", {}, getLowStock),
    runTool("getOpenTickets", {}, getOpenTickets),
  ]);

  const delayedCount = orders.data?.orders.length ?? 0;
  const lowStockCount = lowStock.data?.count ?? 0;
  const criticalTickets = (tickets.data?.tickets ?? []).filter((ticket) => ticket.is_sla_critical).length;

  return {
    answer: `Live cross-system snapshot: ${delayedCount} delayed orders in orders.sqlite, ${lowStockCount} SKUs at or below reorder threshold in warehouse.sqlite, and ${criticalTickets} SLA-critical support tickets. Ask about delayed VIPs, restock/escalation, or the discovered COD fraud-risk tool for a deeper orchestration.`,
    traces: [orders.trace, lowStock.trace, tickets.trace],
    pendingPlan: null,
    workflow: "cross-system-snapshot",
    mode: "deterministic",
  };
}

async function callOpenAiCompatible(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  discovered: boolean,
): Promise<string | null> {
  const baseUrl = process.env.LLM_BASE_URL ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];
  const tools = getToolCatalog(discovered)
    .filter((tool) => !tool.mutating)
    .map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));

  const requestBody = {
    model,
    temperature: 0.2,
    messages,
    tools,
    tool_choice: "auto",
  };

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as { choices?: OpenAiChoice[] };
  const choice = payload.choices?.[0];
  const assistantMessage = choice?.message;

  if (assistantMessage?.tool_calls?.length) {
    const toolMessages: ChatMessage[] = assistantMessage.tool_calls.map((toolCall) => ({
      role: "tool",
      tool_call_id: toolCall.id,
      content: JSON.stringify({
        status: "already_executed_by_deterministic_orchestrator",
        tool: toolCall.function.name,
      }),
    }));

    const followUp = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [...messages, assistantMessage, ...toolMessages],
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!followUp.ok) return null;
    const followUpPayload = (await followUp.json()) as { choices?: OpenAiChoice[] };
    return followUpPayload.choices?.[0]?.message?.content ?? null;
  }

  return assistantMessage?.content ?? null;
}

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string | null> {
  const model = process.env.LLM_MODEL ?? "claude-3-5-haiku-latest";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1400,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as AnthropicResponse;
  return payload.content?.find((block) => block.type === "text")?.text ?? null;
}

async function synthesizeWithLlm(
  requestMessage: string,
  result: CopilotResponse,
  discovered: boolean,
): Promise<CopilotResponse> {
  if (result.pendingPlan) return result;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openAiKey = process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY;
  const apiKey = openAiKey ?? anthropicKey;
  if (!apiKey) return result;

  const systemPrompt = [
    "You are NexusOps, an executive operations copilot.",
    "The deterministic orchestrator has already executed real HTTP tool calls against orders-service and warehouse-support-service.",
    "Use only the supplied tool results. Never invent identifiers, amounts, SLAs or database changes.",
    "Write a concise, daylight-legible answer with short paragraphs and no markdown tables.",
    "Tool traces: " + JSON.stringify(result.traces.map((trace) => ({ tool: trace.tool, endpoint: trace.endpoint, status: trace.status }))),
  ].join("\n");

  const userMessage = [
    `Operator request: ${requestMessage}`,
    "Deterministic answer to preserve:",
    result.answer,
    "Tool result payloads:",
    JSON.stringify(result.data ?? {}, null, 2).slice(0, 18000),
    "Return the same facts in a polished executive briefing.",
  ].join("\n\n");

  try {
    const provider = process.env.LLM_PROVIDER?.toLowerCase();
    const useAnthropic =
      provider === "anthropic" || (!openAiKey && !!anthropicKey && provider !== "openai");
    const text = useAnthropic
      ? await callAnthropic(apiKey, systemPrompt, userMessage)
      : await callOpenAiCompatible(apiKey, systemPrompt, userMessage, discovered);

    if (!text || text.trim().length === 0) return result;
    return { ...result, answer: text.trim(), mode: "llm+deterministic" };
  } catch {
    return result;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CopilotRequest;
    if (!body || typeof body.message !== "string" || body.message.trim().length === 0) {
      return NextResponse.json({ message: "A non-empty message is required." }, { status: 400 });
    }

    const discovered = body.discovered ?? (await isFraudRouteActive().catch(() => false));
    const message = body.message.trim();
    let result: CopilotResponse;

    if (body.approval) {
      result = await runApproval(body.approval.token, body.approval.approved);
    } else if (includesAny(message, ["priority flag", "priority-flag", "expedite"])) {
      result = await runPriorityDraft(message, body.context);
    } else if (
      includesAny(message, ["restock", "purchase order", "escalate", "confirmation first"])
    ) {
      result = await runRemediationDraft(discovered);
    } else if (includesAny(message, ["cod", "fraud", "discovered tool"])) {
      result = await runCodWorkflow(discovered);
    } else if (body.context?.order || includesAny(message, ["investigate", "customer profile", "sku"])) {
      result = await runTargetedWorkflow(body.context, discovered);
    } else if (
      includesAny(message, ["vip", "delayed", "bottleneck", "warehouse", "support ticket"])
    ) {
      result = await runVipWorkflow(discovered);
    } else {
      result = await runGeneralWorkflow(discovered);
    }

    result = await synthesizeWithLlm(message, result, discovered);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Copilot orchestration failed.",
      },
      { status: 500 },
    );
  }
}
