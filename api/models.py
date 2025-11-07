"""Shared Pydantic models used by the API layer."""
from __future__ import annotations

from pydantic import BaseModel


class ParameterDescriptor(BaseModel):
    """Describes the name and type of an API input or output."""

    name: str
    type: str


class ApiDocEntry(BaseModel):
    """Standardised structure for API documentation extracted from docstrings."""

    tag: str
    name: str
    inputs: list[ParameterDescriptor]
    outputs: list[ParameterDescriptor]


class AgentResponse(BaseModel):
    """Example payload returned by the sample agent endpoint."""

    agent_id: int
    name: str
    description: str | None = None
