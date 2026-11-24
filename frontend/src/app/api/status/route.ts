import { NextResponse } from "next/server";
import { getOrdersHealth, getWarehouseHealth } from "@/lib/backend";
import { isFraudRouteActive } from "@/lib/discover-state";
import { getServerToolCount } from "@/lib/tools";
import type { StatusResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const [ordersHealth, warehouseHealth, discovered] = await Promise.all([
    getOrdersHealth(),
    getWarehouseHealth(),
    isFraudRouteActive().catch(() => false),
  ]);

  const payload: StatusResponse = {
    generatedAt: new Date().toISOString(),
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
  };

  return NextResponse.json(payload);
}
