#!/usr/bin/env bash
# scripts/test-destacamos.sh — Prueba de raspado en destacamos.net
#
# Descarga 1 página entera + 10 resultados de la segunda página (límite = 30)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"
cd "$SERVICE_DIR"

echo "============================================="
echo "Iniciando prueba real de Destacamos Madrid..."
echo "Límite: 30 perfiles (1a página + 20 de la 2a)"
echo "60 perfiles por página, preminum 30 perfiles"
echo "============================================="

pnpm cli discover \
  -u "https://www.destacamos.net/localidad-Madrid/listings.html" \
  -s 80 \
  -l 30 \
  --proxy-strategy none \
  --save-html \
  --no-headless
