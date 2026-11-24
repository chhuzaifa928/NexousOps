"""Inventory intelligence endpoints for the NexusOps operations console.

Routes in this module expose reorder alerts, per-SKU stock positions and the
registration of supplier restock orders. Docstrings and response descriptions
are intentionally detailed because they become the Synapse tool descriptions
when running ``synapse build --auto --smart-names``.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, status

from app.database import create_restock_order, get_inventory_item_by_sku, get_low_stock_items
from app.models import (
    LowStockListResponse,
    RestockOrderEnvelope,
    RestockOrderRequest,
    SkuStockLookupResponse,
)

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


@router.get(
    "/low-stock",
    response_model=LowStockListResponse,
    summary="List low-stock inventory with deficits",
    description=(
        "Returns every SKU whose net available stock (physical_stock minus reserved_units) "
        "is at or below its reorder_threshold. Each item includes the calculated "
        "deficit_quantity needed to recover to the threshold and an is_stockout flag. "
        "Items with the largest deficits are listed first."
    ),
    tags=["inventory", "stock-intelligence"],
    responses={
        status.HTTP_200_OK: {
            "description": "Low-stock snapshot with derived net availability, deficit and stockout fields."
        }
    },
)
def list_low_stock() -> dict[str, Any]:
    """List inventory that needs replenishment attention.

    Net available stock is computed as ``physical_stock - reserved_units``; an
    item is considered low when that net value is less than or equal to its
    ``reorder_threshold``. The response also reports ``deficit_quantity`` as
    ``max(reorder_threshold - net_available, 0)`` so negative availability is
    fully accounted for, and ``is_stockout`` when net availability is <= 0.

    Returns:
        dict: ``{"items": LowStockItem[], "count": int}`` sorted by descending
        deficit, then SKU. An empty list is returned when stock levels are healthy.

    Raises:
        Nothing; an empty snapshot is a valid successful response.
    """
    items = get_low_stock_items()
    return {"items": items, "count": len(items)}


@router.get(
    "/sku/{sku}",
    response_model=SkuStockLookupResponse,
    summary="Look up stock for one SKU",
    description=(
        "Fetch the full stock position for a single SKU including physical units, "
        "reserved units, net availability, reorder threshold, deficit quantity, "
        "supplier lead time and pending restock quantity."
    ),
    tags=["inventory", "stock-intelligence"],
    responses={
        status.HTTP_200_OK: {"description": "Detailed stock record for the requested SKU."},
        status.HTTP_404_NOT_FOUND: {"description": "The requested SKU does not exist in inventory."},
    },
)
def get_sku_stock(sku: str) -> dict[str, Any]:
    """Get the detailed stock position of a single warehouse SKU.

    Args:
        sku: Exact, case-sensitive stock keeping unit identifier, for example
            ``SKU-JKT-01``. This is the path parameter ``{sku}``.

    Returns:
        dict: ``{"item": SkuStockResponse}`` containing all stored inventory
        fields plus derived ``net_available``, ``deficit_quantity`` and
        ``is_stockout`` values.

    Raises:
        HTTPException: 404 when no inventory row matches the supplied SKU.
    """
    item = get_inventory_item_by_sku(sku)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SKU '{sku}' was not found in the warehouse inventory.",
        )
    return {"item": item}


@router.post(
    "/restock-order",
    response_model=RestockOrderEnvelope,
    summary="Register a supplier restock order",
    description=(
        "Creates a restock order for an existing SKU, increments its "
        "pending_restock_qty by the requested quantity and returns a generated "
        "PO number plus an ETA derived from the supplier lead time. Optional "
        "supplier, reason and requested_by values are echoed on the PO record."
    ),
    tags=["inventory", "restock"],
    responses={
        status.HTTP_200_OK: {
            "description": "Restock order registered; pending_restock_qty was incremented."
        },
        status.HTTP_404_NOT_FOUND: {"description": "The SKU to restock does not exist."},
        422: {
            "description": "Validation failed, for example quantity <= 0 or a missing SKU."
        },
    },
)
def place_restock_order(payload: RestockOrderRequest) -> dict[str, Any]:
    """Create a purchase order and increase a SKU's pending restock quantity.

    Args:
        payload: Validated JSON body with a required ``sku`` and positive integer
            ``quantity``. Optional ``supplier_name`` overrides the supplier shown
            on the PO; ``reason`` and ``requested_by`` are recorded for audit.

    Returns:
        dict: ``{"order": RestockOrderResponse, "message": str}``. The order
        reports before/after pending counters, the ``PO-<SKU>-<timestamp>``
        reference, and an ISO ``eta_date`` computed from the SKU lead time.

    Raises:
        HTTPException: 404 when the SKU is unknown. Pydantic/FastAPI automatically
        return 422 for malformed bodies or a non-positive quantity.
    """
    order = create_restock_order(
        sku=payload.sku,
        quantity=payload.quantity,
        supplier_name=payload.supplier_name,
        reason=payload.reason,
        requested_by=payload.requested_by,
    )
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cannot restock unknown SKU '{payload.sku}'.",
        )
    return {
        "order": order,
        "message": (
            f"Restock order {order['po_number']} registered for {order['sku']}; "
            f"{order['quantity']} units expected by {order['eta_date']}."
        ),
    }
