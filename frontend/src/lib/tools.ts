import type { ToolDefinition } from "./types";

export const ORDERS_TOOL_COUNT = 4;
export const WAREHOUSE_TOOL_COUNT = 5;

const ordersTools: ToolDefinition[] = [
  {
    id: "listOrders",
    name: "listOrders",
    serverKey: "orders",
    server: "TS: orders-mcp",
    method: "GET",
    endpoint: "/api/orders",
    description: "List orders joined with customer tier with optional status, tier and payment method filters.",
    mutating: false,
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["Delivered", "In Transit", "Delayed", "Processing"] },
        tier: { type: "string", enum: ["VIP", "Gold", "Standard"] },
        payment_method: { type: "string", enum: ["COD", "Prepaid"] },
      },
    },
    outputSummary: "{ orders: OrderWithCustomer[] }",
  },
  {
    id: "getDelayedOrders",
    name: "getDelayedOrders",
    serverKey: "orders",
    server: "TS: orders-mcp",
    method: "GET",
    endpoint: "/api/orders/delayed",
    description: "List delayed orders sorted by VIP tier first, then longest delay duration.",
    mutating: false,
    inputSchema: { type: "object", properties: {} },
    outputSummary: "{ orders: OrderWithCustomer[] }",
  },
  {
    id: "getCustomerProfile",
    name: "getCustomerProfile",
    serverKey: "orders",
    server: "TS: orders-mcp",
    method: "GET",
    endpoint: "/api/customers/:customerId/profile",
    description: "Fetch lifetime value, loyalty tier, city, cod_rejection_rate and order aggregates for a customer.",
    mutating: false,
    inputSchema: {
      type: "object",
      properties: { customerId: { type: "string", example: "CUST-101" } },
      required: ["customerId"],
    },
    outputSummary: "{ profile: CustomerProfile }",
  },
  {
    id: "setOrderPriorityFlag",
    name: "setOrderPriorityFlag",
    serverKey: "orders",
    server: "TS: orders-mcp",
    method: "POST",
    endpoint: "/api/orders/:orderId/priority-flag",
    description: "Idempotently set priority_flagged to 1 so an order receives expedited courier dispatch.",
    mutating: true,
    inputSchema: {
      type: "object",
      properties: { orderId: { type: "string", example: "ORD-5001" } },
      required: ["orderId"],
    },
    outputSummary: "{ order: OrderWithCustomer, message: string }",
  },
];

const fraudRiskTool: ToolDefinition = {
  id: "getCodFraudRisk",
  name: "getCodFraudRisk",
  serverKey: "orders",
  server: "TS: orders-mcp",
  method: "GET",
  endpoint: "/api/orders/cod-fraud-risk",
  description: "Flag high-value COD orders where the customer cod_rejection_rate exceeds 0.35.",
  mutating: false,
  inputSchema: { type: "object", properties: {} },
  outputSummary: "{ orders: FraudRiskOrder[], threshold: object, count: number }",
};

const warehouseTools: ToolDefinition[] = [
  {
    id: "getLowStock",
    name: "getLowStock",
    serverKey: "warehouse",
    server: "PY: warehouse-support-mcp",
    method: "GET",
    endpoint: "/api/inventory/low-stock",
    description: "List SKUs whose net available stock is at or below the reorder threshold, including deficit quantities.",
    mutating: false,
    inputSchema: { type: "object", properties: {} },
    outputSummary: "{ items: LowStockItem[], count: number }",
  },
  {
    id: "getSkuStock",
    name: "getSkuStock",
    serverKey: "warehouse",
    server: "PY: warehouse-support-mcp",
    method: "GET",
    endpoint: "/api/inventory/sku/{sku}",
    description: "Return physical, reserved, net available and pending restock quantities for one SKU.",
    mutating: false,
    inputSchema: {
      type: "object",
      properties: { sku: { type: "string", example: "SKU-JKT-01" } },
      required: ["sku"],
    },
    outputSummary: "{ item: SkuStockResponse }",
  },
  {
    id: "createRestockOrder",
    name: "createRestockOrder",
    serverKey: "warehouse",
    server: "PY: warehouse-support-mcp",
    method: "POST",
    endpoint: "/api/inventory/restock-order",
    description: "Create a supplier purchase order and increment pending_restock_qty for a SKU.",
    mutating: true,
    inputSchema: {
      type: "object",
      properties: {
        sku: { type: "string" },
        quantity: { type: "integer", minimum: 1 },
        supplier_name: { type: "string" },
        reason: { type: "string" },
        requested_by: { type: "string" },
      },
      required: ["sku", "quantity"],
    },
    outputSummary: "{ order: RestockOrderResponse, message: string }",
  },
  {
    id: "getOpenTickets",
    name: "getOpenTickets",
    serverKey: "warehouse",
    server: "PY: warehouse-support-mcp",
    method: "GET",
    endpoint: "/api/tickets/open",
    description: "List Open and Escalated support tickets sorted by remaining SLA minutes ascending.",
    mutating: false,
    inputSchema: { type: "object", properties: {} },
    outputSummary: "{ tickets: SupportTicket[], count: number }",
  },
  {
    id: "escalateTicket",
    name: "escalateTicket",
    serverKey: "warehouse",
    server: "PY: warehouse-support-mcp",
    method: "POST",
    endpoint: "/api/tickets/{ticket_id}/escalate",
    description: "Set a ticket to Escalated and Critical and append an audit note to agent_notes.",
    mutating: true,
    inputSchema: {
      type: "object",
      properties: {
        ticket_id: { type: "string", example: "TKT-891" },
        notes: { type: "string" },
        escalated_by: { type: "string" },
      },
      required: ["ticket_id"],
    },
    outputSummary: "{ ticket: EscalateTicketResponse, message: string }",
  },
];

export function getToolCatalog(discovered: boolean): ToolDefinition[] {
  return discovered
    ? [...ordersTools, fraudRiskTool, ...warehouseTools]
    : [...ordersTools, ...warehouseTools];
}

export function getToolById(id: string, discovered: boolean): ToolDefinition | undefined {
  return getToolCatalog(discovered).find((tool) => tool.id === id);
}

export function getServerToolCount(serverKey: "orders" | "warehouse", discovered: boolean): number {
  if (serverKey === "orders") {
    return discovered ? ORDERS_TOOL_COUNT + 1 : ORDERS_TOOL_COUNT;
  }
  return WAREHOUSE_TOOL_COUNT;
}
