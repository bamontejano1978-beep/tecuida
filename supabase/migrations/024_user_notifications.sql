-- ============================================================
-- TE CUIDA — 024: Añadir columna notificaciones a public.users
-- ============================================================
-- Guarda las preferencias de notificación del ciudadano
-- como JSONB: { recordatorio_activo, frecuencia, hora }
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notificaciones jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.users.notificaciones IS
  'Preferencias de notificación del ciudadano: { recordatorio_activo: bool, frecuencia: "diaria"|"semanal", hora: "HH:MM" }';
