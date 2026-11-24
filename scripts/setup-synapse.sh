#!/usr/bin/env bash
set -e
echo "=== 1. Verifying Synapse CLI ==="
npx @2ndbrainlabs-ai/synapse-cli --version
echo "=== 2. Initializing Synapse projects ==="
if [ ! -f services/orders-service/.synapse/config.json ]; then
  (cd services/orders-service && npx @2ndbrainlabs-ai/synapse-cli init)
else
  echo "System A Synapse project already initialized."
fi
if [ ! -f services/warehouse-support-service/.synapse/config.json ]; then
  (cd services/warehouse-support-service && npx @2ndbrainlabs-ai/synapse-cli init)
else
  echo "System B Synapse project already initialized."
fi
echo "=== 3. Building System A MCP Server (TypeScript Orders Service) ==="
cd services/orders-service
npx @2ndbrainlabs-ai/synapse-cli build --auto \
  --endpoints "GET /api/orders, GET /api/orders/delayed, GET /api/customers/:customerId/profile, POST /api/orders/:orderId/priority-flag" \
  --smart-names
echo "=== 4. Building System B MCP Server (Python Warehouse & Support Service) ==="
cd ../warehouse-support-service
npx @2ndbrainlabs-ai/synapse-cli build --auto \
  --endpoints "GET /api/inventory/low-stock, GET /api/inventory/sku/{sku}, POST /api/inventory/restock-order, GET /api/tickets/open, POST /api/tickets/{ticket_id}/escalate" \
  --smart-names
