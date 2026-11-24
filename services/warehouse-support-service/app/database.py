"""SQLite persistence layer for the NexusOps Warehouse & Support Service.

The database is a real on-disk SQLite file (``data/warehouse.sqlite``) so the
operations UI can inspect it directly. Every helper opens a short-lived
connection through :func:`get_connection` and uses context managers for both
connection cleanup and transaction handling.

Set the ``WAREHOUSE_DB_PATH`` environment variable to point at a different
file, which is particularly useful for isolated test runs.
"""

from __future__ import annotations

import os
import sqlite3
import tempfile
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterator

DEFAULT_DB_PATH = (
    Path(tempfile.gettempdir()) / "nexusops-warehouse.sqlite"
    if os.environ.get("VERCEL") == "1"
    else Path(__file__).resolve().parent.parent / "data" / "warehouse.sqlite"
)

INVENTORY_COLUMNS = (
    "sku",
    "item_name",
    "warehouse_zone",
    "physical_stock",
    "reserved_units",
    "reorder_threshold",
    "supplier_name",
    "lead_time_days",
    "pending_restock_qty",
)

TICKET_COLUMNS = (
    "ticket_id",
    "customer_id",
    "order_id",
    "subject",
    "category",
    "priority",
    "sentiment_score",
    "status",
    "sla_minutes_remaining",
    "agent_notes",
)

SEED_INVENTORY: tuple[tuple[Any, ...], ...] = (
    ("SKU-JKT-01", "Alpine Tech Jacket", "Zone-A", 2, 5, 4, "Nordic Outerwear Co.", 18, 0),
    ("SKU-SNK-04", "Carbon Runner Pro", "Zone-C", 1, 4, 3, "Velocity Footwear", 12, 0),
    ("SKU-HOD-02", "Merino Travel Hoodie", "Zone-B", 24, 6, 8, "Alpine Textiles", 9, 0),
    ("SKU-BAG-07", "Tactical Laptop Backpack", "Zone-A", 3, 5, 4, "Apex Luggage Works", 14, 0),
    ("SKU-WTC-03", "Precision Mechanical Watch", "Zone-D", 18, 3, 5, "Chrono Supply", 21, 0),
    ("SKU-HDP-09", "Studio Headphones", "Zone-B", 2, 4, 3, "Sonora Components", 16, 0),
    ("SKU-CAM-05", "Compact Action Camera", "Zone-C", 11, 2, 4, "OpticCore Ltd.", 11, 0),
    ("SKU-SHT-06", "Thermal Base Layer", "Zone-B", 30, 8, 10, "Alpine Textiles", 7, 0),
    ("SKU-BTL-10", "Insulated Trail Bottle", "Zone-D", 42, 5, 12, "HydroGear Supply", 6, 0),
    ("SKU-GLV-11", "All-Weather Cycling Gloves", "Zone-C", 16, 4, 6, "Velocity Footwear", 8, 0),
)

SEED_TICKETS: tuple[tuple[Any, ...], ...] = (
    (
        "TKT-891", "CUST-101", "ORD-5001", "VIP jacket shipment delayed 52 hours",
        "Delivery Delay", "Critical", -0.88, "Open", 25,
        "Warehouse deficit requires immediate restock and courier escalation.",
    ),
    (
        "TKT-892", "CUST-102", "ORD-5002", "Carbon Runner Pro dispatch bottleneck",
        "Delivery Delay", "High", -0.74, "Open", 45,
        "Reserved stock exceeds physical count.",
    ),
    (
        "TKT-893", "CUST-105", "ORD-5006", "COD verification pending on high-value order",
        "Billing/COD", "High", -0.61, "Open", 90,
        "Customer has elevated COD rejection history.",
    ),
    (
        "TKT-894", "CUST-104", "ORD-5004", "Damaged packaging on delivery",
        "Damaged Item", "Medium", -0.35, "Resolved", 0,
        "Replacement already dispatched.",
    ),
    (
        "TKT-895", "CUST-107", "ORD-5009", "Billing dispute blocking delayed order",
        "Billing/COD", "Critical", -0.81, "Open", 18,
        "Finance review overdue; VIP exposure under review.",
    ),
    (
        "TKT-896", "CUST-108", "ORD-5007", "Camera units unavailable for VIP order",
        "Stock Shortage", "High", -0.66, "Open", 120,
        "Awaiting supplier confirmation.",
    ),
    (
        "TKT-897", "CUST-111", "ORD-5010", "Priority courier not assigned",
        "Delivery Delay", "High", -0.58, "Open", 75,
        "Pick backlog unresolved.",
    ),
    (
        "TKT-898", "CUST-101", "ORD-5018", "Second VIP shipment delayed",
        "Delivery Delay", "Medium", -0.44, "Open", 180,
        "Monitor with primary VIP case.",
    ),
    (
        "TKT-899", "CUST-114", "ORD-5013", "COD charge clarification",
        "Billing/COD", "Medium", -0.21, "Open", 240,
        "Awaiting billing policy confirmation.",
    ),
)

