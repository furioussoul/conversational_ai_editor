"""FastAPI application entry point for the AI knowledgebase backend."""
from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI

from api import routers
from api.docs_parser import collect_api_docs
from api.models import ApiDocEntry

app = FastAPI(title="AI Knowledgebase API")

for router in routers:
    app.include_router(router)


@app.get("/api-docs-json", response_model=list[ApiDocEntry])
async def get_api_docs() -> list[ApiDocEntry]:
    """Return generated documentation for all annotated API endpoints."""

    api_directory = Path(__file__).parent / "api"
    return collect_api_docs(api_directory)
