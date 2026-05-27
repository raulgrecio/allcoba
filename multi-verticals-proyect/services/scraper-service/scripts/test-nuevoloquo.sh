#!/usr/bin/env bash
# scripts/test-nuevoloquo.sh — Prueba de raspado en Nuevoloquo Madrid con paginación optimizada

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"
cd "$SERVICE_DIR"

echo "======================================================================"
echo "Iniciando descubrimiento de Nuevoloquo Madrid..."
echo "Utilizando optimización matemática para forzar la paginación a la"
echo "Página 2 sin necesidad de procesar los 81 perfiles completos de la"
echo "Página 1 (lo cual demoraría más de 10 minutos)."
echo "Saltando 78 perfiles (-s 78) y limitando a 5 perfiles procesados (-l 5)"
echo "de forma que procesará 3 de la Pág 1 y 2 de la Pág 2 de manera eficiente."
echo "======================================================================"

# Ejecutamos discover
pnpm cli discover \
  -u "https://www.nuevoloquo.ch/anuncios-eroticos/madrid/" \
  -s 78 \
  -l 5 \
  --proxy-strategy none \
  --save-html \
  --headless
