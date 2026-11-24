import { Router, type Request, type Response } from "express";
import {
  FRAUD_COD_REJECTION_THRESHOLD,
  FRAUD_MINIMUM_ORDER_VALUE,
  getFraudRiskOrders,
} from "../db";

const router = Router();

/**
 * OpenAPI and Synapse metadata for the live COD fraud-risk capability.
 *
 * @openapi
 * /api/orders/cod-fraud-risk:
 *   get:
 *     summary: List high-value COD orders placed by customers with elevated COD rejection rates.
 *     description: Flags COD orders of at least 400 units where the customer's cod_rejection_rate exceeds 0.35.
 *     responses:
 *       "200":
 *         description: Fraud-risk orders with risk_score, risk_level, risk_reasons and threshold metadata.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [orders, threshold, count]
 *       "500":
 *         description: The fraud-risk queue could not be loaded.
 * @synapse include=true, tag=fraud-risk, capability=cod-fraud-risk, discover=live
 */
export const COD_FRAUD_RISK_TOOL_METADATA = {
  toolName: "getCodFraudRisk",
  method: "GET",
  path: "/api/orders/cod-fraud-risk",
  threshold: {
    codRejectionRate: FRAUD_COD_REJECTION_THRESHOLD,
    minimumOrderValue: FRAUD_MINIMUM_ORDER_VALUE,
  },
} as const;




/* LIVE_DISCOVER_START
function codFraudRiskHandler(_req: Request, res: Response): void {
  try {
    const orders = getFraudRiskOrders();

    res.status(200).json({
      orders,
      threshold: COD_FRAUD_RISK_TOOL_METADATA.threshold,
      count: orders.length,
    });
  } catch {
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Unable to load COD fraud-risk orders.",
    });
  }
}

router.get("/orders/cod-fraud-risk", codFraudRiskHandler);
LIVE_DISCOVER_END */



export default router;
