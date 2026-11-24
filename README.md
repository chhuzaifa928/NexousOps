# NexusOps

NexusOps is a runnable, polyglot operations command center that turns two independent services into curated MCP tools and joins them through a deterministic, safety-gated AI copilot.

The repository implements the full SRS: seeded SQLite databases, Synapse `build --auto --smart-names`, live `--discover`, real tool traces, responsive light-mode UI, and a human approval gate before every mutation.

## Architecture

| Component | Location | Stack | Port | Datastore |
| --- | --- | --- | --- | --- |
| Command center | `frontend/` | Next.js 14, TypeScript, Tailwind, Framer Motion, Lucide | `3000` | Reads APIs only |
| System A | `services/orders-service/` | TypeScript, Express, `better-sqlite3` | `4001` | `data/orders.sqlite` |
| System B | `services/warehouse-support-service/` | Python, FastAPI, Pydantic v2 | `4002` | `data/warehouse.sqlite` |
| MCP generation | `@2ndbrainlabs-ai/synapse-cli` | Hosted Auto builds, `--smart-names`, `--discover` | stdio/npx runner | Synapse account |

System A has no Python and no plain `.js` source files. System B has no TypeScript source files. The two services share no application code; they are joined only by HTTP calls from the Next.js Copilot route.

## What is seeded

System A starts with 15 customers (`CUST-101` through `CUST-115`) and 18 orders (`ORD-5001` through `ORD-5018`).

System B starts with 10 SKU inventory rows and 9 support tickets. Low-stock skus and SLA-critical tickets are deterministic so the demo works identically on every boot.

Live dashboard expectations on a fresh database:

- Delayed VIP orders: 6
- Low-stock skus: 4
- SLA-critical tickets: 2
- Revenue at risk: `$2,866`
- Cross-system table rows: 18

## Prerequisites

- Node.js 22 or newer
- Python 3.11 or newer
- Bash on `PATH` for `npm run setup:synapse` and `npm run live:discover` (Git Bash or WSL on Windows)
- Synapse API key only if you want to generate hosted MCP servers
- Optional LLM key if you want polished Copilot prose instead of deterministic answers

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

`npm install` installs workspace packages and runs `npm run setup:python`. `npm run dev` starts System A on `4001`, System B on `4002`, and the command center on `3000`. Both SQLite files are seeded automatically when their services start.

Useful root commands:

```bash
npm run typecheck
npm run lint
npm run build
npm run setup:synapse
npm run live:discover
```

If port `3000` is already occupied, stop the conflicting process or start the frontend directly on another port with `npm --prefix frontend exec next dev -- -p 3100`.

## Environment variables

| Variable | Used by | Purpose |
| --- | --- | --- |
| `ORDERS_SERVICE_URL` | Frontend | Overrides `http://127.0.0.1:4001` |
| `WAREHOUSE_SERVICE_URL` | Frontend | Overrides `http://127.0.0.1:4002` |
| `ORDERS_DB_PATH` | System A | Overrides the orders SQLite file path |
| `WAREHOUSE_DB_PATH` | System B | Overrides the warehouse SQLite file path |
| `NEXUSOPS_APP_SECRET` | Copilot | Signs approval tokens; set a stable value outside local demos |
| `LLM_PROVIDER` | Copilot | `openai` or `anthropic` |
| `LLM_API_KEY` / `OPENAI_API_KEY` | Copilot | Enables OpenAI-compatible synthesis |
| `ANTHROPIC_API_KEY` | Copilot | Enables Anthropic synthesis |
| `LLM_BASE_URL` / `OPENAI_BASE_URL` | Copilot | Overrides the OpenAI-compatible base URL |
| `LLM_MODEL` | Copilot | Overrides the default model |
| `NEXUSOPS_RUN_SYNAPSE_CLI` | Live Discover API | Set to `true` to invoke the hosted CLI from the in-app panel |
| `SYNAPSE_API_KEY` | Synapse CLI | Hosted MCP generation auth |

