-- ============================================================
-- TE CUIDA — Migration 069: lotes ODS con aplicación pre-asignada
-- ============================================================
-- Petición de la gestora de Villafranca de los Barros:
--   "Los códigos generados no se apliquen al registro de usuarios
--    sino que estén vinculados a aplicaciones concretas."
--
-- Dos cambios, ambos con alcance controlado por municipio:
--
--   1. municipal_invite_batches.application_id (NULLable, DEFAULT NULL):
--      al generar un lote se puede fijar la aplicación que concederán
--      todos sus códigos. NULL = comportamiento clásico (el ciudadano
--      elige la app al activar). activate_code_grant() pasa a resolver
--      la app como COALESCE(app del lote, app del cliente) y exige
--      APP_REQUIRED si ninguna de las dos existe.
--
--   2. Villafranca deja de exigir código en el registro
--      (municipalities.invite_codes_required = false). Los códigos
--      pasan a ser exclusivamente invitaciones a aplicaciones vía
--      programa ODS (grant_mode='grant', migración 068). El resto de
--      municipios no cambia: el flag es por-municipio y el panel
--      municipal puede re-activarlo cuando quiera.
--
--   3. Conciencia de categoría (migración 070): activate_code_grant()
--      solo concede apps con códigos de lotes proposito='ods'. La
--      columna proposito se lee vía to_jsonb para que esta migración
--      siga siendo válida aplicada ANTES o DESPUÉS de la 070; sin la
--      columna, el guard es inerte.
--
-- Idempotente: ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE FUNCTION,
-- y UPDATE con guard de igualdad.
-- ============================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Aplicación pre-asignada a nivel de lote
-- ---------------------------------------------------------------------------

ALTER TABLE public.municipal_invite_batches
  ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.municipal_invite_batches.application_id IS
  'Aplicación que concede cada código del lote al activarse (programa ODS). NULL = el ciudadano elige la aplicación al activar (comportamiento clásico).';

