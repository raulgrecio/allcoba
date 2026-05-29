#!/usr/bin/env bash
# scripts/test-milescorts.sh — Prueba de raspado en Milescorts Madrid con paginación

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"
cd "$SERVICE_DIR"

echo "======================================================================"
echo "Iniciando descubrimiento de Milescorts Madrid..."
echo "Utilizando optimización para forzar la paginación a la Página 2"
echo "Saltando 48 perfiles (-s 48) y limitando a 10 perfiles (-l 10)"
echo "======================================================================"

# Ejecutamos discover
pnpm cli discover \
  -u "https://www.milescorts.es/escorts-y-putas/madrid-ciudad/" \
  -s 48 \
  -l 10 \
  --proxy-strategy none \
  --save-html \
  --headless
