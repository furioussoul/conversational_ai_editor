"""Tools for extracting structured documentation from annotated API docstrings."""
from __future__ import annotations

import ast
import re
from pathlib import Path

from .models import ApiDocEntry, ParameterDescriptor

API_TAG_PREFIX = "@api-tag"
API_NAME_PREFIX = "@api-name"
API_INPUT_PREFIX = "@api-input"
API_OUTPUT_PREFIX = "@api-output"


def _parse_parameter(line: str, prefix: str) -> ParameterDescriptor | None:
    """Convert an annotation line into a ``ParameterDescriptor`` when possible."""

    payload = line[len(prefix) :].strip()
    if not payload or ":" not in payload:
        return None

    name_part, type_part = payload.split(":", maxsplit=1)
    name = name_part.strip()
    type_hint = type_part.strip()
    if not name or not type_hint:
        return None

    return ParameterDescriptor(name=name, type=type_hint)


def _parse_docstring(docstring: str) -> ApiDocEntry | None:
    """Convert an annotated docstring into an ``ApiDocEntry``."""

    tag: str | None = None
    name: str | None = None
    inputs: list[ParameterDescriptor] = []
    outputs: list[ParameterDescriptor] = []

    for raw_line in docstring.splitlines():
        line = raw_line.strip()
        if not line or not line.startswith("@api"):
            continue

        if line.startswith(API_TAG_PREFIX):
            tag = line[len(API_TAG_PREFIX) :].strip()
        elif line.startswith(API_NAME_PREFIX):
            name = line[len(API_NAME_PREFIX) :].strip()
        elif line.startswith(API_INPUT_PREFIX):
            parameter = _parse_parameter(line, API_INPUT_PREFIX)
            if parameter:
                inputs.append(parameter)
        elif line.startswith(API_OUTPUT_PREFIX):
            parameter = _parse_parameter(line, API_OUTPUT_PREFIX)
            if parameter:
                outputs.append(parameter)

    if not tag or not name:
        return None

    return ApiDocEntry(tag=tag, name=name, inputs=inputs, outputs=outputs)


def _collect_from_python(file_path: Path) -> list[ApiDocEntry]:
    """Extract documentation entries from a Python module."""

    entries: list[ApiDocEntry] = []
    try:
        module_ast = ast.parse(file_path.read_text(encoding="utf-8"), filename=str(file_path))
    except (SyntaxError, UnicodeDecodeError):
        return entries

    for node in ast.walk(module_ast):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            docstring = ast.get_docstring(node)
            if not docstring:
                continue
            doc_entry = _parse_docstring(docstring)
            if doc_entry:
                entries.append(doc_entry)

    return entries


_JAVA_DOCBLOCK_PATTERN = re.compile(r"/\*\*(.*?)\*/", re.DOTALL)


def _clean_javadoc_block(block: str) -> str:
    """Normalise a Javadoc-style comment block into plain text lines."""

    cleaned_lines: list[str] = []
    for raw_line in block.splitlines():
        line = raw_line.strip()
        if line.startswith("*"):
            line = line[1:].strip()
        cleaned_lines.append(line)
    return "\n".join(cleaned_lines)


def _collect_from_java(file_path: Path) -> list[ApiDocEntry]:
    """Extract documentation entries from a Java source file."""

    try:
        source = file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return []

    entries: list[ApiDocEntry] = []
    for match in _JAVA_DOCBLOCK_PATTERN.finditer(source):
        doc_entry = _parse_docstring(_clean_javadoc_block(match.group(1)))
        if doc_entry:
            entries.append(doc_entry)

    return entries


def collect_api_docs(directory: Path) -> list[ApiDocEntry]:
    """Scan ``directory`` for annotated routes and return structured docs."""

    docs: list[ApiDocEntry] = []
    for file_path in sorted(directory.rglob("*")):
        if file_path.suffix == ".py" and file_path.name != "__init__.py":
            docs.extend(_collect_from_python(file_path))
        elif file_path.suffix == ".java":
            docs.extend(_collect_from_java(file_path))

    return docs


def collect_api_docs_as_json(directory: Path) -> list[dict[str, object]]:
    """Return the collected documentation serialised as plain dictionaries."""

    return [entry.model_dump() for entry in collect_api_docs(directory)]
