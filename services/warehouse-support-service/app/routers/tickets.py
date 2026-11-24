"""Customer support ticket endpoints for the NexusOps operations console.

Routes in this module surface the priority SLA queue and allow an operator to
escalate a ticket to Critical priority. Docstrings and response descriptions
are intentionally detailed because they become the Synapse tool descriptions
when running ``synapse build --auto --smart-names``.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, status

from app.database import escalate_ticket, get_open_tickets
from app.models import EscalateTicketEnvelope, EscalateTicketRequest, TicketListResponse

router = APIRouter(prefix="/api/tickets", tags=["tickets"])


@router.get(
    "/open",
    response_model=TicketListResponse,
    summary="List open and escalated support tickets",
    description=(
        "Returns tickets whose status is Open or Escalated, ordered by "
        "sla_minutes_remaining ascending so the most urgent case appears first. "
        "Resolved tickets are excluded. Each ticket includes an is_sla_critical "
        "flag that is true when 30 minutes or less remain."
    ),
    tags=["tickets", "sla-queue"],
    responses={
        status.HTTP_200_OK: {
            "description": "Active ticket queue sorted by remaining SLA with criticality flags."
        }
    },
)
def list_open_tickets() -> dict[str, Any]:
    """List the active customer support queue ordered by SLA urgency.

    Only tickets with status ``Open`` or ``Escalated`` are included; ``Resolved``
    tickets are filtered out. Sorting is by ``sla_minutes_remaining`` ascending
    (soonest breach first), with ``ticket_id`` as a deterministic tie-breaker.
    The derived ``is_sla_critical`` flag is true when SLA time is <= 30 minutes.

    Returns:
        dict: ``{"tickets": SupportTicket[], "count": int}``. Every ticket carries
        customer/order identifiers, subject, category, priority, sentiment score,
        status, remaining SLA, agent notes and the SLA criticality flag.

    Raises:
        Nothing; an empty queue is a valid successful response.
    """
    tickets = get_open_tickets()
    return {"tickets": tickets, "count": len(tickets)}


@router.post(
    "/{ticket_id}/escalate",
    response_model=EscalateTicketEnvelope,
    summary="Escalate a support ticket to Critical",
    description=(
        "Marks a ticket as Escalated, forces its priority to Critical and appends "
        "an audit note to agent_notes. The JSON body is optional: provide notes "
        "to describe the escalation and escalated_by to identify the operator."
    ),
    tags=["tickets", "escalation"],
    responses={
        status.HTTP_200_OK: {
            "description": "Ticket escalated; before/after status and appended note returned."
        },
        status.HTTP_404_NOT_FOUND: {"description": "The requested ticket does not exist."},
        422: {"description": "Validation failed for the optional escalation body."},
    },
)
def escalate_support_ticket(
    ticket_id: str,
    payload: EscalateTicketRequest | None = None,
) -> dict[str, Any]:
    """Escalate a ticket to Critical priority and append a note for audit.

    Args:
        ticket_id: Exact ticket identifier from the path, for example ``TKT-891``.
        payload: Optional JSON body. ``notes`` is appended to the existing
            ``agent_notes`` (a default escalation note is used when omitted) and
            ``escalated_by`` is added as an attribution suffix. An entirely
            missing body is accepted.

    Returns:
        dict: ``{"ticket": EscalateTicketResponse, "message": str}`` where the
        ticket reflects status ``Escalated``, priority ``Critical``, and includes
        ``before_status``, ``after_status`` and the exact ``appended_notes`` text.

    Raises:
        HTTPException: 404 when no ticket matches the supplied ``ticket_id``.
        Previously resolved tickets can still be explicitly escalated.
    """
    updated = escalate_ticket(
        ticket_id=ticket_id,
        notes=payload.notes if payload else None,
        escalated_by=payload.escalated_by if payload else None,
    )
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket '{ticket_id}' was not found.",
        )
    return {
        "ticket": updated,
        "message": f"Ticket {ticket_id} escalated to Critical priority.",
    }
