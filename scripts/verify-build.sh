#!/bin/bash
# ============================================================
# TE CUIDA — Script de verificación pre-deploy
# ============================================================
# Uso: bash scripts/verify-build.sh
#
# Verifica:
#   1. Variables de entorno requeridas
#   2. TypeScript compila sin errores
#   3. Tests unitarios pasan
#   4. Build de producción de Next.js
# ============================================================

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 TE CUIDA — Verificación pre-deploy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Variables de entorno ──────────────────────────────
echo ""
echo "📋 1/4 Verificando variables de entorno..."

REQUIRED_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "NEXT_PUBLIC_BASE_DOMAIN"
)

MISSING_VARS=0
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "   ❌ $var no está definida"
    MISSING_VARS=$((MISSING_VARS + 1))
  else
    echo "   ✅ $var"
  fi
done

if [ "$MISSING_VARS" -gt 0 ]; then
  echo ""
  echo "⚠️  Faltan $MISSING_VARS variable(s) de entorno requeridas."
  echo "   Copia .env.local.example a .env.local y completa los valores."
  echo ""
  if [ "$CI" != "true" ]; then
    echo "   ¿Quieres continuar con DEMO_MODE=true? (s/N)"
    read -r CONTINUE
    if [ "$CONTINUE" != "s" ] && [ "$CONTINUE" != "S" ]; then
      exit 1
    fi
    export DEMO_MODE=true
  fi
fi

# ── 2. TypeScript ─────────────────────────────────────────
echo ""
echo "📝 2/4 Verificando TypeScript..."
npx tsc --noEmit
echo "   ✅ TypeScript compila sin errores"

# ── 3. Tests ──────────────────────────────────────────────
echo ""
echo "🧪 3/4 Ejecutando tests..."
npx jest --passWithNoTests --no-coverage --ci 2>&1
echo "   ✅ Tests pasan"

# ── 4. Build de Next.js ──────────────────────────────────
echo ""
echo "📦 4/4 Build de producción..."
npx next build
echo "   ✅ Build completado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Verificación completada — listo para deploy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
