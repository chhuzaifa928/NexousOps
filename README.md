# NexusOps

**A guided operations workspace for cross-system decisions.**

NexusOps turns two independent services into one clear application: see what needs attention, ask questions in plain English, inspect the evidence, and approve changes safely. It is a complete local demo of a modern operations copilot built on Next.js, Express, FastAPI, SQLite, and Synapse MCP.

> **Stack** · Next.js 14 · TypeScript · Express · Python · FastAPI · SQLite · Synapse CLI  
> **Interface** · Guided Home, Orders, Copilot, Data, and Discovery screens · Light mode · Responsive

---

## Contents

- [Why NexusOps](#why-nexusops)
- [Quick start](#quick-start)
- [The application](#the-application)
- [Architecture](#architecture)
- [Guided demo](#guided-demo)
- [Synapse MCP generation](#synapse-mcp-generation)
- [Live discovery](#live-discovery)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

---

## Why NexusOps

Most internal tools expose raw endpoints and expect the operator to connect the dots. NexusOps does the opposite: it presents a small number of understandable screens and explains every step.

| Capability | What the operator sees | What happens underneath |
| --- | --- | --- |
| Priorities | A plain-language shortlist of delayed, blocked, and SLA-risk orders | Joined data from orders, inventory, and support |
| Copilot | A conversational answer with expandable evidence | Real HTTP tool calls with traced requests and responses |
| Safety | A review card before any write | HMAC-signed approval token with a 10-minute expiry |
| Discovery | A one-click guided walkthrough | Hidden route revealed, service rescanned, tool registered |
| Data | Connection status and stored information | Health checks and raw SQLite snapshots |

No LLM key is required. Without one, the Copilot uses a deterministic orchestrator and returns factual answers backed by live service data.

---

## Quick start

### Prerequisites

- Node.js 22 or newer
- Python 3.11 or newer
- Bash on `PATH` for the Synapse scripts (Git Bash or WSL on Windows)
- Synapse API key only if you want to generate hosted MCP servers
- Optional LLM key if you want polished prose instead of deterministic answers

### Run locally

```bash
npm install
npm run dev
```

Open **http://localhost:3000**.

`npm install` installs workspace packages and prepares the Python service. `npm run dev` starts all three processes:

| Process | Address | Purpose |
| --- | --- | --- |
| NexusOps workspace | `http://localhost:3000` | User interface and API routes |
| Orders service | `http://localhost:4001` | Customers, orders, priority flags |
| Warehouse service | `http://localhost:4002` | Inventory, restock orders, support tickets |

Both SQLite databases are seeded automatically on first boot.

If port `3000` is occupied, run the frontend on another port:

```bash
npm --prefix frontend exec next dev -- -p 3100
```

### Useful commands

```bash
npm run typecheck
npm run lint
npm run build
npm run setup:synapse
npm run live:discover
```

---

## The application

NexusOps is organized around five simple screens instead of one dense dashboard.

| Screen | Purpose |
| --- | --- |
| **Home** | Today's priorities, quick actions, health at a glance, and a short explanation of how the assistant works |
| **Orders** | Order cards with plain-language delay, stock, and support status; advanced table available when needed |
| **Copilot** | Full conversational workspace with suggested questions, tool traces, and approval controls |
| **Data** | Connected systems, generated tool catalog, and raw SQLite inspector |
| **Discovery** | Guided walkthrough that adds the COD fraud-risk check without rewriting code |

Responsive behavior:

- Desktop: fixed sidebar, persistent Copilot panel on wide screens, dedicated Copilot workspace at `xl`.
- Tablet: top navigation with a Copilot button and drawer navigation.
- Mobile: bottom navigation with Home, Orders, and Ask, plus a slide-up Copilot sheet.
- Strict light mode, no dark theme, and no horizontal page overflow.

---

## Architecture

```mermaid
flowchart LR
  UI[Next.js workspace] --> API[/api/copilot]
  API --> A[Orders service<br/>TypeScript · :4001]
  API --> B[Warehouse service<br/>Python · :4002]
  A --> DB1[(orders.sqlite)]
  B --> DB2[(warehouse.sqlite)]
  API --> T[Traces + approval gate]
  T --> UI
```

| Component | Location | Stack | Datastore |
| --- | --- | --- | --- |
| Workspace | `frontend/` | Next.js 14, TypeScript, Tailwind, Framer Motion, Lucide | Reads APIs only |
| System A | `services/orders-service/` | TypeScript, Express, `better-sqlite3` | `data/orders.sqlite` |
| System B | `services/warehouse-support-service/` | Python, FastAPI, Pydantic v2 | `data/warehouse.sqlite` |
| MCP generation | `@2ndbrainlabs-ai/synapse-cli` | Auto builds, smart names, live discovery | Synapse account |

System A contains no Python or plain `.js` source files. System B contains no TypeScript source files. The services share no application code; the Next.js Copilot route joins them through HTTP.

### Seeded data

System A starts with 15 customers (`CUST-101`–`CUST-115`) and 18 orders (`ORD-5001`–`ORD-5018`).

System B starts with 10 inventory rows and 9 support tickets. The data is deterministic so every fresh boot produces the same demo.

| Metric | Fresh-boot value |
| --- | ---: |
| Delayed VIP orders | 6 |
| Low-stock SKUs | 4 |
| SLA-critical tickets | 2 |
| Revenue at risk | `$2,866` |
| Joined table rows | 18 |

---

## Guided demo

### 1. See the urgent work

Open **Home** and review *Needs your attention*. Select **Investigate** on any order to jump into the Copilot with that order as context.

### 2. Ask one cross-system question

Use this prompt:

> Which VIP customers have delayed orders, what is the warehouse bottleneck, and have they filed a support ticket?

The answer joins three tool calls: delayed orders, low stock, and open tickets. Expand each trace to see the exact endpoint, latency, request, and response.

| Workflow | Prompt | Tools joined |
| --- | --- | --- |
| `vip-bottleneck-join` | Which VIP customers have delayed orders, what is the warehouse bottleneck, and have they filed a support ticket? | Delayed orders, profiles, low stock, tickets |
| `remediation-safety-gate` | Draft a restock PO for the SKUs blocking VIP orders and escalate their support tickets — ask my confirmation first. | Low stock, SKU lookup, open tickets |
| `priority-flag-safety-gate` | Set the priority flag for ORD-5001 and expedite dispatch. | Delayed orders, priority flag |
| `cod-fraud-risk-join` | Run the COD fraud-risk check on the newly discovered tool. | COD risk, profiles, tickets |

### 3. Approve a safe change

Ask for a remediation plan. The Copilot returns a review card with target records and before/after impact. Nothing is written until **Approve** is selected. Approval tokens expire after 10 minutes and can only target a small allowlist of endpoints.

### 4. Add a new capability

Open **Discovery**, select **Add the new check**, then ask the COD fraud-risk prompt in Copilot. The orders tool count changes from 4 to 5 and the new trace appears immediately.

---

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

Or run the repository script:

```bash
export SYNAPSE_API_KEY=your-key
npm run setup:synapse
```

Health and raw database routes are deliberately excluded from tool generation. Handler JSDoc and Python docstrings provide Synapse metadata, while OpenAPI annotations document public contracts.

<details>
<summary>MCP client configuration example</summary>

`synapse build` prints one server id per project and stores it in that service's `.synapse/config.json`. Copy the printed ids into your MCP client config.

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

Claude Desktop uses `%APPDATA%\Claude\claude_desktop_config.json` on Windows and `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS. Cursor uses `~/.cursor/mcp.json` or `.cursor/mcp.json`. Restart the client after editing its config.

</details>

---

## Live discovery

The dormant route is `GET /api/orders/cod-fraud-risk`. Its handler is wrapped by `/* LIVE_DISCOVER_START` and `LIVE_DISCOVER_END */`, and its registration lines in `services/orders-service/src/index.ts` are commented with the exact marker `// UNCOMMENT FOR LIVE SYNAPSE --DISCOVER DEMO`.

Run the CLI demo from Bash:

```bash
npm run live:discover
```

Or use the in-app Discovery screen. It calls:

```http
POST /api/live-discover
Content-Type: application/json

{"action":"activate"}
```

Activation removes the markers, uncomments the registration lines, waits for `tsx watch` to restart System A, registers `getCodFraudRisk`, and raises the orders tool count from 4 to 5. Deactivation restores the exact dormant source state.

Manual incremental rescan:

```bash
cd services/orders-service
synapse build --discover --smart-names
```

To make the in-app panel execute the hosted CLI too:

```bash
NEXUSOPS_RUN_SYNAPSE_CLI=true npm run dev
```

---

## Environment variables

| Variable | Used by | Purpose |
| --- | --- | --- |
| `ORDERS_SERVICE_URL` | Frontend | Overrides `http://127.0.0.1:4001` |
| `WAREHOUSE_SERVICE_URL` | Frontend | Overrides `http://127.0.0.1:4002` |
| `ORDERS_DB_PATH` | System A | Overrides the orders SQLite path |
| `WAREHOUSE_DB_PATH` | System B | Overrides the warehouse SQLite path |
| `NEXUSOPS_APP_SECRET` | Copilot | Signs approval tokens; set a stable value outside local demos |
| `LLM_PROVIDER` | Copilot | `openai` or `anthropic` |
| `LLM_API_KEY` / `OPENAI_API_KEY` | Copilot | Enables OpenAI-compatible synthesis |
| `ANTHROPIC_API_KEY` | Copilot | Enables Anthropic synthesis |
| `LLM_BASE_URL` / `OPENAI_BASE_URL` | Copilot | Overrides the OpenAI-compatible base URL |
| `LLM_MODEL` | Copilot | Overrides the default model |
| `NEXUSOPS_RUN_SYNAPSE_CLI` | Discovery API | Executes the hosted Synapse CLI from the in-app panel |
| `SYNAPSE_API_KEY` | Synapse CLI | Hosted MCP generation auth |

---

## API reference

<details>
<summary>System A · orders service</summary>

- `GET /api/health`
- `GET /api/orders`
- `GET /api/orders/delayed`
- `GET /api/customers/:customerId/profile`
- `POST /api/orders/:orderId/priority-flag`
- `GET /api/database`
- `GET /api/orders/cod-fraud-risk` after discovery

</details>

<details>
<summary>System B · warehouse service</summary>

- `GET /api/health`
- `GET /api/inventory/low-stock`
- `GET /api/inventory/sku/:sku`
- `POST /api/inventory/restock-order`
- `GET /api/tickets/open`
- `POST /api/tickets/:ticket_id/escalate`
- `GET /api/database`

</details>

<details>
<summary>Next.js workspace</summary>

- `GET /api/status`
- `GET /api/overview`
- `POST /api/copilot`
- `GET /api/live-discover`
- `POST /api/live-discover`

</details>

---

## Verification

```bash
npm run typecheck
npm run lint
npm run build
python -m compileall -q services/warehouse-support-service/app
```

Expected health checks:

```bash
curl http://127.0.0.1:4001/api/health
curl http://127.0.0.1:4002/api/health
curl http://127.0.0.1:3000/api/status
curl http://127.0.0.1:3000/api/overview
```

A healthy status response shows both services online with 4 orders checks and 5 warehouse checks. After discovery, the orders count becomes 5.

---

## Troubleshooting

| Symptom | Resolution |
| --- | --- |
| `EADDRINUSE` on port `3000` | Stop the conflicting process or run the frontend on another port. |
| `better-sqlite3` native build failure | Use Node 22+ and reinstall. Version 13 ships prebuilt binaries for current Node releases. |
| `Not Initialized` from Synapse | Run `synapse init` inside the service directory, or `npm run setup:synapse` with `SYNAPSE_API_KEY` set. |
| Copilot answers are deterministic | This is the offline fallback. Add an LLM key for polished prose; tool results remain authoritative. |
| Fraud endpoint returns `404` | It is dormant by design until Live Discovery activation uncomments the route and registration lines. |
| Discovery deactivation breaks System A | Keep `export default router;` outside `LIVE_DISCOVER_END */`; the app repairs this automatically. |

---

## Three-act presentation script

1. **One question, two systems.** Open Home and ask the VIP bottleneck prompt. Show the three trace cards, KPI ribbon, and joined table.
2. **Reasoning with a safety gate.** Ask for a remediation plan. Show that no write happens yet, inspect the plan, then approve and refresh the SQLite inspector.
3. **Live capability addition.** Open Discovery, activate the hidden COD check, show the tool count change, ask the fraud-risk prompt, then reset to the dormant state.
