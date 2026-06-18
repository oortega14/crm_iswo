#!/bin/sh
# Devuelve ANTHROPIC_API_KEY para Claude Code (misma key que Rails en api/.env).
# No imprime nada si falta la variable — Claude Code pedirá configurarla.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/api/.env"
[ -f "$ENV_FILE" ] || exit 0
grep -E '^ANTHROPIC_API_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'"
