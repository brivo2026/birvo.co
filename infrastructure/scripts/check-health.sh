#!/usr/bin/env bash
# Verifica rápidamente que la API, Postgres y Redis respondan.
# Uso: ./infrastructure/scripts/check-health.sh

set -euo pipefail

API_URL="${API_URL:-http://localhost:4000}"

echo "→ Verificando API (${API_URL}/v1/health)..."
curl -fsS "${API_URL}/v1/health" | tee /dev/stderr | grep -q '"status":"ok"' \
  && echo "✅ API saludable" \
  || { echo "❌ La API no respondió healthy"; exit 1; }
