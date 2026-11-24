"""Pydantic v2 request and response schemas for the warehouse/support APIs.

The schemas double as the OpenAPI contract used by ``synapse build --auto
--smart-names``: every model carries a docstring, field descriptions, validation
constraints, and examples so generated tool signatures are self-describing.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class InventoryItem(BaseModel):
    """A single raw inventory record as persisted in ``warehouse.sqlite``."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "sku": "SKU-JKT-01",
                "item_name": "Alpine Tech Jacket",
                "warehouse_zone": "Zone-A",
                "physical_stock": 2,
                "reserved_units": 5,
                "reorder_threshold": 4,
                "supplier_name": "Nordic Outerwear Co.",
                "lead_time_days": 18,
                "pending_restock_qty": 0,
            }
        }
    )

    sku: str = Field(..., min_length=1, description="Unique stock keeping unit identifier.")
    item_name: str = Field(..., min_length=1, description="Human-readable product name.")
    warehouse_zone: str = Field(..., min_length=1, description="Fulfilment zone holding the item.")
    physical_stock: int = Field(..., ge=0, description="Units physically present in the zone.")
    reserved_units: int = Field(..., ge=0, description="Units already committed to orders.")
    reorder_threshold: int = Field(..., ge=0, description="Net availability that triggers a reorder.")
    supplier_name: str = Field(..., min_length=1, description="Primary supplier for replenishment.")
    lead_time_days: int = Field(..., ge=0, description="Supplier lead time in calendar days.")
    pending_restock_qty: int = Field(
        default=0, ge=0, description="Units already requested on outstanding restock orders."
    )


class LowStockItem(InventoryItem):
    """Inventory item with derived availability, deficit and stockout fields."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "sku": "SKU-JKT-01",
                "item_name": "Alpine Tech Jacket",
                "warehouse_zone": "Zone-A",
                "physical_stock": 2,
                "reserved_units": 5,
                "net_available": -3,
                "reorder_threshold": 4,
                "deficit_quantity": 7,
                "supplier_name": "Nordic Outerwear Co.",
                "lead_time_days": 18,
                "pending_restock_qty": 0,
                "is_stockout": True,
            }
        }
    )

    net_available: int = Field(
        ..., description="physical_stock minus reserved_units; may be negative."
    )
    deficit_quantity: int = Field(
        ..., ge=0, description="Units needed to reach the reorder threshold, or 0."
    )
    is_stockout: bool = Field(..., description="True when net available stock is zero or less.")


class SkuStockResponse(InventoryItem):
    """Detailed stock position for one SKU, including derived availability."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "sku": "SKU-HOD-02",
                "item_name": "Merino Travel Hoodie",
                "warehouse_zone": "Zone-B",
                "physical_stock": 24,
                "reserved_units": 6,
                "net_available": 18,
                "reorder_threshold": 8,
                "deficit_quantity": 0,
                "supplier_name": "Alpine Textiles",
                "lead_time_days": 9,
                "pending_restock_qty": 0,
                "is_stockout": False,
            }
        }
    )

    net_available: int = Field(..., description="Uncommitted units available for new orders.")
    deficit_quantity: int = Field(..., ge=0, description="Shortfall against the reorder threshold.")
    is_stockout: bool = Field(..., description="True when no uncommitted stock remains.")


class RestockOrderRequest(BaseModel):
    """Payload used to register a supplier restock order for a SKU."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "sku": "SKU-JKT-01",
                "quantity": 25,
                "supplier_name": "Nordic Outerwear Co.",
                "reason": "VIP shipment delay recovery",
                "requested_by": "ops-dashboard",
            }
        }
    )

    sku: str = Field(..., min_length=1, description="SKU to replenish; must exist in inventory.")
    quantity: int = Field(..., gt=0, le=100000, description="Positive number of units to order.")
    supplier_name: str | None = Field(
        default=None, description="Optional supplier override for this order."
    )
    reason: str | None = Field(default=None, max_length=500, description="Optional business reason.")
    requested_by: str | None = Field(
        default=None, max_length=120, description="Optional operator or system identifier."
    )


class RestockOrderResponse(BaseModel):
    """Confirmation of a registered restock order, with before/after counters."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "po_number": "PO-SKU-JKT-01-20261123101530000000",
                "sku": "SKU-JKT-01",
                "item_name": "Alpine Tech Jacket",
                "warehouse_zone": "Zone-A",
                "quantity": 25,
                "supplier_name": "Nordic Outerwear Co.",
                "before_pending_restock_qty": 0,
                "after_pending_restock_qty": 25,
                "eta_date": "2026-12-11",
                "reason": "VIP shipment delay recovery",
                "requested_by": "ops-dashboard",
            }
        }
    )

    po_number: str = Field(..., description="Generated PO-<SKU>-<timestamp> order reference.")
    sku: str = Field(..., description="Replenished SKU.")
    item_name: str = Field(..., description="Product name at order time.")
    warehouse_zone: str = Field(..., description="Destination zone for the replenishment.")
    quantity: int = Field(..., gt=0, description="Units ordered from the supplier.")
    supplier_name: str = Field(..., description="Supplier responsible for fulfilment.")
    before_pending_restock_qty: int = Field(..., ge=0, description="Pending units before this order.")
    after_pending_restock_qty: int = Field(..., ge=0, description="Pending units after this order.")
    eta_date: str = Field(..., description="ISO date (YYYY-MM-DD) estimated from lead time.")
    reason: str | None = Field(default=None, description="Reason supplied by the caller.")
    requested_by: str | None = Field(default=None, description="Caller that requested the order.")


