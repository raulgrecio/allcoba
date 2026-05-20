#!/usr/bin/env bash
# test-dating-vertical.sh — Prueba end-to-end de los 20 portales de Dating.
#
# Uso:
#   ./scripts/test-dating-vertical.sh              # ejecutar todo
#   ./scripts/test-dating-vertical.sh --dry-run    # solo imprime los comandos
#   ./scripts/test-dating-vertical.sh --cf-only    # solo portales Cloudflare (ventana visible)
#   ./scripts/test-dating-vertical.sh ardienteplacer bluemove  # portales concretos
#
# Portales CF (escort-advisor, gemidos, topescortbabes) corren con --no-headless
# (ventana visible) para poder depurar el desafío de Cloudflare.
#
# Orden de ejecución:
#   1. Portales SSR/JS sin Cloudflare  → proxy-strategy none
#   2. Portales con Cloudflare WAF     → proxy-strategy zyte (al final, con pausa)
#
# Output:
#   __data/storage/providers.json   — perfiles normalizados
#   __data/logs/dating-YYYYMMDD/    — log por portal
#   __data/logs/dating-YYYYMMDD/summary.txt — resumen al terminar
#
# Después de ejecutar, copiar las líneas de "## DATING-SOURCES.md update" al md.

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"
DATE="$(date '+%d/%m/%Y')"
LOG_DIR="$SERVICE_DIR/__data/logs/dating-$(date '+%Y%m%d-%H%M%S')"
LIMIT=2
DELAY_BETWEEN=3          # segundos entre portales (IP safety)
DELAY_BEFORE_CF=30       # pausa extra antes de empezar portales CF

DRY_RUN=false
CF_ONLY=false           # solo portales Cloudflare (Fase 2)
FILTER_PORTALS=()

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --cf-only) CF_ONLY=true ;;
    *) FILTER_PORTALS+=("$arg") ;;
  esac
done

mkdir -p "$LOG_DIR"
cd "$SERVICE_DIR"

# ── Helpers ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