No LLM key is required. Without one, Copilot uses the deterministic tool-chain router and returns factual answers and traces from real HTTP requests.

## Synapse MCP generation

Initialize the CLI once in each service, then build two curated Auto servers:

```bash
cd services/orders-service
synapse init
synapse build --auto \
  --endpoints "GET /api/orders, GET /api/orders/delayed, GET /api/customers/:customerId/profile, POST /api/orders/:orderId/priority-flag" \
  --smart-names

cd ../warehouse-support-service
synapse init
synapse build --auto \
  --endpoints "GET /api/inventory/low-stock, GET /api/inventory/sku/{sku}, POST /api/inventory/restock-order, GET /api/tickets/open, POST /api/tickets/{ticket_id}/escalate" \
  --smart-names
```

The repository script performs the same sequence:

```bash
export SYNAPSE_API_KEY=your-key
npm run setup:synapse
```

Health and raw database snapshot routes are deliberately excluded from tool generation. Handler JSDoc and Python docstrings provide Synapse metadata, while OpenAPI annotations document the public contracts.

### MCP client configuration

`synapse build` prints one server id per project and stores it in that service's `.synapse/config.json`. Copy the printed ids into your MCP client config:

```json
{
  "mcpServers": {
    "orders-mcp": {
      "command": "npx",
      "args": ["-y", "@2ndbrainlabs-ai/synapse-mcp"],
      "env": {
        "SYNAPSE_API_KEY": "your-synapse-api-key",
        "SYNAPSE_SERVER_ID": "orders-server-id-from-synapse-build",
        "SYNAPSE_API_URL": "https://api.synapse.2ndbrainlabs.ai"
      }
    },
    "warehouse-support-mcp": {
      "command": "npx",
      "args": ["-y", "@2ndbrainlabs-ai/synapse-mcp"],
      "env": {
        "SYNAPSE_API_KEY": "your-synapse-api-key",
        "SYNAPSE_SERVER_ID": "warehouse-server-id-from-synapse-build",
        "SYNAPSE_API_URL": "https://api.synapse.2ndbrainlabs.ai"
      }
    }
  }
}
```

Claude Desktop uses `%APPDATA%\Claude\claude_desktop_config.json` on Windows and `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS. Cursor uses `~/.cursor/mcp.json` or `.cursor/mcp.json`. Fully restart Claude Desktop after editing its config.

## Live discover

The dormant route is `GET /api/orders/cod-fraud-risk`. Its handler is wrapped by `/* LIVE_DISCOVER_START` and `LIVE_DISCOVER_END */`, and its registration lines in `services/orders-service/src/index.ts` are commented with the exact marker `// UNCOMMENT FOR LIVE SYNAPSE --DISCOVER DEMO`.

Run the CLI demo from Bash:

```bash
npm run live:discover
```

Or use the in-app Live Discover panel. It calls:

```bash
POST /api/live-discover
{"action":"activate"}
```

Activation removes the markers, uncomments the two registration lines, waits for `tsx watch` to restart System A, registers `getCodFraudRisk` in the tool catalog, and increases the orders tool count from 4 to 5. Deactivation restores the exact dormant source state.

Manual incremental rescan:

```bash
cd services/orders-service
synapse build --discover --smart-names
```

To make the in-app panel execute the hosted CLI too:

```bash
NEXUSOPS_RUN_SYNAPSE_CLI=true npm run dev
```

## Copilot workflows

| Prompt | Workflow | Tools joined |
| --- | --- | --- |
| Which VIP customers have delayed orders, what is the warehouse bottleneck, and have they filed a support ticket? | `vip-bottleneck-join` | Delayed orders, customer profiles, low stock, tickets |
| Draft a restock PO for the SKUs blocking VIP orders and escalate their support tickets — ask my confirmation first. | `remediation-safety-gate` | Low stock, SKU stock, open tickets |
| Set the priority flag for ORD-5001 and expedite dispatch. | `priority-flag-safety-gate` | Delayed orders, priority flag |
| Run the COD fraud-risk check on the newly discovered tool. | `cod-fraud-risk-join` | `getCodFraudRisk`, customer profiles, support tickets |

