-- ============================================================
-- Limpieza: marcar el tenant 'platform' como oculto en admin
-- ============================================================
-- El tenant 'platform' (creado en migración 012) actúa como
-- contenedor sintético para los superadmins. Para que NO aparezca
-- en listados admin (como /admin/municipios) ni en asignación
-- accidental de planes, lo marcamos con oculto_admin = true.
--
-- Esto requiere actualizar las queries de admin para filtrar:
--   .eq('oculto_admin', false)
-- Alternativamente, se puede usar:
--   .neq('slug', 'platform')
-- ============================================================

ALTER TABLE public.municipalities
  ADD COLUMN IF NOT EXISTS oculto_admin boolean NOT NULL DEFAULT false;

UPDATE public.municipalities
SET oculto_admin = true
WHERE slug = 'platform';