class SupportTicket(BaseModel):
    """A customer support ticket with sentiment, priority and SLA metadata."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "ticket_id": "TKT-891",
                "customer_id": "CUST-101",
                "order_id": "ORD-5001",
                "subject": "VIP jacket shipment delayed 52 hours",
                "category": "Delivery Delay",
                "priority": "Critical",
                "sentiment_score": -0.88,
                "status": "Open",
                "sla_minutes_remaining": 25,
                "agent_notes": "Warehouse deficit requires immediate restock and courier escalation.",
                "is_sla_critical": True,
            }
        }
    )

    ticket_id: str = Field(..., min_length=1, description="Unique ticket identifier.")
    customer_id: str = Field(..., min_length=1, description="Customer that raised the ticket.")
    order_id: str = Field(..., min_length=1, description="Related commerce order identifier.")
    subject: str = Field(..., min_length=1, description="Short ticket subject line.")
    category: Literal["Delivery Delay", "Stock Shortage", "Billing/COD", "Damaged Item"] = Field(
        ..., description="Support category constrained by the database CHECK."
    )
    priority: Literal["Critical", "High", "Medium", "Low"] = Field(
        ..., description="Business priority of the ticket."
    )
    sentiment_score: float = Field(
        ..., ge=-1.0, le=1.0, description="Customer sentiment from -1.0 (negative) to 1.0."
    )
    status: Literal["Open", "Escalated", "Resolved"] = Field(..., description="Current lifecycle state.")
    sla_minutes_remaining: int = Field(..., ge=0, description="Minutes left before SLA breach.")
    agent_notes: str | None = Field(default=None, description="Free-text agent case notes.")
    is_sla_critical: bool = Field(..., description="True when 30 minutes or less remain on the SLA.")


class TicketListResponse(BaseModel):
    """Envelope for the open-ticket queue returned by ``GET /api/tickets/open``."""

    tickets: list[SupportTicket] = Field(..., description="Open/escalated tickets, SLA ascending.")
    count: int = Field(..., ge=0, description="Number of tickets in this response.")


class EscalateTicketRequest(BaseModel):
    """Optional payload for escalating a ticket to Critical priority."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "notes": "Courier confirmed miss; escalating to duty manager.",
                "escalated_by": "ops-dashboard",
            }
        }
    )

    notes: str | None = Field(
        default=None, max_length=2000, description="Additional note to append to agent_notes."
    )
    escalated_by: str | None = Field(
        default=None, max_length=120, description="Operator or system performing the escalation."
    )


class EscalateTicketResponse(SupportTicket):
    """Escalated ticket record plus the transition details for auditability."""

    before_status: str = Field(..., description="Status recorded before the escalation.")
    after_status: Literal["Escalated"] = Field(..., description="Status recorded after the escalation.")
    appended_notes: str = Field(..., description="Exact text appended to agent_notes.")


class SeedCounts(BaseModel):
    """Row counts of the seeded warehouse tables."""

    inventory: int = Field(..., ge=0, description="Rows present in the inventory table.")
    support_tickets: int = Field(..., ge=0, description="Rows present in the support_tickets table.")


class HealthResponse(BaseModel):
    """Liveness payload confirming the service and its database are ready."""

    status: Literal["ok"] = Field(default="ok", description="Service health status.")
    service: Literal["warehouse-support-service"] = Field(
        default="warehouse-support-service", description="Logical service name."
    )
    database: Literal["connected"] = Field(default="connected", description="Database connectivity.")
    seeded: SeedCounts = Field(..., description="Current seeded row counts per table.")
    timestamp: str = Field(..., description="UTC ISO-8601 timestamp of the health check.")


class DatabaseTables(BaseModel):
    """Raw table contents exposed to the operations UI database inspector."""

    inventory: list[dict[str, Any]] = Field(..., description="All persisted inventory rows.")
    support_tickets: list[dict[str, Any]] = Field(..., description="All persisted support ticket rows.")


class DatabaseSnapshot(BaseModel):
    """Envelope for ``GET /api/database`` containing raw SQLite table rows."""

    database: Literal["warehouse.sqlite"] = Field(
        default="warehouse.sqlite", description="Name of the inspected SQLite file."
    )
    tables: DatabaseTables = Field(..., description="Raw rows grouped by table name.")


class LowStockListResponse(BaseModel):
    """Envelope for ``GET /api/inventory/low-stock`` with an item count."""

    items: list[LowStockItem] = Field(..., description="Inventory at or below reorder threshold.")
    count: int = Field(..., ge=0, description="Number of low-stock items returned.")


class SkuStockLookupResponse(BaseModel):
    """Envelope for ``GET /api/inventory/sku/{sku}``."""

    item: SkuStockResponse = Field(..., description="Detailed stock record for the requested SKU.")


class RestockOrderEnvelope(BaseModel):
    """Envelope for ``POST /api/inventory/restock-order``."""

    order: RestockOrderResponse = Field(..., description="The registered purchase order details.")
    message: str = Field(..., description="Human-readable confirmation for UI toasts.")


class EscalateTicketEnvelope(BaseModel):
    """Envelope for ``POST /api/tickets/{ticket_id}/escalate``."""

    ticket: EscalateTicketResponse = Field(..., description="The updated, escalated ticket.")
    message: str = Field(..., description="Human-readable confirmation for UI toasts.")
