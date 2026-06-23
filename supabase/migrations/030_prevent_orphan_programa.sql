-- ============================================================================
-- TE CUIDA — 030: Trigger anti-reincidencia del bug 404
-- ============================================================================
-- Bug origin: El create-form tenía `tipo='programa'` como default. Si el
-- admin elegía "URL externa" o "Subir ZIP" sin cambiar el tipo manualmente,
-- quedaba registrada como `programa` sin fila correspondiente en `programs`.
-- Resultado: 404 al hacer click desde el dashboard del ciudadano.
--
-- El bug fue resuelto en cuatro capas:
--   · Capa 1: `/app/[id]/page.tsx` y `/apps/[appSlug]/page.tsx` con
--     `.maybeSingle()` + fallback a `GenericAppLanding` (definitivo).
--   · Capa 2: `create-form.tsx` añade `handleModeSwitch` que auto-promueve
--     `programa → herramienta` al entrar en modos URL/ZIP (defensa UX).
--   · Capa 3: migración 029 saneó los 18 apps huérfanas pre-existentes.
--   · Capa 4: tests Jest para el auto-switch (`create-form.test.tsx`).
--
-- Esta migración añade una CAPA 5: trigger en PostgreSQL que **emite un
-- WARNING visible en el log** cada vez que alguien inserta o cambia el
-- `tipo` de una app a `'programa'` SIN un registro asociado en `programs`.
--
-- Decisión de diseño: WARNING (no RAISE EXCEPTION)
--   - Más amable con flujos legítimos donde un admin crea primero la app
--     y rellena los módulos/lecciones minutos después (workflow humano).
--   - El WARNING aparece en el log de Postgres con el id de fila y el
--     nombre: cualquier monitorización (Sentry/Datadog/Supabase Logs) lo
--     capturará y enviará una alerta.
--   - Si en el futuro se quiere endurecer a EXCEPTION, basta cambiar
--     `RAISE WARNING` por `RAISE EXCEPTION` con el mismo mensaje.
--
-- Idempotente: `CREATE OR REPLACE FUNCTION` + `DROP TRIGGER IF EXISTS`.
-- ============================================================================

-- ── Función: registra WARNING si INSERT/UPDATE crea app 'programa' huérfana
CREATE OR REPLACE FUNCTION public.warn_orphan_programa_app()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  -- Solo nos interesa cuando el tipo vigente es 'programa'
  IF NEW.tipo IS DISTINCT FROM 'programa' THEN
    RETURN NEW;
  END IF;

  -- Hay un programa asociado a esta app?
  IF EXISTS (
    SELECT 1
    FROM public.programs p
    WHERE p.application_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  -- No hay programa → WARNING ruidoso (no detiene la operación)
  RAISE WARNING
    '[030_prevent_orphan_programa] App id=%, nombre="%", tipo=programa SIN programa asociado. Riesgo de 404 al hacer click desde el dashboard del ciudadano. Crea un registro en `programs` con `application_id` apuntando a esta app, o cambia el `tipo` a "herramienta" si era una confusión de tipo desde el create-form.',
    NEW.id,
    NEW.nombre
    USING ERRCODE = 'P0001';

  RETURN NEW;
END;
$fn$;

-- ── Trigger: AFTER INSERT OR UPDATE OF tipo → ejecuta la función
DROP TRIGGER IF EXISTS trg_warn_orphan_programa ON public.applications;

CREATE TRIGGER trg_warn_orphan_programa
  AFTER INSERT OR UPDATE OF tipo
  ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.warn_orphan_programa_app();

-- ── Comentarios para futuros mantenedores
COMMENT ON FUNCTION public.warn_orphan_programa_app()
  IS 'Emite RAISE WARNING si una app con tipo=programa queda sin fila asociada en `programs`. Ver migración 030.';

COMMENT ON TRIGGER trg_warn_orphan_programa ON public.applications
  IS 'Dispara warn_orphan_programa_app() tras INSERT o UPDATE del campo `tipo`. Defensa activa contra reincidencia del bug 404 de apps huérfanas.';

-- ============================================================================
-- CÓMO VERIFICARLO (NO MODIFICA NADA; sólo dispara el WARNING esperable)
--
-- 1) Caso patológico (debe generar WARNING): crear app con tipo='programa'
--    sin programa asociado:
--
--    INSERT INTO public.applications
--      (category_id, nombre, descripcion, tipo, activa)
--    VALUES
--      ('<cat-id>', 'test-orphan-030', 'Test trigger 030',
--       'programa', true);
--
--    En el log de Postgres / Supabase → verás:
--      WARNING: [030_prevent_orphan_programa] App id=..., nombre="test-orphan-030",
--      tipo=programa SIN programa asociado. ...
--    Luego recuerda: DELETE FROM public.applications WHERE nombre = 'test-orphan-030';
--
-- 2) Caso correcto (NO debe generar WARNING): crear app con tipo='herramienta':
--
--    INSERT INTO public.applications
--      (category_id, nombre, descripcion, tipo, activa)
--    VALUES
--      ('<cat-id>', 'test-tool-030', 'Tool', 'herramienta', true);
--
--    Silencio. Idem limpieza: DELETE FROM public.applications
--      WHERE nombre = 'test-tool-030';
-- ============================================================================
