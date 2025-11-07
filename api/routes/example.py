"""Example API endpoints showcasing the documentation annotations."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..models import AgentResponse

router = APIRouter(prefix="/agents", tags=["Agents"])

# Simple in-memory data to keep the example self-contained.
_FAKE_AGENT_STORE: dict[int, dict[str, str | None]] = {
    1: {"name": "Support Bot", "description": "Handles common customer questions."},
    2: {"name": "Sales Assistant", "description": "Guides users through product selection."},
}


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: int) -> AgentResponse:
    """
    @api-tag Agents
    @api-name Retrieve Agent
    @api-input agent_id:int
    @api-output agent:AgentResponse
    """

    agent_payload = _FAKE_AGENT_STORE.get(agent_id)
    if not agent_payload:
        raise HTTPException(status_code=404, detail="Agent not found")

    return AgentResponse(agent_id=agent_id, **agent_payload)
