"""API package exposing endpoint routers and documentation utilities."""
from __future__ import annotations

from fastapi import APIRouter

from .routes import example

routers: list[APIRouter] = [example.router]

__all__ = ["routers"]
