#!/usr/bin/env bash
set -e
echo "=== Activating GET /api/orders/cod-fraud-risk in System A (TypeScript) ==="
node -e '
const fs = require("fs");
const p = "services/orders-service/src/routes/fraudRisk.ts";
let code = fs.readFileSync(p, "utf8");
code = code.replace("/* LIVE_DISCOVER_START", "").replace("LIVE_DISCOVER_END */", "");
fs.writeFileSync(p, code);
'
echo "=== Registering the uncommented route in System A (TypeScript) ==="
node -e '
const fs = require("fs");
const p = "services/orders-service/src/index.ts";
let code = fs.readFileSync(p, "utf8");
code = code
  .replace("// import fraudRiskRoutes from \"./routes/fraudRisk\";", "import fraudRiskRoutes from \"./routes/fraudRisk\";")
  .replace("// app.use(\"/api\", fraudRiskRoutes);", "app.use(\"/api\", fraudRiskRoutes);");
fs.writeFileSync(p, code);
'
echo "=== Running Synapse Incremental Rescan (--discover) ==="
cd services/orders-service
npx @2ndbrainlabs-ai/synapse-cli build --discover --smart-names