Read-only workflows execute immediately. Mutating workflows return a signed plan and perform no writes until the operator clicks Approve. Approval tokens expire after 10 minutes and are scoped to an allowlist of three endpoints.

## API catalog

System A:

- `GET /api/health`
- `GET /api/orders`
- `GET /api/orders/delayed`
- `GET /api/customers/:customerId/profile`
- `POST /api/orders/:orderId/priority-flag`
- `GET /api/database`
- `GET /api/orders/cod-fraud-risk` after live discovery

System B:

- `GET /api/health`
- `GET /api/inventory/low-stock`
- `GET /api/inventory/sku/:sku`
- `POST /api/inventory/restock-order`
- `GET /api/tickets/open`
- `POST /api/tickets/:ticket_id/escalate`
- `GET /api/database`

Next.js:

- `GET /api/status`
- `GET /api/overview`
- `POST /api/copilot`
- `GET /api/live-discover`
- `POST /api/live-discover`

## UI map

- **Command Center**: KPI ribbon, responsive cross-system table, service health pills, Copilot panel.
- **Live MCP Topology**: polyglot architecture map, server identities, generated tool signatures, raw SQLite inspector.
- **Copilot**: expandable trace cards with server label, method, endpoint, latency, request/response JSON, and durable reasoning trace.
- **Safety card**: proposed mutations, exact target records, before/after impact, Confirm and Cancel controls.
- **Live Discover panel**: dormant/active state, Synapse CLI command and output, tool-count change, activation and deactivation controls.

At widths below `1024px`, the topology becomes a drawer and Copilot becomes a slide-up sheet. There is no dark theme and no horizontal page overflow.

## Verification

```bash
npm run typecheck
npm run lint
npm run build
python -m compileall -q services/warehouse-support-service/app
```

Expected runtime checks on a fresh boot:

```bash
curl http://127.0.0.1:4001/api/health
curl http://127.0.0.1:4002/api/health
curl http://127.0.0.1:3000/api/status
curl http://127.0.0.1:3000/api/overview
```

## Three-act pitch script

**Act 1 — One question, two systems.** Open the dashboard and ask: “Which VIP customers have delayed orders, what is the warehouse bottleneck, and have they filed a support ticket?” Show the three trace cards: orders-mcp finds the delayed VIP orders, warehouse-support-mcp finds the stock deficit, and the support queue supplies SLA context. Point to the KPI ribbon and the joined table.

**Act 2 — Reasoning with a safety gate.** Ask: “Draft a restock PO for the SKUs blocking VIP orders and escalate their support tickets — ask my confirmation first.” Show that no write happens yet. Inspect the plan card, target SKUs, ticket ids, and before/after impact. Click Confirm and refresh the raw SQLite inspector to prove that `pending_restock_qty` and ticket states changed.

**Act 3 — Live schema evolution.** Open Live Discover. Show the dormant route source and 4-tool orders server. Activate discovery, show the CLI output, point to the service restarting, and ask: “Run the COD fraud-risk check on the newly discovered tool.” The new tool appears, the orders pill changes to 5 tools, and the fraud-risk join returns COD rejection evidence. Deactivate to return to the original state.

## Troubleshooting

- **`EADDRINUSE` on port 3000:** another process owns the port; stop it or run the frontend on an alternate port.
- **`better-sqlite3` native build failure:** use Node 22+ and reinstall. Version 13 ships prebuilt binaries for current Node releases.
- **`Not Initialized` from Synapse:** run `synapse init` inside the service directory, or `npm run setup:synapse` with `SYNAPSE_API_KEY` set.
- **Copilot answers are deterministic:** that is the offline fallback. Add `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` for LLM-polished prose; deterministic tool results remain authoritative.
- **Fraud endpoint returns 404:** it is dormant by design until Live Discover activation uncomments the route and registration lines.