CREATE_INVENTORY_TABLE = """
CREATE TABLE IF NOT EXISTS inventory (
    sku TEXT PRIMARY KEY,
    item_name TEXT NOT NULL,
    warehouse_zone TEXT NOT NULL,
    physical_stock INTEGER NOT NULL,
    reserved_units INTEGER NOT NULL,
    reorder_threshold INTEGER NOT NULL,
    supplier_name TEXT NOT NULL,
    lead_time_days INTEGER NOT NULL,
    pending_restock_qty INTEGER NOT NULL DEFAULT 0
)
"""

CREATE_TICKETS_TABLE = """
CREATE TABLE IF NOT EXISTS support_tickets (
    ticket_id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    category TEXT CHECK (category IN ('Delivery Delay', 'Stock Shortage', 'Billing/COD', 'Damaged Item')),
    priority TEXT CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')),
    sentiment_score REAL,
    status TEXT CHECK (status IN ('Open', 'Escalated', 'Resolved')),
    sla_minutes_remaining INTEGER,
    agent_notes TEXT
)
"""


def get_database_path() -> Path:
    """Return the configured SQLite file path, honouring ``WAREHOUSE_DB_PATH``."""
    override = os.environ.get("WAREHOUSE_DB_PATH")
    return Path(override) if override else DEFAULT_DB_PATH


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    """Yield a row-factory enabled connection and always close it afterwards."""
    path = get_database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
    finally:
        connection.close()


def initialize_database() -> None:
    """Create the warehouse schema and deterministically seed both tables."""
    with get_connection() as connection:
        with connection:
            connection.execute(CREATE_INVENTORY_TABLE)
            connection.execute(CREATE_TICKETS_TABLE)
            inventory_placeholders = ", ".join("?" for _ in INVENTORY_COLUMNS)
            ticket_placeholders = ", ".join("?" for _ in TICKET_COLUMNS)
            connection.executemany(
                f"INSERT OR REPLACE INTO inventory ({', '.join(INVENTORY_COLUMNS)}) "
                f"VALUES ({inventory_placeholders})",
                SEED_INVENTORY,
            )
            connection.executemany(
                f"INSERT OR REPLACE INTO support_tickets ({', '.join(TICKET_COLUMNS)}) "
                f"VALUES ({ticket_placeholders})",
                SEED_TICKETS,
            )


def _with_stock_math(row: sqlite3.Row) -> dict[str, Any]:
    """Convert an inventory row into an API-ready record with derived fields."""
    item = dict(row)
    net_available = int(item["physical_stock"]) - int(item["reserved_units"])
    item["net_available"] = net_available
    item["deficit_quantity"] = max(int(item["reorder_threshold"]) - net_available, 0)
    item["is_stockout"] = net_available <= 0
    return item


def _with_sla_flag(row: sqlite3.Row) -> dict[str, Any]:
    """Convert a ticket row into an API-ready record with the SLA flag."""
    ticket = dict(row)
    ticket["is_sla_critical"] = int(ticket["sla_minutes_remaining"]) <= 30
    return ticket


def get_low_stock_items() -> list[dict[str, Any]]:
    """Return items whose net available stock is at or below reorder threshold."""
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM inventory "
            "WHERE (physical_stock - reserved_units) <= reorder_threshold "
            "ORDER BY (reorder_threshold - (physical_stock - reserved_units)) DESC, sku ASC"
        ).fetchall()
    return [_with_stock_math(row) for row in rows]


