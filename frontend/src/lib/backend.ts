import type {
  InventoryRecord,
  OrderRecord,
  TicketRecord,
} from "./types";

export interface BackendResult<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
  status: number | null;
  latencyMs: number;
}

const ORDERS_BASE_URL = process.env.ORDERS_SERVICE_URL ?? "http://127.0.0.1:4001";
const WAREHOUSE_BASE_URL = process.env.WAREHOUSE_SERVICE_URL ?? "http://127.0.0.1:4002";

export function getServiceUrls() {
  return { orders: ORDERS_BASE_URL, warehouse: WAREHOUSE_BASE_URL };
}

export async function backendFetch<T>(
  baseUrl: string,
  endpoint: string,
  init: RequestInit = {},
): Promise<BackendResult<T>> {
  const startedAt = Date.now();
  const url = `${baseUrl.replace(/\/$/, "")}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(9000),
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers ?? {}),
      },
    });

    const text = await response.text();
    const parsed: unknown = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const errorBody = parsed as { message?: string; error?: string; detail?: string } | null;
      return {
        ok: false,
        data: null,
        error: errorBody?.message ?? errorBody?.detail ?? errorBody?.error ?? `HTTP ${response.status}`,
        status: response.status,
        latencyMs: Date.now() - startedAt,
      };
    }

    return {
      ok: true,
      data: parsed as T,
      error: null,
      status: response.status,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      data: null,
      error: error instanceof Error ? error.message : "Backend request failed.",
      status: null,
      latencyMs: Date.now() - startedAt,
    };
  }
}

interface OrdersEnvelope {
  orders: OrderRecord[];
}

interface LowStockEnvelope {
  items: InventoryRecord[];
  count: number;
}

interface SkuEnvelope {
  item: InventoryRecord;
}

interface TicketsEnvelope {
  tickets: TicketRecord[];
  count: number;
}

interface DatabaseEnvelope<TTables> {
  database: string;
  tables: TTables;
}

interface HealthEnvelope {
  status: string;
  service: string;
  seeded?: Record<string, number>;
}

export interface OrdersDatabaseTables {
  customers: Record<string, unknown>[];
  orders: Record<string, unknown>[];
}

export interface WarehouseDatabaseTables {
  inventory: Record<string, unknown>[];
  support_tickets: Record<string, unknown>[];
}

export const getOrders = () => backendFetch<OrdersEnvelope>(ORDERS_BASE_URL, "/api/orders");
export const getDelayedOrders = () =>
  backendFetch<OrdersEnvelope>(ORDERS_BASE_URL, "/api/orders/delayed");
export const getCodFraudRisk = () =>
  backendFetch<{
    orders: Array<OrderRecord & { risk_score: number; risk_level: string; risk_reasons: string[] }>;
    threshold: { codRejectionRate: number; minimumOrderValue: number };
    count: number;
  }>(ORDERS_BASE_URL, "/api/orders/cod-fraud-risk");
export const getCustomerProfile = (customerId: string) =>
  backendFetch<{ profile: Record<string, unknown> }>(
    ORDERS_BASE_URL,
    `/api/customers/${encodeURIComponent(customerId)}/profile`,
  );
export const flagOrderPriority = (orderId: string) =>
  backendFetch<{ order: OrderRecord; message: string }>(
    ORDERS_BASE_URL,
    `/api/orders/${encodeURIComponent(orderId)}/priority-flag`,
    { method: "POST" },
  );
export const getOrdersDatabase = () =>
  backendFetch<DatabaseEnvelope<OrdersDatabaseTables>>(ORDERS_BASE_URL, "/api/database");

export const getLowStock = () =>
  backendFetch<LowStockEnvelope>(WAREHOUSE_BASE_URL, "/api/inventory/low-stock");
export const getSkuStock = (sku: string) =>
  backendFetch<SkuEnvelope>(
    WAREHOUSE_BASE_URL,
    `/api/inventory/sku/${encodeURIComponent(sku)}`,
  );
export const createRestockOrder = (body: Record<string, unknown>) =>
  backendFetch<{ order: Record<string, unknown>; message: string }>(
    WAREHOUSE_BASE_URL,
    "/api/inventory/restock-order",
    { method: "POST", body: JSON.stringify(body) },
  );
export const getOpenTickets = () =>
  backendFetch<TicketsEnvelope>(WAREHOUSE_BASE_URL, "/api/tickets/open");
export const escalateTicket = (ticketId: string, body: Record<string, unknown>) =>
  backendFetch<{ ticket: Record<string, unknown>; message: string }>(
    WAREHOUSE_BASE_URL,
    `/api/tickets/${encodeURIComponent(ticketId)}/escalate`,
    { method: "POST", body: JSON.stringify(body) },
  );
export const getWarehouseDatabase = () =>
  backendFetch<DatabaseEnvelope<WarehouseDatabaseTables>>(WAREHOUSE_BASE_URL, "/api/database");

export const getOrdersHealth = () =>
  backendFetch<HealthEnvelope>(ORDERS_BASE_URL, "/api/health");
export const getWarehouseHealth = () =>
  backendFetch<HealthEnvelope>(WAREHOUSE_BASE_URL, "/api/health");

export function inventoryFromRawRows(rows: Record<string, unknown>[]): InventoryRecord[] {
  return rows.map((row) => {
    const physical = Number(row.physical_stock ?? 0);
    const reserved = Number(row.reserved_units ?? 0);
    const threshold = Number(row.reorder_threshold ?? 0);
    const net = physical - reserved;
    return {
      sku: String(row.sku ?? ""),
      item_name: String(row.item_name ?? ""),
      warehouse_zone: String(row.warehouse_zone ?? ""),
      physical_stock: physical,
      reserved_units: reserved,
      net_available: net,
      reorder_threshold: threshold,
      deficit_quantity: Math.max(threshold - net, 0),
      supplier_name: String(row.supplier_name ?? ""),
      lead_time_days: Number(row.lead_time_days ?? 0),
      pending_restock_qty: Number(row.pending_restock_qty ?? 0),
      is_stockout: net <= 0,
    };
  });
}

export function ticketsFromRawRows(rows: Record<string, unknown>[]): TicketRecord[] {
  return rows.map((row) => ({
    ticket_id: String(row.ticket_id ?? ""),
    customer_id: String(row.customer_id ?? ""),
    order_id: String(row.order_id ?? ""),
    subject: String(row.subject ?? ""),
    category: String(row.category ?? "Delivery Delay") as TicketRecord["category"],
    priority: String(row.priority ?? "Low") as TicketRecord["priority"],
    sentiment_score: Number(row.sentiment_score ?? 0),
    status: String(row.status ?? "Open") as TicketRecord["status"],
    sla_minutes_remaining: Number(row.sla_minutes_remaining ?? 0),
    agent_notes: row.agent_notes === null ? null : String(row.agent_notes ?? ""),
    is_sla_critical: Number(row.sla_minutes_remaining ?? 0) <= 30,
  }));
}
