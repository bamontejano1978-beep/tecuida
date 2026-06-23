#!/usr/bin/env bash
# ============================================================
# Script de despliegue — sube la app a Vercel en producción
# ============================================================
# Requisitos:
#   1. Vercel CLI instalado: npm i -g vercel
#   2. Autenticado:         vercel login
#   3. .env configurado:    cp .env.example .env
#
# Uso:
#   bash scripts/deploy.sh
#
# Qué hace:
#   1. Compila la app (tsc + vite build)
#   2. Despliega a Vercel con --prod
#   3. Muestra la URL de producción
#   4. Sugiere copiar la URL a VITE_APP_URL en .env
# ============================================================

set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   TE CUIDA — Deploy a Vercel        ║"
echo "╚══════════════════════════════════════╝"
echo ""

# 1. Verificar dependencias
if ! command -v vercel &> /dev/null; then
  echo "❌ Vercel CLI no está instalado."
  echo "   Instálalo con: npm i -g vercel"
  exit 1
fi

# 2. Build
echo "📦 Compilando..."
npm run build
echo ""

# 3. Deploy
echo "🚀 Desplegando a Vercel producción..."
DEPLOY_OUTPUT=$(vercel --prod --yes 2>&1)
echo "$DEPLOY_OUTPUT"

# 4. Extraer URL
PROD_URL=$(echo "$DEPLOY_OUTPUT" | grep -oP 'https://[a-zA-Z0-9\-._~:/?#\[\]@!$&()*+,;=]+' | head -1)

if [ -n "$PROD_URL" ]; then
  echo ""
  echo "✅ Desplegado en: $PROD_URL"
  echo ""
  echo "📝 Actualiza VITE_APP_URL en tu .env:"
  echo "   VITE_APP_URL=$PROD_URL"
  echo ""
  echo "🔗 Después ejecuta el registro en el catálogo:"
  echo "   npm run register"
else
  echo ""
  echo "⚠️  No se pudo extraer la URL automáticamente."
  echo "   Revisa la salida de Vercel arriba y copia la URL manualmente."
fi
