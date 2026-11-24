export interface Customer {
  customer_id: string;
  full_name: string;
  email: string;
  tier: "VIP" | "Gold" | "Standard";
  lifetime_value: number;
  city: string;
  cod_rejection_rate: number;
}

export interface Order {
  order_id: string;
  customer_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  total_amount: number;
  payment_method: "COD" | "Prepaid";
  status: "Delivered" | "In Transit" | "Delayed" | "Processing";
  delay_hours: number | null;
  delay_reason: string | null;
  priority_flagged: number;
  created_at: string;
}

export interface OrderWithCustomer extends Order {
  customer_name: string;
  customer_tier: "VIP" | "Gold" | "Standard";
  customer_email: string;
  customer_city: string;
  customer_lifetime_value: number;
  cod_rejection_rate: number;
  is_vip: boolean;
}

export interface CustomerProfile {
  customer_id: string;
  full_name: string;
  email: string;
  tier: "VIP" | "Gold" | "Standard";
  city: string;
  lifetime_value: number;
  cod_rejection_rate: number;
  order_count: number;
  delayed_order_count: number;
  total_spend: number;
}

export interface FraudRiskOrder extends OrderWithCustomer {
  risk_score: number;
  risk_level: "High" | "Critical";
  risk_reasons: string[];
}

export interface HealthResponse {
  status: "ok";
  service: "orders-service";
  uptimeSeconds: number;
  database: "connected";
  seeded: {
    customers: number;
    orders: number;
  };
  timestamp: string;
}

export interface DatabaseSnapshot {
  database: "orders.sqlite";
  tables: {
    customers: Customer[];
    orders: Order[];
  };
}
