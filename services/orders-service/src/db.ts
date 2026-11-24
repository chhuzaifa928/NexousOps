import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import type {
  Customer,
  CustomerProfile,
  DatabaseSnapshot,
  FraudRiskOrder,
  Order,
  OrderWithCustomer,
} from "./types";

interface JoinedOrderRow extends Order {
  customer_name: string;
  customer_tier: "VIP" | "Gold" | "Standard";
  customer_email: string;
  customer_city: string;
  customer_lifetime_value: number;
  cod_rejection_rate: number;
  is_vip_flag: number;
}

interface CustomerProfileRow extends Customer {
  order_count: number;
  delayed_order_count: number;
  total_spend: number;
}

export interface OrderFilters {
  status?: string;
  tier?: string;
  payment_method?: string;
}

export const FRAUD_COD_REJECTION_THRESHOLD = 0.35;
export const FRAUD_MINIMUM_ORDER_VALUE = 400;

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const serviceRoot = path.resolve(currentDirectory, "..");
const configuredDatabasePath = process.env.ORDERS_DB_PATH;
const defaultDatabasePath =
  process.env.VERCEL === "1"
    ? path.join(os.tmpdir(), "nexusops-orders.sqlite")
    : path.join(serviceRoot, "data", "orders.sqlite");

export const databasePath =
  configuredDatabasePath && configuredDatabasePath !== ":memory:"
    ? path.isAbsolute(configuredDatabasePath)
      ? configuredDatabasePath
      : path.resolve(serviceRoot, configuredDatabasePath)
    : configuredDatabasePath ?? defaultDatabasePath;

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

export const db = new Database(databasePath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    customer_id TEXT PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    tier TEXT CHECK (tier IN ('VIP', 'Gold', 'Standard')),
    lifetime_value REAL,
    city TEXT,
    cod_rejection_rate REAL DEFAULT 0.0
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    order_id TEXT PRIMARY KEY,
    customer_id TEXT,
    sku TEXT,
    product_name TEXT,
    quantity INTEGER,
    total_amount REAL,
    payment_method TEXT CHECK (payment_method IN ('COD', 'Prepaid')),
    status TEXT CHECK (status IN ('Delivered', 'In Transit', 'Delayed', 'Processing')),
    delay_hours INTEGER,
    delay_reason TEXT,
    priority_flagged INTEGER DEFAULT 0,
    created_at TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
  )
