import { NextResponse } from "next/server";
import {
  getOrders,
  getOrdersDatabase,
  getOrdersHealth,
  getWarehouseDatabase,
  getWarehouseHealth,
  inventoryFromRawRows,
  ticketsFromRawRows,
} from "@/lib/backend";
import { isFraudRouteActive } from "@/lib/discover-state";
import { getServerToolCount } from "@/lib/tools";
import type {
  CrossSystemRow,
  Kpis,
  OverviewResponse,
  TicketRecord,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function findTicket(
  tickets: TicketRecord[],
  order: { order_id: string; customer_id: string },
): TicketRecord | null {
  return (
    tickets.find((ticket) => ticket.order_id === order.order_id) ??
    tickets.find((ticket) => ticket.customer_id === order.customer_id) ??
    null
  );
}

export async function GET() {
  const [ordersResult, ordersDbResult, warehouseDbResult, ordersHealth, warehouseHealth, discovered] =
    await Promise.all([
      getOrders(),
      getOrdersDatabase(),
      getWarehouseDatabase(),
      getOrdersHealth(),
      getWarehouseHealth(),
      isFraudRouteActive().catch(() => false),
    ]);

  const orders = ordersResult.data?.orders ?? [];
  const inventory = warehouseDbResult.data
    ? inventoryFromRawRows(warehouseDbResult.data.tables.inventory)
    : [];
  const tickets = warehouseDbResult.data
    ? ticketsFromRawRows(warehouseDbResult.data.tables.support_tickets)
    : [];
  const activeTickets = tickets.filter(
    (ticket) => ticket.status === "Open" || ticket.status === "Escalated",
  );

  const inventoryBySku = new Map(inventory.map((item) => [item.sku, item]));
  const rows: CrossSystemRow[] = orders.map((order) => {
    const stock = inventoryBySku.get(order.sku) ?? null;
    const ticket = findTicket(activeTickets, order);
    const hasStockDeficit = stock ? stock.net_available < 0 || stock.net_available <= stock.reorder_threshold : false;
    const hasOpenTicket = ticket !== null;
    const isHighCodRisk =
      order.payment_method === "COD" &&
      order.cod_rejection_rate > 0.35 &&
      order.total_amount >= 400;
    const atRisk =
      (order.status === "Delayed" || isHighCodRisk) &&
      (order.is_vip || hasStockDeficit || hasOpenTicket);

    return {
      order,
      stock,
      ticket,
      hasStockDeficit,
      hasOpenTicket,
      isHighCodRisk,
      revenueAtRisk: atRisk ? order.total_amount : 0,
    };
  });

  const kpis: Kpis = {
    delayedVipOrders: orders.filter((order) => order.status === "Delayed" && order.is_vip).length,
    stockoutBottlenecks: inventory.filter((item) => item.net_available < 0).length,
    slaCriticalTickets: activeTickets.filter((ticket) => ticket.sla_minutes_remaining <= 30).length,
    revenueAtRisk: rows.reduce((total, row) => total + row.revenueAtRisk, 0),
  };

  const payload: OverviewResponse = {
    kpis,
    rows,
    orders,
    inventory,
    tickets,
    databases: {
      orders: ordersDbResult.ok && ordersDbResult.data ? ordersDbResult.data : null,
      warehouse: warehouseDbResult.ok && warehouseDbResult.data ? warehouseDbResult.data : null,
    },
    services: {
      orders: {
        state: ordersHealth.ok ? "online" : "offline",
        latencyMs: ordersHealth.latencyMs,
        toolCount: getServerToolCount("orders", discovered),
        service: ordersHealth.data?.service,
        seeded: ordersHealth.data?.seeded,
        error: ordersHealth.error ?? undefined,
      },
      warehouse: {
        state: warehouseHealth.ok ? "online" : "offline",
        latencyMs: warehouseHealth.latencyMs,
        toolCount: getServerToolCount("warehouse", discovered),
        service: warehouseHealth.data?.service,
        seeded: warehouseHealth.data?.seeded,
        error: warehouseHealth.error ?? undefined,
      },
    },
    generatedAt: new Date().toISOString(),
  };

  return NextResponse.json(payload);
}
