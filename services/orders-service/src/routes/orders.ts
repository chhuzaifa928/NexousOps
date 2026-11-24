import { Router, type Request, type Response } from "express";
import {
  flagOrderPriority,
  getCustomerProfile,
  getDatabaseSnapshot,
  getDelayedOrders,
  listOrders,
  seededCounts,
  verifyDatabase,
} from "../db";
import type { HealthResponse } from "../types";

const router = Router();

const VALID_STATUSES = new Set(["Delivered", "In Transit", "Delayed", "Processing"]);
const VALID_TIERS = new Set(["VIP", "Gold", "Standard"]);
const VALID_PAYMENT_METHODS = new Set(["COD", "Prepaid"]);

function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: code, message });
}

function readQueryString(
  value: unknown,
  field: string,
  res: Response,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    sendError(res, 400, "BAD_REQUEST", `Query parameter "${field}" must be a single string.`);
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Report orders-service health, uptime and seed counts.
 *     responses:
 *       "200":
 *         description: Service is healthy and its database is connected.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [status, service, uptimeSeconds, database, seeded, timestamp]
 * @synapse include=false, excluded=true, tag=health, reason=excluded from Synapse discovery
 */
function healthHandler(_req: Request, res: Response): void {
  if (!verifyDatabase()) {
    sendError(res, 503, "SERVICE_UNAVAILABLE", "SQLite integrity check failed.");
    return;
  }

  const payload: HealthResponse = {
    status: "ok",
    service: "orders-service",
    uptimeSeconds: Math.floor(process.uptime()),
    database: "connected",
    seeded: {
      customers: seededCounts.customers,
      orders: seededCounts.orders,
    },
    timestamp: new Date().toISOString(),
  };

  res.status(200).json(payload);
}

/**
 * @openapi
 * /api/orders:
 *   get:
 *     summary: List orders with joined customer profile fields.
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [Delivered, "In Transit", Delayed, Processing]
 *       - in: query
 *         name: tier
 *         required: false
 *         schema:
 *           type: string
 *           enum: [VIP, Gold, Standard]
 *       - in: query
 *         name: payment_method
 *         required: false
 *         schema:
 *           type: string
 *           enum: [COD, Prepaid]
 *     responses:
 *       "200":
 *         description: Matching orders with customer details and is_vip flag.
 *       "400":
 *         description: A query filter was invalid.
 * @synapse include=true, tag=orders, capability=list-orders, filters=status,tier,payment_method
 */
function listOrdersHandler(req: Request, res: Response): void {
  const status = readQueryString(req.query.status, "status", res);
  const tier = readQueryString(req.query.tier, "tier", res);
  const paymentMethod = readQueryString(req.query.payment_method, "payment_method", res);

  if (status === null || tier === null || paymentMethod === null) {
    return;
  }

  if (status !== undefined && !VALID_STATUSES.has(status)) {
    sendError(res, 400, "BAD_REQUEST", `Invalid status filter: ${status}`);
    return;
  }

  if (tier !== undefined && !VALID_TIERS.has(tier)) {
    sendError(res, 400, "BAD_REQUEST", `Invalid tier filter: ${tier}`);
    return;
  }

  if (paymentMethod !== undefined && !VALID_PAYMENT_METHODS.has(paymentMethod)) {
    sendError(res, 400, "BAD_REQUEST", `Invalid payment_method filter: ${paymentMethod}`);
    return;
  }

  const orders = listOrders({ status, tier, payment_method: paymentMethod });
  res.status(200).json({ orders });
}

/**
 * @openapi
 * /api/orders/delayed:
 *   get:
 *     summary: List delayed orders with VIP customers first, then longest delays.
 *     description: Every row includes full customer fields and an is_vip boolean.
 *     responses:
 *       "200":
 *         description: Delayed orders sorted by VIP tier and delay_hours descending.
 * @synapse include=true, tag=orders, capability=delayed-orders, sort=vip-first,delay-hours-desc
 */
function delayedOrdersHandler(_req: Request, res: Response): void {
  const orders = getDelayedOrders();
  res.status(200).json({ orders });
}

/**
 * @openapi
 * /api/customers/{customerId}/profile:
 *   get:
 *     summary: Get a customer profile with order and spend aggregates.
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *           example: CUST-101
 *     responses:
 *       "200":
 *         description: Customer profile with order_count, delayed_order_count and total_spend.
 *       "404":
 *         description: Customer not found.
 * @synapse include=true, tag=customers, capability=customer-profile
 */
function customerProfileHandler(req: Request<{ customerId: string }>, res: Response): void {
  const profile = getCustomerProfile(req.params.customerId);

  if (!profile) {
    sendError(res, 404, "NOT_FOUND", `Customer ${req.params.customerId} was not found.`);
    return;
  }

  res.status(200).json({ profile });
}

/**
 * @openapi
 * /api/orders/{orderId}/priority-flag:
 *   post:
 *     summary: Idempotently set an order's priority_flagged value to 1.
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           example: ORD-5001
 *     responses:
 *       "200":
 *         description: Updated order with customer fields and a confirmation message.
 *       "404":
 *         description: Order not found.
 * @synapse include=true, tag=orders, capability=priority-flag, idempotent=true
 */
function priorityFlagHandler(req: Request<{ orderId: string }>, res: Response): void {
  const order = flagOrderPriority(req.params.orderId);

  if (!order) {
    sendError(res, 404, "NOT_FOUND", `Order ${req.params.orderId} was not found.`);
    return;
  }

  res.status(200).json({
    order,
    message: `Priority flag set for order ${order.order_id}.`,
  });
}

/**
 * @openapi
 * /api/database:
 *   get:
 *     summary: Return a raw snapshot of both SQLite tables for the UI database inspector.
 *     responses:
 *       "200":
 *         description: Raw customers and orders rows from orders.sqlite.
 * @synapse include=false, excluded=true, tag=internal, reason=excluded from Synapse discovery; UI raw DB inspector
 */
function databaseHandler(_req: Request, res: Response): void {
  res.status(200).json(getDatabaseSnapshot());
}

router.get("/api/health", healthHandler);
router.get("/api/orders", listOrdersHandler);
router.get("/api/orders/delayed", delayedOrdersHandler);
router.get("/api/customers/:customerId/profile", customerProfileHandler);
router.post("/api/orders/:orderId/priority-flag", priorityFlagHandler);
router.get("/api/database", databaseHandler);

export default router;
