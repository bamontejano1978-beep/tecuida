-- ============================================================================
-- Migración 034 — Columnas para eliminación de cuenta RGPD
-- ============================================================================
-- Añade deletion_token (UUID único) y deletion_requested_at (timestamp)
-- para el flujo de eliminación de cuenta con confirmación por email.
--
-- Flujo:
--   1. Usuario solicita eliminación en /perfil → POST /api/auth/delete-account
--   2. API genera token, lo guarda, envía email con link de confirmación
--   3. Usuario clicka link → GET /api/auth/delete-account?token=...
--   4. API valida token (1h expiración), borra datos y cuenta
-- ============================================================================

-- Token único para confirmación de eliminación (UUID v4)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deletion_token text UNIQUE;

-- Timestamp de la solicitud (para expiración de 1 hora)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz;

-- Índice para búsqueda rápida por token
CREATE INDEX IF NOT EXISTS idx_users_deletion_token
  ON public.users (deletion_token)
  WHERE deletion_token IS NOT NULL;

-- Comentarios
COMMENT ON COLUMN public.users.deletion_token IS 'Token único para confirmar eliminación de cuenta (RGPD). Expira en 1 hora.';
COMMENT ON COLUMN public.users.deletion_requested_at IS 'Timestamp UTC de cuándo se solicitó la eliminación de cuenta.';