-- ---------------------------------------------------------------------------
-- 2. activate_code_grant(): la app del lote pre-asignado tiene prioridad
--    Misma firma (text, text, uuid, uuid): p_application_id pasa a ser
--    opcional (NULL) desde el cliente cuando el lote trae app asignada.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.activate_code_grant(
  p_code_hash text,
  p_email_hash text,
  p_user_id uuid,
  p_application_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code public.municipal_invite_codes%ROWTYPE;
  v_batch public.municipal_invite_batches%ROWTYPE;
  v_user_municipality uuid;
  v_app_id uuid;
BEGIN
  -- 1. Municipio del usuario autenticado
  SELECT municipality_id INTO v_user_municipality
    FROM public.users
   WHERE id = p_user_id;
  IF v_user_municipality IS NULL THEN
    RAISE EXCEPTION 'USER_WITHOUT_MUNICIPALITY' USING ERRCODE = '22023';
  END IF;

  -- 2. Localizar y bloquear el código (FOR UPDATE: sin carreras)
  SELECT * INTO v_code
    FROM public.municipal_invite_codes
   WHERE municipality_id = v_user_municipality
     AND code_hash = p_code_hash
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CODE_NOT_FOUND' USING ERRCODE = '22023';
  END IF;

  -- 3. Vinculación estricta: el correo autenticado debe ser el destino
  IF v_code.destination_email_hash IS NULL
     OR v_code.destination_email_hash IS DISTINCT FROM p_email_hash THEN
    RAISE EXCEPTION 'CODE_EMAIL_MISMATCH' USING ERRCODE = '22023';
  END IF;

  -- 4. Idempotencia: el mismo usuario re-activa su código ya consumido
  IF v_code.estado = 'consumido' AND v_code.consumed_by = p_user_id THEN
    RETURN COALESCE(
      (SELECT application_id
         FROM public.user_app_grants
        WHERE source_code_id = v_code.id
        ORDER BY granted_at
        LIMIT 1),
      p_application_id
    );
  END IF;

  -- 5. Estado y caducidad. Un código 'reservado' con reserva vigente no
  --    se puede activar (hay un registro en curso); con reserva expirada sí.
  IF v_code.estado NOT IN ('disponible', 'reservado')
     OR (v_code.estado = 'reservado' AND v_code.reserved_until > now())
     OR (v_code.expires_at IS NOT NULL AND v_code.expires_at <= now()) THEN
    RAISE EXCEPTION 'CODE_NOT_ACTIVE' USING ERRCODE = '22023';
  END IF;

  -- 6. Categoría del lote (migración 070): solo los lotes del programa ODS
  --    conceden aplicaciones; los de 'acceso' son para el alta de ciudadanos.
  --    Lectura vía to_jsonb para no depender de que la columna proposito
  --    exista aún (si la 070 no está aplicada, el guard es inerte).
  SELECT * INTO v_batch
    FROM public.municipal_invite_batches
   WHERE id = v_code.batch_id;

  IF COALESCE(to_jsonb(v_batch)->>'proposito', 'ods') <> 'ods' THEN
    RAISE EXCEPTION 'CODE_NOT_ODS' USING ERRCODE = '22023';
  END IF;

  -- 7. Resolver la aplicación a conceder:
  --      a) la pre-asignada en el lote (programa ODS de Villafranca), o
  --      b) la elegida por el ciudadano (comportamiento clásico).
  --    Sin ninguna de las dos → APP_REQUIRED.
  SELECT b.application_id INTO v_app_id
    FROM public.municipal_invite_batches AS b
   WHERE b.id = v_code.batch_id;
  v_app_id := COALESCE(v_app_id, p_application_id);

  IF v_app_id IS NULL THEN
    RAISE EXCEPTION 'APP_REQUIRED' USING ERRCODE = '22023';
  END IF;

  -- 8. La app debe estar publicada y activa en el municipio
  IF NOT EXISTS (
    SELECT 1
      FROM public.municipality_applications AS ma
      JOIN public.applications AS a ON a.id = ma.application_id
     WHERE ma.municipality_id = v_code.municipality_id
       AND ma.application_id = v_app_id
       AND ma.activa
       AND ma.publication_status = 'publicada'
       AND a.activa
  ) THEN
    RAISE EXCEPTION 'APP_NOT_AVAILABLE' USING ERRCODE = '22023';
  END IF;

  -- 9. Regla semanal: una sola concesión nueva por semana ISO
  IF EXISTS (
    SELECT 1
      FROM public.user_app_grants
     WHERE user_id = p_user_id
       AND revoked_at IS NULL
       AND ods_week_monday(granted_at) = ods_week_monday(now())
  ) THEN
    RAISE EXCEPTION 'WEEKLY_LIMIT_REACHED' USING ERRCODE = '22023';
  END IF;

  -- 10. La app concedida no debe estar ya concedida (regla "app distinta")
  IF EXISTS (
    SELECT 1
      FROM public.user_app_grants
     WHERE user_id = p_user_id
       AND application_id = v_app_id
       AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'APP_ALREADY_GRANTED' USING ERRCODE = '22023';
  END IF;

  -- 11. Consumir el código
  UPDATE public.municipal_invite_codes
     SET estado = 'consumido',
         consumed_by = p_user_id,
         consumed_at = now(),
         reserved_until = NULL
   WHERE id = v_code.id;

  -- 12. Crear la concesión (misma transacción)
  INSERT INTO public.user_app_grants
    (user_id, application_id, municipality_id, source_code_id, expires_at)
  VALUES
    (p_user_id, v_app_id, v_code.municipality_id, v_code.id, v_code.expires_at)
  ON CONFLICT (user_id, application_id) DO NOTHING;

  RETURN v_app_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Registro de Villafranca sin código (los códigos pasan a ser
--    invitaciones a apps del programa ODS). El resto de municipios,
--    igual. Reversible desde el panel (set_required).
-- ---------------------------------------------------------------------------

UPDATE public.municipalities
   SET invite_codes_required = false
 WHERE slug IN ('villafranca-de-los-barros', 'villafrancadelosbarros')
   AND invite_codes_required <> false;

-- Grants (re-declarados por simetría con 068; CREATE OR REPLACE no los toca)
REVOKE ALL ON FUNCTION public.activate_code_grant(text, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_code_grant(text, text, uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.activate_code_grant(text, text, uuid, uuid) IS
  'Activa un código ODS y concede acceso a una app: valida correo destino, caducidad, categoría ODS del lote (migración 070), publicación de la app, límite semanal ISO y app no repetida. La aplicación es la pre-asignada en el lote o, si no hay, la elegida por el ciudadano (APP_REQUIRED si falta). Todo en una transacción.';

COMMIT;
