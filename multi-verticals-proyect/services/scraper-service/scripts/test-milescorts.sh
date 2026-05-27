#!/usr/bin/env bash
# scripts/test-milescorts.sh — Prueba de raspado en Milescorts Madrid con paginación

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"
cd "$SERVICE_DIR"

echo "======================================================================"
echo "Iniciando descubrimiento de Milescorts Madrid..."
echo "Utilizando optimización para forzar la paginación a la Página 2"
echo "Saltando 18 perfiles (-s 18) y limitando a 25 perfiles (-l 25)"
echo "======================================================================"

# Ejecutamos discover
pnpm cli discover \
  -u "https://www.milescorts.es/escorts-y-putas/madrid-ciudad/" \
  -s 18 \
  -l 25 \
  --proxy-strategy none \
  --save-html \
  --headless