log()  { echo -e "${CYAN}[$(date '+%H:%M:%S')]${NC} $*"; }
ok()   { echo -e "${GREEN}✅ $*${NC}"; }
fail() { echo -e "${RED}❌ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }

count_providers() {
  local file="$SERVICE_DIR/__data/storage/providers.json"
  [[ -f "$file" ]] && python3 -c "import json,sys; d=json.load(open('$file')); print(len(d))" 2>/dev/null || echo 0
}

# Extrae sourceUrls de entradas en providers.json del portal dado
recent_urls() {
  local portal="$1"
  local file="$SERVICE_DIR/__data/storage/providers.json"
  [[ -f "$file" ]] || { echo ""; return; }
  python3 - "$file" "$portal" <<'PY' 2>/dev/null
import json, sys
data = json.load(open(sys.argv[1]))
portal = sys.argv[2].lower().replace('-', '').replace('.', '')
urls = []
for item in (data if isinstance(data, list) else data.values()):
    for ref in item.get('externalIds', []):
        src = ref.get('source', '').lower().replace('-', '').replace('.', '')
        if portal in src:
            url = item.get('metadata', {}).get('sourceUrl', '')
            if url:
                urls.append(url)
print('\n'.join(u for u in urls if u)[:3000])
PY
}

run_command() {
  local name="$1"; shift
  local log_file="$LOG_DIR/$name.log"

  if $DRY_RUN; then
    echo "  [DRY-RUN] pnpm cli $*"
    return 0
  fi

  log "Ejecutando: pnpm cli $*"
  if pnpm cli "$@" 2>&1 | tee "$log_file"; then
    return 0
  else
    return 1
  fi
}

should_run() {
  local name="$1"
  [[ ${#FILTER_PORTALS[@]} -eq 0 ]] && return 0
  for f in "${FILTER_PORTALS[@]}"; do
    [[ "$name" == "$f" ]] && return 0
  done
  return 1
}

# Resultado acumulado para el resumen
declare -a RESULTS_OK=()
declare -a RESULTS_FAIL=()
declare -a RESULTS_SKIP=()
declare -a MD_UPDATES=()

run_portal() {
  local name="$1"
  local mode="$2"       # discover | scrape
  local url="$3"
  local proxy="$4"      # none | zyte
  local note="${5:-}"   # nota opcional

  should_run "$name" || return 0

  echo ""
  log "═══════════════════════════════════════"
  log "Portal: $name  (mode=$mode proxy=$proxy)"
  [[ -n "$note" ]] && warn "$note"

  local before
  before=$(count_providers)

  # Portales CF (proxy=zyte) → ventana visible para depurar el desafío
  local headless_flag="--headless"
  if [[ "$proxy" == "zyte" ]]; then
    headless_flag="--no-headless"
  fi

  local exit_code=0
  if [[ "$mode" == "discover" ]]; then
    run_command "$name" discover \
      -u "$url" \
      -l "$LIMIT" \
      --proxy-strategy "$proxy" \
      --solver-strategy none \
      --save-html \
      "$headless_flag" \
      || exit_code=$?
  else
    run_command "$name" scrape \
      -u "$url" \
      --proxy-strategy "$proxy" \
      --solver-strategy none \
      --save-html \
      "$headless_flag" \
      || exit_code=$?
  fi

  local after
  after=$(count_providers)
  local new_count=$(( after - before ))

  if [[ $exit_code -eq 0 ]]; then
    ok "$name — $new_count nuevos perfiles guardados"
    RESULTS_OK+=("$name ($new_count nuevos)")

    # Template para DATING-SOURCES.md
    local urls
    urls=$(recent_urls "$name")
    if [[ -n "$urls" ]]; then
      local md_line="### $name — $DATE"$'\n'
      while IFS= read -r u; do
        md_line+="  \`$u\`"$'\n'
      done <<< "$urls"
      MD_UPDATES+=("$md_line")
    fi
  else
    fail "$name — FALLO (exit=$exit_code)"
    RESULTS_FAIL+=("$name")
  fi

  sleep "$DELAY_BETWEEN"
}

skip_portal() {
  local name="$1"
  local reason="$2"
  should_run "$name" || return 0
  warn "SKIP $name — $reason"
  RESULTS_SKIP+=("$name: $reason")
}

# ── Portales SSR/JS (sin Cloudflare) ─────────────────────────────────────────
if $CF_ONLY; then
  log "--cf-only activo — saltando FASE 1 (portales sin Cloudflare)"
fi

if ! $CF_ONLY; then
log "========================================="
log "FASE 1: Portales sin Cloudflare (proxy=none)"
log "========================================="

run_portal "ardienteplacer" "discover" \
  "https://www.ardienteplacer.com/escorts/putas-guarras-putas-particulares/madrid/" \
  "none"

run_portal "bluemove" "discover" \
  "https://bluemove.es/madrid/escorts/" \
  "none"

run_portal "chicasmalas" "discover" \
  "https://www.chicasmalas.es/wp-json/wp/v2/ficha-escort?per_page=20" \
  "none"

run_portal "citapasion" "discover" \
  "https://citapasion.com/escorts/madrid/madrid" \
  "none"

run_portal "destacamos" "discover" \
  "https://www.destacamos.net/escorts/madrid/" \
  "none" \
  "Listing TBD — puede fallar si URL incorrecta"

run_portal "erosguia" "discover" \
  "https://www.erosguia.com/escorts-espana" \
  "none"

run_portal "girlsbcn" "discover" \
  "https://www.girlsbcn.net/escorts-girl/" \
  "none"

run_portal "loquosex" "discover" \
  "https://loquosex.com/escorts/madrid/" \
  "none" \
  "Listing TBD — puede fallar si URL incorrecta"

run_portal "madrid69" "discover" \
  "https://www.madrid69.com/citas/madrid/" \
  "none"

run_portal "milescorts" "discover" \
  "https://www.milescorts.es/escorts-y-putas/madrid-ciudad/" \
  "none"

run_portal "milpasiones" "discover" \
  "https://milpasiones.com/escorts/madrid/" \
  "none" \
  "Listing TBD — puede fallar si URL incorrecta"

run_portal "mislios" "discover" \
  "https://mislios.com/anuncios/madrid/" \
  "none" \
  "Listing AJAX — puede no extraer enlaces de perfil"

run_portal "nuevoloquo" "discover" \
  "https://www.nuevoloquo.ch/escort/madrid/" \
  "none" \
  "Listing TBD — puede fallar si URL incorrecta"

run_portal "nuevapasion" "discover" \
  "https://nuevapasion.com/anuncios/" \
  "none" \
  "Listing TBD — puede fallar si URL incorrecta"

# Portales con listing login-required
skip_portal "hotvalencia"  "LOGIN requerido para listing"
skip_portal "girlsmadrid"  "Listing solo para miembros registrados"
fi  # fin FASE 1

# ── Portales Cloudflare (proxy=zyte) ─────────────────────────────────────────
echo ""
log "========================================="
log "FASE 2: Portales con Cloudflare (proxy=zyte, ventana visible)"
log "========================================="

# Pausa pre-CF solo si FASE 1 corrió (no quemar IP); con --cf-only no aplica
if ! $DRY_RUN && ! $CF_ONLY; then
  log "Pausa de ${DELAY_BEFORE_CF}s antes de empezar CF portales..."
  sleep "$DELAY_BEFORE_CF"
fi

run_portal "eurogirlsescort" "discover" \
  "https://www.eurogirlsescort.com/escorts/spain/madrid/" \
  "zyte"

run_portal "escort-advisor" "discover" \
  "https://www.escort-advisor.xxx/escort/madrid1" \
  "zyte"

run_portal "gemidos" "discover" \
  "https://gemidos.tv/espana-comunidad-de-madrid" \
  "zyte"

run_portal "topescortbabes" "discover" \
  "https://topescortbabes.com/es/spain/escorts" \
  "zyte"

# ── Resumen ───────────────────────────────────────────────────────────────────
{
  echo "═══════════════════════════════════════════"
  echo "RESUMEN — $(date '+%Y-%m-%d %H:%M')"
  echo "═══════════════════════════════════════════"
  echo ""
  echo "✅ OK (${#RESULTS_OK[@]}):"
  for r in "${RESULTS_OK[@]}"; do echo "   $r"; done
  echo ""
  echo "❌ FALLOS (${#RESULTS_FAIL[@]}):"
  for r in "${RESULTS_FAIL[@]}"; do echo "   $r"; done
  echo ""
  echo "⚠️  SKIP (${#RESULTS_SKIP[@]}):"
  for r in "${RESULTS_SKIP[@]}"; do echo "   $r"; done
  echo ""
  echo "Logs: $LOG_DIR"
  echo "Providers total: $(count_providers)"
} | tee "$LOG_DIR/summary.txt"

# ── Template DATING-SOURCES.md ───────────────────────────────────────────────
if [[ ${#MD_UPDATES[@]} -gt 0 ]]; then
  echo ""
  echo "═══════════════════════════════════════════"
  echo "COPIAR A DATING-SOURCES.md:"
  echo "═══════════════════════════════════════════"
  for update in "${MD_UPDATES[@]}"; do
    echo "$update"
  done
fi

log "Fin."
