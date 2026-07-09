#!/bin/bash
# ============================================================
# TE CUIDA — Flush landing cache en Vercel (Data Cache)
# ============================================================
# Uso: bash scripts/flush-landing-cache.sh [opciones]
#
# Invalida el cache tageado del helper `getMunicipalityAppsForLanding` en
# src/lib/tenant/municipality-apps-cache.ts. Equivalente a llamar
# `revalidateTag(MUNICIPALITY_APPS_TAG)` desde un endpoint admin, pero
# sin necesidad de deployar — útil para limpiar entradas stale del Data
# Cache de Vercel tras cambios que NO pasan por los endpoints admin
# (e.g. un seed SQL directo, un script de migración, etc.).
#
# Casos típicos:
#   • Acabas de poblar `municipality_applications` con un INSERT/seed
#     directo fuera del panel admin y la cache sigue mostrando 0 apps.
#   • Quieres forzar a TODAS las landings municipales a hacer un MISS
#     fresco porque acabas de subir un thumbnail compartido.
#   • Estás debuggeando un bug y necesitas confirmar que la landing
#     NO está sirviendo datos cacheados.
#
# Side-effects:
#   • Marca como inválidas todas las entradas del Data Cache con ese tag
#     en el proyecto `tecuida` (production).
#   • La siguiente request a `https://{slug}.tecuida.group/` hará MISS,
#     ejecutará `_fetchMunicipalityApps` y repoblará la cache.
#   • No afecta a otras entradas cacheadas (no purge total).
#
# Requisitos:
#   • Vercel CLI ≥ 33 (subcomando `cache invalidate` introduce tag-based
#     invalidation; antes era solo `vercel cache purge` global).
#   • Tener ejecutado `vercel login` previamente y haber linkeado el
#     proyecto (`vercel link` → crea `.vercel/project.json`).
# ============================================================

set -euo pipefail

# ── Defaults ────────────────────────────────────────────────────
TAG="municipality-apps"
PROJECT_NAME="tecuida"
DRY_RUN=false

# ── Color codes (TTY only) ──────────────────────────────────────
if [[ -t 1 ]] && command -v tput >/dev/null && [[ $(tput colors 2>/dev/null || echo 0) -ge 8 ]]; then
  BOLD="\033[1m"; DIM="\033[2m"; RESET="\033[0m"
  BLUE="\033[1;34m"; GREEN="\033[1;32m"; YELLOW="\033[1;33m"; RED="\033[1;31m"
else
  BOLD=""; DIM=""; RESET=""
  BLUE=""; GREEN=""; YELLOW=""; RED=""
fi

# ── Helpers ─────────────────────────────────────────────────────
usage() {
  cat <<EOF
${BOLD}flush-landing-cache.sh${RESET} — Invalida el Data Cache de Vercel para el tag de la landing pública.

${BOLD}USO${RESET}
  bash scripts/flush-landing-cache.sh [opciones]

${BOLD}OPCIONES${RESET}
  --tag=<name>      Tag a invalidar (default: ${TAG}).
                    NOTA: solo '${TAG}' (constante MUNICIPALITY_APPS_TAG) está
                    sincronizado con los endpoints admin — invalidar otra tag
                    puede no tener el efecto esperado.
  --dry-run         Muestra el comando `vercel cache invalidate` que se
                    ejecutaría, sin llegar a Vercel.
  --project=<name>  Nombre del proyecto Vercel linkeado (default: ${PROJECT_NAME}).
                    Solo se valida que el `.vercel/project.json` coincida.
  -h, --help        Muestra esta ayuda.

${BOLD}EJEMPLOS${RESET}
  bash scripts/flush-landing-cache.sh
  bash scripts/flush-landing-cache.sh --dry-run
  bash scripts/flush-landing-cache.sh --tag=municipality-apps --project=tecuida

${BOLD}CONTRATO DE INVALIDACIÓN${RESET}
  El tag '${TAG}' cubre la entrada de Data Cache creada por
  ${DIM}src/lib/tenant/municipality-apps-cache.ts${RESET} cuando se ejecuta
  ${DIM}getMunicipalityAppsForLanding(tenantId)${RESET}. Cada llamada admin
  que muta ${DIM}municipality_applications${RESET} o ${DIM}applications${RESET} debe
  llamar ${DIM}revalidateTag(MUNICIPALITY_APPS_TAG)${RESET} — ver
  src/app/api/admin/**/*.{ts,tsx}.

  Si añades un nuevo endpoint que mute esas tablas, registra en este script
  que ese endpoint también debe llamar a la invalidación.
EOF
}

err() {
  echo -e "${RED}❌ $*${RESET}" >&2
  exit 1
}

warn() {
  echo -e "${YELLOW}⚠️  $*${RESET}" >&2
}

info() {
  echo -e "${BLUE}ℹ️  $*${RESET}"
}

