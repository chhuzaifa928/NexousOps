"""FastAPI entry point for the NexusOps Warehouse & Support Service.

The module builds an ASGI app consumed by the NexusOps root package via
``uvicorn services.warehouse-support-service.app.main:app``. Warehouse data is
initialized on startup, and two internal endpoints (health and the raw database
snapshot) are tagged ``synapse-excluded`` so they are not published as Synapse
tools.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import get_database_snapshot, get_seed_counts, initialize_database
from app.models import DatabaseSnapshot, HealthResponse
from app.routers import inventory, tickets

DESCRIPTION = """
Warehouse and customer-support operations API for **NexusOps**.

This service gives operations users a live view of warehouse stock health and
the support queue so that fulfillment exceptions can be resolved quickly:

* **Inventory intelligence** - identify SKUs whose *net available* stock
  (`physical_stock - reserved_units`) is at or below the reorder threshold,
  inspect per-SKU positions, and register supplier restock orders with
  generated PO numbers and lead-time based ETAs.
* **Support triage** - read Open and Escalated tickets ordered by remaining SLA
  (soonest first), flag sub-30-minute SLAs as critical, and escalate a ticket to
  Critical priority with an appended audit note.
* **Operational transparency** - a health probe and a raw SQLite snapshot for
  the UI database inspector. These two endpoints are marked
  `synapse-excluded` and are not exposed as generated agent tools.

All data is persisted in `data/warehouse.sqlite`, deterministically seeded with
10 inventory records and 9 support tickets on every startup. Set the
`WAREHOUSE_DB_PATH` environment variable to use a different database file.
"""

TAGS_METADATA = [
    {
        "name": "inventory",
        "description": "Warehouse stock positions, reorder alerts and supplier restock orders.",
    },
    {
        "name": "stock-intelligence",
        "description": "Derived net availability, deficit calculations and stockout detection.",
    },
    {
        "name": "restock",
        "description": "Creation of purchase orders that increment pending restock quantities.",
    },
    {
        "name": "tickets",
        "description": "Customer support ticket queue and escalation workflow.",
    },
    {
        "name": "sla-queue",
        "description": "SLA-prioritized views of active support cases.",
    },
    {
        "name": "escalation",
        "description": "Transitions that raise a case to Critical priority with audit notes.",
    },
    {
        "name": "system",
        "description": "Internal service health and database inspection endpoints.",
    },
    {
        "name": "synapse-excluded",
        "description": "Internal-only endpoints that must not become Synapse agent tools.",
    },
]

initialize_database()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Initialize the SQLite schema and deterministic seed data on startup."""
    initialize_database()
    yield


app = FastAPI(
    title="NexusOps Warehouse & Support Service",
    version="1.0.0",
    description=DESCRIPTION,
    openapi_tags=TAGS_METADATA,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inventory.router)
app.include_router(tickets.router)


@app.get(
    "/api/health",
    response_model=HealthResponse,
    summary="Internal service health probe",
    description=(
        "Reports that the service is live, the SQLite database is reachable and "
        "the seeded row counts are available. Internal-only: excluded from "
        "Synapse tool generation via the synapse-excluded tag."
    ),
    tags=["system", "synapse-excluded"],
    responses={
        200: {"description": "Service healthy, database connected and seed counts reported."}
    },
)
def health() -> dict[str, Any]:
    """Return an internal readiness snapshot for monitoring.

    This endpoint is deliberately tagged ``synapse-excluded`` and is not meant
    to be surfaced as a tool by Synapse; it exists for uptime checks only.

    Returns:
        dict: ``status``, ``service``, ``database``, seeded row counts for both
        tables, and a UTC ISO-8601 ``timestamp``.
    """
    return {
        "status": "ok",
        "service": "warehouse-support-service",
        "database": "connected",
        "seeded": get_seed_counts(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get(
    "/api/database",
    response_model=DatabaseSnapshot,
    summary="Internal raw SQLite database snapshot",
    description=(
        "Returns every raw row of the inventory and support_tickets tables for "
        "the operations UI database inspector. Internal-only: excluded from "
        "Synapse tool generation via the synapse-excluded tag."
    ),
    tags=["system", "synapse-excluded"],
    responses={200: {"description": "Raw SQLite table rows grouped by table name."}},
)
def database_snapshot() -> dict[str, Any]:
    """Expose the raw warehouse database contents to the UI inspector.

    Rows are returned exactly as stored in SQLite (no derived stock math or SLA
    flags) so the inspector can display the source of truth. This endpoint is
    tagged ``synapse-excluded`` and must not become a Synapse agent tool.

    Returns:
        dict: ``{"database": "warehouse.sqlite", "tables": {...}}`` with an
        ``inventory`` list and a ``support_tickets`` list of raw row dicts.
    """
    return get_database_snapshot()
