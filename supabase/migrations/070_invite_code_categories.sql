-- ============================================================
-- TE CUIDA — Migration 070: categorías de códigos municipales
-- ============================================================
-- Dos categorías explícitas de códigos, por lote:
--
--   proposito = 'acceso' → alta de ciudadanos (registro con
--                          validación municipal, migración 051).
--   proposito = 'ods'    → invitaciones a aplicaciones (programa
--                          ODS, migraciones 068/069).
--
-- Hasta ahora ambos usos compartían las mismas filas: el primer
-- consumo ganaba. Con la 070, reserve_municipal_invite_code solo
-- acepta códigos 'acceso' (un código ODS ya no puede gastarse en
-- el registro) y activate_code_grant solo acepta 'ods' (un código
-- de acceso no puede conceder apps). El email destino y las reglas
-- del programa ODS no cambian.
--
-- Ambas funciones leen la categoría vía to_jsonb(...)->>'proposito'
-- para no depender del orden de aplicación: sin la columna aún, el
-- guard es inerte y se conserva el comportamiento clásico.
--
-- Idempotente: ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE
-- FUNCTION, UPDATE con guard de igualdad.
-- ============================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Columna de categoría a nivel de lote
-- ---------------------------------------------------------------------------

ALTER TABLE public.municipal_invite_batches
  ADD COLUMN IF NOT EXISTS proposito text NOT NULL DEFAULT 'acceso'
    CHECK (proposito IN ('acceso', 'ods'));

COMMENT ON COLUMN public.municipal_invite_batches.proposito IS
  'Categoría del lote: acceso = alta de ciudadanos (registro); ods = invitaciones a aplicaciones (programa ODS).';

-- ---------------------------------------------------------------------------
-- 2. Migración de lotes existentes
--    En municipios con grant_mode='grant' (hoy Villafranca) los lotes
--    vigentes son del programa ODS; en el resto, códigos de acceso.
--    Guard de igualdad: solo toca filas cuyo proposito difiera del objetivo.
-- ---------------------------------------------------------------------------

UPDATE public.municipal_invite_batches AS b
   SET proposito = 'ods'
  FROM public.municipalities AS m
 WHERE b.municipality_id = m.id
   AND m.grant_mode = 'grant'
   AND b.proposito IS DISTINCT FROM 'ods';

-- ---------------------------------------------------------------------------
-- 3. reserve_municipal_invite_code: solo lotes 'acceso'
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reserve_municipal_invite_code(
  p_municipality_id uuid,
  p_code_hash text,
  p_email_hash text
)
RETURNS TABLE(reservation_token uuid, reserved_until timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_token uuid := gen_random_uuid();
  v_until timestamptz := now() + interval '48 hours';
BEGIN
  UPDATE public.municipal_invite_codes AS code
     SET estado = 'reservado',
         reservation_token = v_token,
         reserved_until = v_until,
         reserved_email_hash = p_email_hash
   WHERE code.id = (
     SELECT candidate.id
       FROM public.municipal_invite_codes AS candidate
       JOIN public.municipal_invite_batches AS batch ON batch.id = candidate.batch_id
      WHERE candidate.municipality_id = p_municipality_id
        AND candidate.code_hash = p_code_hash
        AND batch.estado = 'activo'
        -- Categoría (migración 070): el registro solo consume códigos 'acceso'.
        -- Vía to_jsonb: sin la columna aplicada aún, el guard es inerte.
        AND COALESCE(to_jsonb(batch)->>'proposito', 'acceso') = 'acceso'
        AND (candidate.expires_at IS NULL OR candidate.expires_at > now())
        AND (
          candidate.estado = 'disponible'
          OR (candidate.estado = 'reservado' AND candidate.reserved_until <= now())
        )
      FOR UPDATE OF candidate SKIP LOCKED
      LIMIT 1
   );

  IF FOUND THEN
    RETURN QUERY SELECT v_token, v_until;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. activate_code_grant: solo lotes 'ods' (re-declaración de la 069 final)
--    Con esto, aplicar 069 antes o después de la 070 produce el mismo
--    binario final de la función. La app del lote tiene prioridad sobre la
--    elegida por el ciudadano; APP_REQUIRED si no hay ninguna.
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
-- 5. Grants y comentarios (re-declarados por simetría con 068/069)
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.reserve_municipal_invite_code(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_code_grant(text, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_municipal_invite_code(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_code_grant(text, text, uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.reserve_municipal_invite_code(uuid, text, text) IS
  'Reserva un código municipal para el registro (migración 051). Con la 070 solo acepta códigos de lotes proposito=acceso; los códigos del programa ODS no se pueden gastar en el alta.';

COMMENT ON FUNCTION public.activate_code_grant(text, text, uuid, uuid) IS
  'Activa un código ODS y concede acceso a una app: valida correo destino, caducidad, categoría ODS del lote (migración 070), publicación de la app, límite semanal ISO y app no repetida. La aplicación es la pre-asignada en el lote o, si no hay, la elegida por el ciudadano (APP_REQUIRED si falta). Todo en una transacción.';

COMMIT;