ok() {
  echo -e "${GREEN}✅ $*${RESET}"
}

# ── Argument parsing ────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag=*)
      TAG="${1#*=}"
      ;;
    --dry-run)
      DRY_RUN=true
      ;;
    --project=*)
      PROJECT_NAME="${1#*=}"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      err "Argumento desconocido: $1. Usa --help para ver la lista."
      ;;
  esac
  shift
done

# ── Banner ──────────────────────────────────────────────────────
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}🧹  TE CUIDA — Flush landing cache (Vercel Data Cache)${RESET}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

# ── Pre-flight checks ───────────────────────────────────────────

# 1. vercel CLI instalado
if ! command -v vercel >/dev/null 2>&1; then
  err "Vercel CLI no encontrado en PATH. Instala con 'npm i -g vercel' o 'pnpm add -g vercel'."
fi
VERCEL_VERSION=$(vercel --version 2>&1 | head -1)
info "Vercel CLI: ${VERCEL_VERSION}"

# 2. .vercel/project.json existe y coincide con --project
PROJECT_JSON=".vercel/project.json"
if [[ ! -f "$PROJECT_JSON" ]]; then
  err "No se encontró ${PROJECT_JSON}. Ejecuta 'vercel link' primero."
fi
LINKED_PROJECT=$(grep -o '"projectName"[[:space:]]*:[[:space:]]*"[^"]*"' "$PROJECT_JSON" \
  | sed -E 's/.*"projectName"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/')
if [[ "$LINKED_PROJECT" != "$PROJECT_NAME" ]]; then
  warn "El proyecto linkeado es '${LINKED_PROJECT}' pero se pidió '${PROJECT_NAME}'."
  warn "Asegúrate de que estás en el directorio correcto antes de continuar."
  if [[ "$DRY_RUN" != "true" ]]; then
    err "Abortando para evitar invalidar el cache del proyecto equivocado. Usa --project=${LINKED_PROJECT} si es intencionado."
  fi
fi
ok "Proyecto linkeado verificado: ${LINKED_PROJECT} (esperado: ${PROJECT_NAME})"

# 3. vercel CLI autenticado
if ! vercel whoami >/dev/null 2>&1; then
  err "No estás autenticado en Vercel. Ejecuta 'vercel login' primero."
fi
WHOAMI=$(vercel whoami 2>&1 | head -1)
ok "Autenticado como: ${WHOAMI}"

# 4. Tag value sanity: solo aceptamos el tag conocido para evitar invalidaciones accidentales.
# Si alguien quiere añadir tags adicionales en el futuro, documentar aquí y en el helper.
case "$TAG" in
  municipality-apps)
    # Tag sincronizado con MUNICIPALITY_APPS_TAG.
    ;;
  *)
    warn "Tag '${TAG}' no está en la lista blanca (municipality-apps)."
    warn "Invalidar otra tag puede afectar caches distintos de la landing pública."
    if [[ "$DRY_RUN" != "true" ]]; then
      read -r -p "¿Continuar de todos modos? [y/N] " CONTINUE </dev/tty
      if [[ "$CONTINUE" != "y" && "$CONTINUE" != "Y" ]]; then
        err "Abortado por el usuario."
      fi
    fi
    ;;
esac

# ── Construir el comando ───────────────────────────────────────
CMD=(vercel cache invalidate "--tag=${TAG}" --yes)
info "Comando a ejecutar: ${CMD[*]}"

# ── Dry-run ─────────────────────────────────────────────────────
if [[ "$DRY_RUN" == "true" ]]; then
  echo ""
  echo -e "${DIM}${BOLD}DRY-RUN${RESET}${DIM}: no se ejecuta nada contra Vercel.${RESET}"
  echo -e "${DIM}SALIENDO sin efectos.${RESET}"
  exit 0
fi

# ── Ejecutar con confirmación ───────────────────────────────────
echo ""
read -r -p "¿Confirmar invalidación de '${TAG}' en '${PROJECT_NAME}'? [y/N] " CONFIRM </dev/tty
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  err "Abortado por el usuario."
fi

echo ""
echo -e "${BOLD}Ejecutando…${RESET}"
START_TS=$(date +%s)
"${CMD[@]}"
END_TS=$(date +%s)
ELAPSED=$((END_TS - START_TS))

echo ""
ok "Invalidación completada en ${ELAPSED}s."
echo ""
echo -e "${DIM}La próxima request a https://{slug}.tecuida.group/ devengará${RESET}"
echo -e "${DIM}un MISS del Data Cache y repoblará con datos frescos del DB.${RESET}"
echo ""
echo -e "${DIM}Verificación rápida:${RESET}"
echo -e "  ${DIM}curl -sI https://zafra.tecuida.group/ | grep -i 'x-vercel-cache'${RESET}"
echo ""