`);

const CUSTOMERS: Customer[] = [
  { customer_id: "CUST-101", full_name: "Ayesha Tariq", email: "ayesha.tariq@example.com", tier: "VIP", lifetime_value: 4850, city: "Lahore", cod_rejection_rate: 0.12 },
  { customer_id: "CUST-102", full_name: "Zainab Malik", email: "zainab.malik@example.com", tier: "VIP", lifetime_value: 6120, city: "Karachi", cod_rejection_rate: 0.08 },
  { customer_id: "CUST-103", full_name: "Usman Farooq", email: "usman.farooq@example.com", tier: "Gold", lifetime_value: 2980, city: "Islamabad", cod_rejection_rate: 0.18 },
  { customer_id: "CUST-104", full_name: "Fatima Khan", email: "fatima.khan@example.com", tier: "VIP", lifetime_value: 7350, city: "Dubai", cod_rejection_rate: 0.06 },
  { customer_id: "CUST-105", full_name: "Bilal Ahmed", email: "bilal.ahmed@example.com", tier: "Standard", lifetime_value: 940, city: "Lahore", cod_rejection_rate: 0.68 },
  { customer_id: "CUST-106", full_name: "Sana Iqbal", email: "sana.iqbal@example.com", tier: "Gold", lifetime_value: 1850, city: "Multan", cod_rejection_rate: 0.22 },
  { customer_id: "CUST-107", full_name: "Hamza Sheikh", email: "hamza.sheikh@example.com", tier: "Standard", lifetime_value: 1120, city: "Rawalpindi", cod_rejection_rate: 0.52 },
  { customer_id: "CUST-108", full_name: "Maria Javed", email: "maria.javed@example.com", tier: "VIP", lifetime_value: 5280, city: "Karachi", cod_rejection_rate: 0.14 },
  { customer_id: "CUST-109", full_name: "Ali Raza", email: "ali.raza@example.com", tier: "Standard", lifetime_value: 760, city: "Faisalabad", cod_rejection_rate: 0.31 },
  { customer_id: "CUST-110", full_name: "Hina Nawaz", email: "hina.nawaz@example.com", tier: "Gold", lifetime_value: 2410, city: "Lahore", cod_rejection_rate: 0.19 },
  { customer_id: "CUST-111", full_name: "Omar Siddiqui", email: "omar.siddiqui@example.com", tier: "VIP", lifetime_value: 4890, city: "Islamabad", cod_rejection_rate: 0.09 },
  { customer_id: "CUST-112", full_name: "Aisha Noor", email: "aisha.noor@example.com", tier: "Standard", lifetime_value: 1320, city: "Peshawar", cod_rejection_rate: 0.44 },
  { customer_id: "CUST-113", full_name: "Daniyal Shah", email: "daniyal.shah@example.com", tier: "Gold", lifetime_value: 3670, city: "Karachi", cod_rejection_rate: 0.16 },
  { customer_id: "CUST-114", full_name: "Rabia Butt", email: "rabia.butt@example.com", tier: "Standard", lifetime_value: 820, city: "Gujranwala", cod_rejection_rate: 0.38 },
  { customer_id: "CUST-115", full_name: "Kamran Ali", email: "kamran.ali@example.com", tier: "VIP", lifetime_value: 5540, city: "Lahore", cod_rejection_rate: 0.11 },
];

const ORDERS: Order[] = [
  { order_id: "ORD-5001", customer_id: "CUST-101", sku: "SKU-JKT-01", product_name: "Alpine Tech Jacket", quantity: 2, total_amount: 640, payment_method: "COD", status: "Delayed", delay_hours: 52, delay_reason: "Customs documentation hold at Lahore sorting hub", priority_flagged: 0, created_at: "2026-02-02T08:00:00.000Z" },
  { order_id: "ORD-5002", customer_id: "CUST-102", sku: "SKU-SNK-04", product_name: "Carbon Runner Pro", quantity: 1, total_amount: 240, payment_method: "Prepaid", status: "Delayed", delay_hours: 38, delay_reason: "Karachi hub conveyor outage", priority_flagged: 0, created_at: "2026-02-02T12:30:00.000Z" },
  { order_id: "ORD-5003", customer_id: "CUST-103", sku: "SKU-HOD-02", product_name: "Merino Travel Hoodie", quantity: 3, total_amount: 435, payment_method: "Prepaid", status: "In Transit", delay_hours: null, delay_reason: null, priority_flagged: 0, created_at: "2026-02-03T06:15:00.000Z" },
  { order_id: "ORD-5004", customer_id: "CUST-104", sku: "SKU-BAG-07", product_name: "Tactical Laptop Backpack", quantity: 1, total_amount: 189, payment_method: "COD", status: "Delivered", delay_hours: null, delay_reason: null, priority_flagged: 0, created_at: "2026-02-03T10:45:00.000Z" },
  { order_id: "ORD-5005", customer_id: "CUST-106", sku: "SKU-WTC-03", product_name: "Precision Mechanical Watch", quantity: 1, total_amount: 310, payment_method: "Prepaid", status: "Processing", delay_hours: null, delay_reason: null, priority_flagged: 0, created_at: "2026-02-04T07:20:00.000Z" },
  { order_id: "ORD-5006", customer_id: "CUST-105", sku: "SKU-HDP-09", product_name: "Studio Headphones", quantity: 2, total_amount: 590, payment_method: "COD", status: "Processing", delay_hours: null, delay_reason: null, priority_flagged: 0, created_at: "2026-02-04T13:10:00.000Z" },
  { order_id: "ORD-5007", customer_id: "CUST-108", sku: "SKU-CAM-05", product_name: "Compact Action Camera", quantity: 1, total_amount: 260, payment_method: "Prepaid", status: "Delayed", delay_hours: 17, delay_reason: "Weather disruption on Multan route", priority_flagged: 0, created_at: "2026-02-05T05:40:00.000Z" },
  { order_id: "ORD-5008", customer_id: "CUST-110", sku: "SKU-SHT-06", product_name: "Thermal Base Layer", quantity: 4, total_amount: 216, payment_method: "COD", status: "In Transit", delay_hours: null, delay_reason: null, priority_flagged: 0, created_at: "2026-02-05T11:05:00.000Z" },
  { order_id: "ORD-5009", customer_id: "CUST-107", sku: "SKU-BAG-07", product_name: "Tactical Laptop Backpack", quantity: 2, total_amount: 480, payment_method: "COD", status: "Delayed", delay_hours: 29, delay_reason: "Address verification pending at depo", priority_flagged: 0, created_at: "2026-02-06T09:25:00.000Z" },
  { order_id: "ORD-5010", customer_id: "CUST-111", sku: "SKU-JKT-01", product_name: "Alpine Tech Jacket", quantity: 1, total_amount: 320, payment_method: "Prepaid", status: "Delayed", delay_hours: 21, delay_reason: "Islamabad hub backlog", priority_flagged: 0, created_at: "2026-02-06T15:50:00.000Z" },
  { order_id: "ORD-5011", customer_id: "CUST-112", sku: "SKU-BTL-10", product_name: "Insulated Trail Bottle", quantity: 3, total_amount: 87, payment_method: "COD", status: "In Transit", delay_hours: null, delay_reason: null, priority_flagged: 0, created_at: "2026-02-07T08:35:00.000Z" },
  { order_id: "ORD-5012", customer_id: "CUST-113", sku: "SKU-GLV-11", product_name: "All-Weather Cycling Gloves", quantity: 2, total_amount: 96, payment_method: "Prepaid", status: "Delivered", delay_hours: null, delay_reason: null, priority_flagged: 0, created_at: "2026-02-07T14:20:00.000Z" },
  { order_id: "ORD-5013", customer_id: "CUST-114", sku: "SKU-HDP-09", product_name: "Studio Headphones", quantity: 1, total_amount: 295, payment_method: "COD", status: "Processing", delay_hours: null, delay_reason: null, priority_flagged: 0, created_at: "2026-02-08T06:55:00.000Z" },
  { order_id: "ORD-5014", customer_id: "CUST-115", sku: "SKU-SNK-04", product_name: "Carbon Runner Pro", quantity: 1, total_amount: 240, payment_method: "Prepaid", status: "Delayed", delay_hours: 14, delay_reason: "Courier handoff delay", priority_flagged: 0, created_at: "2026-02-08T12:40:00.000Z" },
  { order_id: "ORD-5015", customer_id: "CUST-104", sku: "SKU-CAM-05", product_name: "Compact Action Camera", quantity: 2, total_amount: 520, payment_method: "Prepaid", status: "In Transit", delay_hours: null, delay_reason: null, priority_flagged: 0, created_at: "2026-02-09T07:10:00.000Z" },
  { order_id: "ORD-5016", customer_id: "CUST-109", sku: "SKU-HOD-02", product_name: "Merino Travel Hoodie", quantity: 1, total_amount: 145, payment_method: "COD", status: "Delivered", delay_hours: null, delay_reason: null, priority_flagged: 0, created_at: "2026-02-09T13:45:00.000Z" },
  { order_id: "ORD-5017", customer_id: "CUST-102", sku: "SKU-WTC-03", product_name: "Precision Mechanical Watch", quantity: 1, total_amount: 310, payment_method: "Prepaid", status: "Processing", delay_hours: null, delay_reason: null, priority_flagged: 0, created_at: "2026-02-10T09:00:00.000Z" },
  { order_id: "ORD-5018", customer_id: "CUST-101", sku: "SKU-GLV-11", product_name: "All-Weather Cycling Gloves", quantity: 2, total_amount: 96, payment_method: "Prepaid", status: "Delayed", delay_hours: 33, delay_reason: "Lahore hub capacity overflow", priority_flagged: 0, created_at: "2026-02-10T16:30:00.000Z" },
];

export const seededCounts = {
  customers: CUSTOMERS.length,
  orders: ORDERS.length,
};

const seedDatabase = db.transaction(() => {
  const insertCustomer = db.prepare(`
    INSERT OR REPLACE INTO customers
      (customer_id, full_name, email, tier, lifetime_value, city, cod_rejection_rate)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const customer of CUSTOMERS) {
    insertCustomer.run(
      customer.customer_id,
      customer.full_name,
      customer.email,
      customer.tier,
      customer.lifetime_value,
      customer.city,
      customer.cod_rejection_rate,
    );
  }

  const insertOrder = db.prepare(`
    INSERT OR REPLACE INTO orders
      (order_id, customer_id, sku, product_name, quantity, total_amount, payment_method,
       status, delay_hours, delay_reason, priority_flagged, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const order of ORDERS) {
    insertOrder.run(
      order.order_id,
      order.customer_id,
      order.sku,
      order.product_name,
      order.quantity,
      order.total_amount,
      order.payment_method,
      order.status,
      order.delay_hours,
      order.delay_reason,
      order.priority_flagged,
      order.created_at,
    );
  }
});

db.pragma("defer_foreign_keys = ON");
seedDatabase();
db.pragma("defer_foreign_keys = OFF");

const ORDER_SELECT = `
  SELECT
    o.order_id,
    o.customer_id,
    o.sku,
    o.product_name,
    o.quantity,
    o.total_amount,
    o.payment_method,
    o.status,
    o.delay_hours,
    o.delay_reason,
    o.priority_flagged,
    o.created_at,
    c.full_name AS customer_name,
    c.tier AS customer_tier,
    c.email AS customer_email,
    c.city AS customer_city,
    c.lifetime_value AS customer_lifetime_value,
    c.cod_rejection_rate AS cod_rejection_rate,
    CASE WHEN c.tier = 'VIP' THEN 1 ELSE 0 END AS is_vip_flag
  FROM orders o
  INNER JOIN customers c ON c.customer_id = o.customer_id
`;

function allRows<T>(sql: string, params: unknown[] | Record<string, unknown> = []): T[] {
  const statement = db.prepare(sql);

  if (Array.isArray(params)) {
    return (params.length > 0 ? statement.all(...params) : statement.all()) as T[];
  }

  return (Object.keys(params).length > 0 ? statement.all(params) : statement.all()) as T[];
}

function mapOrderRow(row: JoinedOrderRow): OrderWithCustomer {
  const { is_vip_flag, ...order } = row;
  return { ...order, is_vip: is_vip_flag === 1 };
}

function getOrderWithCustomerById(orderId: string): OrderWithCustomer | undefined {
  const rows = allRows<JoinedOrderRow>(`${ORDER_SELECT} WHERE o.order_id = ?`, [orderId]);
  return rows.length > 0 ? mapOrderRow(rows[0]) : undefined;
}

export function listOrders(filters: OrderFilters = {}): OrderWithCustomer[] {
  const clauses: string[] = [];
  const params: Record<string, string> = {};

  if (filters.status) {
    clauses.push("o.status = @status");
    params.status = filters.status;
  }

  if (filters.tier) {
    clauses.push("c.tier = @tier");
    params.tier = filters.tier;
  }

  if (filters.payment_method) {
    clauses.push("o.payment_method = @payment_method");
    params.payment_method = filters.payment_method;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = allRows<JoinedOrderRow>(
    `${ORDER_SELECT} ${where} ORDER BY o.created_at DESC, o.order_id ASC`,
    params,
  );

  return rows.map(mapOrderRow);
}

export function getDelayedOrders(): OrderWithCustomer[] {
  const rows = allRows<JoinedOrderRow>(`
    ${ORDER_SELECT}
    WHERE o.status = 'Delayed'
    ORDER BY
      CASE WHEN c.tier = 'VIP' THEN 0 ELSE 1 END ASC,
      o.delay_hours DESC,
      o.order_id ASC
  `);

  return rows.map(mapOrderRow);
}

export function getCustomerProfile(customerId: string): CustomerProfile | undefined {
  const rows = allRows<CustomerProfileRow>(
    `SELECT
       c.customer_id,
       c.full_name,
       c.email,
       c.tier,
       c.city,
       c.lifetime_value,
       c.cod_rejection_rate,
       (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.customer_id) AS order_count,
       (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.customer_id AND o.status = 'Delayed') AS delayed_order_count,
       COALESCE((SELECT SUM(o.total_amount) FROM orders o WHERE o.customer_id = c.customer_id), 0) AS total_spend
     FROM customers c
     WHERE c.customer_id = ?`,
    [customerId],
  );

  return rows.length > 0 ? { ...rows[0] } : undefined;
}

export function flagOrderPriority(orderId: string): OrderWithCustomer | undefined {
  const result = db
    .prepare("UPDATE orders SET priority_flagged = 1 WHERE order_id = ?")
    .run(orderId);

  if (result.changes === 0) {
    return undefined;
  }

  return getOrderWithCustomerById(orderId);
}

export function getFraudRiskOrders(): FraudRiskOrder[] {
  const rows = allRows<JoinedOrderRow>(
    `${ORDER_SELECT}
     WHERE o.payment_method = 'COD'
       AND o.total_amount >= @minimumOrderValue
       AND c.cod_rejection_rate > @codRejectionRate
     ORDER BY c.cod_rejection_rate DESC, o.total_amount DESC, o.order_id ASC`,
    {
      minimumOrderValue: FRAUD_MINIMUM_ORDER_VALUE,
      codRejectionRate: FRAUD_COD_REJECTION_THRESHOLD,
    },
  );

  return rows.map((row) => {
    const rejectionPercent = Math.round(row.cod_rejection_rate * 100);
    const valueScore = Math.min(40, Math.round(row.total_amount / 20));
    const rateScore = Math.min(60, rejectionPercent);
    const riskScore = Math.min(100, rateScore + valueScore);
    const riskLevel: FraudRiskOrder["risk_level"] = riskScore >= 80 ? "Critical" : "High";

    const riskReasons = [
      `COD rejection rate ${rejectionPercent}% exceeds ${Math.round(FRAUD_COD_REJECTION_THRESHOLD * 100)}% threshold`,
      `High-value COD order worth ${row.total_amount}`,
    ];

    return {
      ...mapOrderRow(row),
      risk_score: riskScore,
      risk_level: riskLevel,
      risk_reasons: riskReasons,
    };
  });
}

export function getDatabaseSnapshot(): DatabaseSnapshot {
  const customers = allRows<Customer>("SELECT * FROM customers ORDER BY customer_id ASC");
  const orders = allRows<Order>("SELECT * FROM orders ORDER BY order_id ASC");

  return {
    database: "orders.sqlite",
    tables: { customers, orders },
  };
}

export function verifyDatabase(): boolean {
  try {
    return db.pragma("integrity_check", { simple: true }) === "ok";
  } catch {
    return false;
  }
}

export function getSeededCounts(): { customers: number; orders: number } {
  return { ...seededCounts };
}
