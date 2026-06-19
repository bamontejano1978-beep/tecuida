-- ============================================================
-- 023_app_landing_fields.sql
--
-- Añade campos para la landing genérica de aplicaciones
-- no-programa (herramienta, encuesta, recurso):
--   - instrucciones: texto con instrucciones de uso/descarga
--   - url_acceso: enlace externo a la app web
-- ============================================================

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS instrucciones text,
  ADD COLUMN IF NOT EXISTS url_acceso text;