def get_inventory_item_by_sku(sku: str) -> dict[str, Any] | None:
    """Return one inventory item (with derived stock math) or ``None`` if absent."""
    with get_connection() as connection:
        row = connection.execute("SELECT * FROM inventory WHERE sku = ?", (sku,)).fetchone()
    return _with_stock_math(row) if row is not None else None


def create_restock_order(
    sku: str,
    quantity: int,
    supplier_name: str | None = None,
    reason: str | None = None,
    requested_by: str | None = None,
) -> dict[str, Any] | None:
    """Increment pending restock units for a SKU and describe the generated PO."""
    with get_connection() as connection:
        row = connection.execute("SELECT * FROM inventory WHERE sku = ?", (sku,)).fetchone()
        if row is None:
            return None
        item = dict(row)
        before_quantity = int(item["pending_restock_qty"])
        after_quantity = before_quantity + quantity
        with connection:
            connection.execute(
                "UPDATE inventory SET pending_restock_qty = ? WHERE sku = ?",
                (after_quantity, sku),
            )

    now = datetime.now(timezone.utc)
    eta_date = (now.date() + timedelta(days=int(item["lead_time_days"]))).isoformat()
    po_number = f"PO-{sku}-{now.strftime('%Y%m%d%H%M%S%f')}"
    return {
        "po_number": po_number,
        "sku": sku,
        "item_name": item["item_name"],
        "warehouse_zone": item["warehouse_zone"],
        "quantity": quantity,
        "supplier_name": supplier_name or item["supplier_name"],
        "before_pending_restock_qty": before_quantity,
        "after_pending_restock_qty": after_quantity,
        "eta_date": eta_date,
        "reason": reason,
        "requested_by": requested_by,
    }


def get_open_tickets() -> list[dict[str, Any]]:
    """Return Open and Escalated tickets sorted by remaining SLA (soonest first)."""
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM support_tickets WHERE status IN ('Open', 'Escalated') "
            "ORDER BY sla_minutes_remaining ASC, ticket_id ASC"
        ).fetchall()
    return [_with_sla_flag(row) for row in rows]


def escalate_ticket(
    ticket_id: str,
    notes: str | None = None,
    escalated_by: str | None = None,
) -> dict[str, Any] | None:
    """Set a ticket to Escalated/Critical and append an escalation note."""
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM support_tickets WHERE ticket_id = ?", (ticket_id,)
        ).fetchone()
        if row is None:
            return None
        ticket = dict(row)
        before_status = ticket["status"]

        detail = (notes or "").strip() or "Escalated to Critical priority for immediate handling."
        actor = (escalated_by or "").strip()
        if actor:
            detail = f"{detail} (escalated by {actor})"

        previous_notes = ticket["agent_notes"] or ""
        updated_notes = f"{previous_notes}\n{detail}" if previous_notes else detail
        with connection:
            connection.execute(
                "UPDATE support_tickets "
                "SET status = 'Escalated', priority = 'Critical', agent_notes = ? "
                "WHERE ticket_id = ?",
                (updated_notes, ticket_id),
            )
        updated = connection.execute(
            "SELECT * FROM support_tickets WHERE ticket_id = ?", (ticket_id,)
        ).fetchone()

    result = _with_sla_flag(updated)
    result["before_status"] = before_status
    result["after_status"] = "Escalated"
    result["appended_notes"] = detail
    return result


def get_database_snapshot() -> dict[str, Any]:
    """Return raw rows from every table for the UI database inspector."""
    with get_connection() as connection:
        inventory_rows = [
            dict(row)
            for row in connection.execute("SELECT * FROM inventory ORDER BY sku ASC").fetchall()
        ]
        ticket_rows = [
            dict(row)
            for row in connection.execute(
                "SELECT * FROM support_tickets ORDER BY ticket_id ASC"
            ).fetchall()
        ]
    return {
        "database": "warehouse.sqlite",
        "tables": {"inventory": inventory_rows, "support_tickets": ticket_rows},
    }


def get_seed_counts() -> dict[str, int]:
    """Return the current row counts for both seeded tables."""
    with get_connection() as connection:
        return {
            "inventory": connection.execute("SELECT COUNT(*) FROM inventory").fetchone()[0],
            "support_tickets": connection.execute(
                "SELECT COUNT(*) FROM support_tickets"
            ).fetchone()[0],
        }
