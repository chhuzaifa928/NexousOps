export type CustomerTier = "VIP" | "Gold" | "Standard";
export type OrderStatus = "Delivered" | "In Transit" | "Delayed" | "Processing";
export type PaymentMethod = "COD" | "Prepaid";

export interface OrderRecord {
  order_id: string;
  customer_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  total_amount: number;
  payment_method: PaymentMethod;
  status: OrderStatus;
  delay_hours: number | null;
  delay_reason: string | null;
  priority_flagged: number;
  created_at: string;
  customer_name: string;
  customer_tier: CustomerTier;
  customer_email: string;
  customer_city: string;
  customer_lifetime_value: number;
  cod_rejection_rate: number;
  is_vip: boolean;
}

export interface InventoryRecord {
  sku: string;
  item_name: string;
  warehouse_zone: string;
  physical_stock: number;
  reserved_units: number;
  net_available: number;
  reorder_threshold: number;
  deficit_quantity?: number;
  supplier_name: string;
  lead_time_days: number;
  pending_restock_qty: number;
  is_stockout?: boolean;
}

export interface TicketRecord {
  ticket_id: string;
  customer_id: string;
  order_id: string;
  subject: string;
  category: "Delivery Delay" | "Stock Shortage" | "Billing/COD" | "Damaged Item";
  priority: "Critical" | "High" | "Medium" | "Low";
  sentiment_score: number;
  status: "Open" | "Escalated" | "Resolved";
  sla_minutes_remaining: number;
  agent_notes: string | null;
  is_sla_critical: boolean;
}

export interface CrossSystemRow {
  order: OrderRecord;
  stock: InventoryRecord | null;
  ticket: TicketRecord | null;
  hasStockDeficit: boolean;
  hasOpenTicket: boolean;
  isHighCodRisk: boolean;
  revenueAtRisk: number;
}

export interface Kpis {
  delayedVipOrders: number;
  stockoutBottlenecks: number;
  slaCriticalTickets: number;
  revenueAtRisk: number;
}

export type ServiceState = "online" | "offline";

export interface ServiceStatus {
  orders: {
    state: ServiceState;
    toolCount: number;
    latencyMs: number | null;
    service?: string;
    seeded?: Record<string, number>;
    error?: string;
  };
  warehouse: {
    state: ServiceState;
    toolCount: number;
    latencyMs: number | null;
    service?: string;
    seeded?: Record<string, number>;
    error?: string;
  };
}

export interface DatabaseTables {
  orders: {
    database: string;
    tables: { customers: Record<string, unknown>[]; orders: Record<string, unknown>[] };
  } | null;
  warehouse: {
    database: string;
    tables: {
      inventory: Record<string, unknown>[];
      support_tickets: Record<string, unknown>[];
    };
  } | null;
}

export interface OverviewResponse {
  kpis: Kpis;
  rows: CrossSystemRow[];
  orders: OrderRecord[];
  inventory: InventoryRecord[];
  tickets: TicketRecord[];
  databases: DatabaseTables;
  services: ServiceStatus;
  generatedAt: string;
}

export interface StatusResponse extends ServiceStatus {
  generatedAt: string;
}

export type McpServerKey = "orders" | "warehouse";
export type McpServerLabel = "TS: orders-mcp" | "PY: warehouse-support-mcp";

export interface ToolDefinition {
  id: string;
  name: string;
  serverKey: McpServerKey;
  server: McpServerLabel;
  method: "GET" | "POST";
  endpoint: string;
  description: string;
  mutating: boolean;
  inputSchema: Record<string, unknown>;
  outputSummary: string;
}

export interface ToolTrace {
  id: string;
  server: McpServerLabel;
  tool: string;
  method: "GET" | "POST";
  endpoint: string;
  latencyMs: number;
  request: unknown;
  response: unknown;
  status: "success" | "error";
}

export interface PlannedWrite {
  id: string;
  server: McpServerLabel;
  tool: string;
  method: "POST";
  endpoint: string;
  body: Record<string, unknown>;
  label: string;
  reason: string;
  impact: string;
}

export interface PendingPlan {
  planId: string;
  token: string;
  title: string;
  summary: string;
  writes: PlannedWrite[];
  createdAt: string;
  expiresAt: string;
}

export interface CopilotRequest {
  message: string;
  context?: { order?: OrderRecord };
  approval?: { token: string; approved: boolean };
  discovered?: boolean;
}

export interface CopilotResponse {
  answer: string;
  traces: ToolTrace[];
  pendingPlan: PendingPlan | null;
  workflow: string;
  mode: "deterministic" | "llm+deterministic";
  data?: unknown;
}

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  workflow?: string;
  traces?: ToolTrace[];
  createdAt: string;
}

export interface LiveDiscoverState {
  active: boolean;
  routePath: string;
  toolName: string;
  generatedServerId: string;
  transport: Record<string, unknown>;
  registeredTools: string[];
  cliCommand: string;
}

export interface LiveDiscoverResponse extends LiveDiscoverState {
  action: "activate" | "deactivate" | "status";
  cliOutput: string[];
  cliExecuted: boolean;
  restartRequired: boolean;
  message: string;
}
