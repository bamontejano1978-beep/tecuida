-- ============================================================
-- TE CUIDA — Migration 068: Programa ODS (concesiones por app)
-- ============================================================
-- Programa "VCA TE CUIDA" de Villafranca de los Barros:
--   "Una idea para mejorar Villafranca. Un recurso para cuidarte a ti."
--
-- Añade, SOLO para municipios con grant_mode='grant':
--   • Concesiones de acceso usuario→app (user_app_grants).
--   • Participaciones semanales ODS (ods_weekly_participations),
--     una por correo y semana ISO.
--   • Destino de correo por código (vinculación estricta) y marcas de envío.
--   • activate_code_grant(): activación transaccional de código ODS.
--   • revoke_invite_code(): revocación de un código individual en cascada.
--
-- Alcance: el flag vive en `municipalities.grant_mode` (DEFAULT 'open'),
-- así que el resto de municipios mantiene el comportamiento actual.
-- Esta migración activa el modo 'grant' únicamente para Villafranca.
--
-- Idempotente: ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS /
-- CREATE OR REPLACE FUNCTION, y UPDATE con guard de igualdad.
-- ============================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Modo de acceso por municipio + activación SOLO para Villafranca
-- ---------------------------------------------------------------------------

ALTER TABLE public.municipalities
  ADD COLUMN IF NOT EXISTS grant_mode text NOT NULL DEFAULT 'open';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'municipalities_grant_mode_check'
  ) THEN
    ALTER TABLE public.municipalities
      ADD CONSTRAINT municipalities_grant_mode_check
      CHECK (grant_mode IN ('open', 'grant'));
  END IF;
END $$;

COMMENT ON COLUMN public.municipalities.grant_mode IS
  'open: el ciudadano ve todas las apps publicadas del municipio (comportamiento histórico). grant: solo ve las apps con concesión activa (programa ODS).';

-- Nota: el slug de Villafranca existe en producción en dos variantes
-- ('villafranca-de-los-barros' canónico y 'villafrancadelosbarros', drift
-- documentada en 046). Se activa el modo grant en ambas, por si la fila
-- canónica no existe o reaparece la variante sin guiones.
UPDATE public.municipalities
   SET grant_mode = 'grant'
 WHERE slug IN ('villafranca-de-los-barros', 'villafrancadelosbarros')
   AND grant_mode <> 'grant';

-- ---------------------------------------------------------------------------
-- 2. Destino de correo y envío en municipal_invite_codes
-- ---------------------------------------------------------------------------

ALTER TABLE public.municipal_invite_codes
  ADD COLUMN IF NOT EXISTS destination_email_hash text,
  ADD COLUMN IF NOT EXISTS destination_email_encrypted text,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS municipal_invite_codes_destination_idx
  ON public.municipal_invite_codes(municipality_id, destination_email_hash);

COMMENT ON COLUMN public.municipal_invite_codes.destination_email_hash IS
  'HMAC del correo destino del programa ODS. Un código solo puede activarse con el correo cuyo hash coincida. NULL = sin destino asignado (flujo clásico).';
COMMENT ON COLUMN public.municipal_invite_codes.destination_email_encrypted IS
  'Correo destino cifrado en reposo (AES-256-GCM con ODS_DESTINATION_KEY). Solo para reenvíos/gestión; la verificación usa el hash.';
COMMENT ON COLUMN public.municipal_invite_codes.sent_at IS
  'Momento del primer envío correcto del código por correo. NULL = pendiente de envío.';

-- ---------------------------------------------------------------------------
-- 3. Participaciones semanales ODS (una por correo y semana ISO)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ods_weekly_participations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id uuid NOT NULL REFERENCES public.municipalities(id) ON DELETE CASCADE,
  week_monday date NOT NULL,
  email_hash text NOT NULL,
  ods_code integer CHECK (ods_code BETWEEN 1 AND 17),
  idea_title text,
  batch_id uuid REFERENCES public.municipal_invite_batches(id) ON DELETE SET NULL,
  code_id uuid REFERENCES public.municipal_invite_codes(id) ON DELETE SET NULL,
  registered_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (municipality_id, week_monday, email_hash)
);

CREATE INDEX IF NOT EXISTS ods_weekly_participations_lookup_idx
  ON public.ods_weekly_participations(municipality_id, week_monday, email_hash);

COMMENT ON TABLE public.ods_weekly_participations IS
  'Participaciones del programa ODS: una tarjeta (correo) por semana ISO y municipio. week_monday es el lunes de la semana ISO en Europe/Madrid.';

-- ---------------------------------------------------------------------------
-- 4. Concesiones de acceso usuario→app
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_app_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  municipality_id uuid NOT NULL REFERENCES public.municipalities(id) ON DELETE CASCADE,
  source_code_id uuid REFERENCES public.municipal_invite_codes(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, application_id)
);

CREATE INDEX IF NOT EXISTS user_app_grants_user_active_idx
  ON public.user_app_grants(user_id)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS user_app_grants_municipality_idx
  ON public.user_app_grants(municipality_id, application_id);
CREATE INDEX IF NOT EXISTS user_app_grants_source_code_idx
  ON public.user_app_grants(source_code_id)
  WHERE source_code_id IS NOT NULL;

COMMENT ON TABLE public.user_app_grants IS
  'Concesiones de acceso del programa ODS: una fila por usuario y aplicación. UNIQUE(user_id, application_id) garantiza que una app no se conceda dos veces.';

-- ---------------------------------------------------------------------------
-- 5. RLS: sin políticas públicas → solo service_role (mismo patrón que 051)
-- ---------------------------------------------------------------------------

ALTER TABLE public.ods_weekly_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_app_grants ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 6. Helpers de semana ISO (Europe/Madrid)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ods_week_monday(p_at timestamptz DEFAULT now())
RETURNS date
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
  SELECT (date_trunc('week', (p_at AT TIME ZONE 'Europe/Madrid')::date))::date
$$;

COMMENT ON FUNCTION public.ods_week_monday(timestamptz) IS
  'Lunes de la semana ISO (Europe/Madrid) de un instante dado. Definición única de "semana" del programa ODS.';

-- ---------------------------------------------------------------------------
-- 7. activate_code_grant(): activación transaccional de un código ODS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.activate_code_grant(
  p_code_hash text,
  p_email_hash text,
  p_user_id uuid,
  p_application_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code public.municipal_invite_codes%ROWTYPE;
  v_user_municipality uuid;
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

  -- 6. La app debe estar publicada y activa en el municipio
  IF NOT EXISTS (
    SELECT 1
      FROM public.municipality_applications AS ma
      JOIN public.applications AS a ON a.id = ma.application_id
     WHERE ma.municipality_id = v_code.municipality_id
       AND ma.application_id = p_application_id
       AND ma.activa
       AND ma.publication_status = 'publicada'
       AND a.activa
  ) THEN
    RAISE EXCEPTION 'APP_NOT_AVAILABLE' USING ERRCODE = '22023';
  END IF;

  -- 7. Regla semanal: una sola concesión nueva por semana ISO
  IF EXISTS (
    SELECT 1
      FROM public.user_app_grants
     WHERE user_id = p_user_id
       AND revoked_at IS NULL
       AND ods_week_monday(granted_at) = ods_week_monday(now())
  ) THEN
    RAISE EXCEPTION 'WEEKLY_LIMIT_REACHED' USING ERRCODE = '22023';
  END IF;

  -- 8. La app elegida no debe estar ya concedida (regla "app distinta")
  IF EXISTS (
    SELECT 1
      FROM public.user_app_grants
     WHERE user_id = p_user_id
       AND application_id = p_application_id
       AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'APP_ALREADY_GRANTED' USING ERRCODE = '22023';
  END IF;

  -- 9. Consumir el código
  UPDATE public.municipal_invite_codes
     SET estado = 'consumido',
         consumed_by = p_user_id,
         consumed_at = now(),
         reserved_until = NULL
   WHERE id = v_code.id;

  -- 10. Crear la concesión (misma transacción)
  INSERT INTO public.user_app_grants
    (user_id, application_id, municipality_id, source_code_id, expires_at)
  VALUES
    (p_user_id, p_application_id, v_code.municipality_id, v_code.id, v_code.expires_at)
  ON CONFLICT (user_id, application_id) DO NOTHING;

  RETURN p_application_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. revoke_invite_code(): revocar un código individual y su concesión
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.revoke_invite_code(p_code_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.municipal_invite_codes
     SET estado = 'revocado',
         reservation_token = NULL,
         reserved_until = NULL,
         reserved_email_hash = NULL
   WHERE id = p_code_id
     AND estado <> 'revocado';

  UPDATE public.user_app_grants
     SET revoked_at = now()
   WHERE source_code_id = p_code_id
     AND revoked_at IS NULL;
END;
$$;

-- Grants explícitos (igual que 051): solo service_role ejecuta
REVOKE ALL ON FUNCTION public.activate_code_grant(text, text, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_invite_code(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ods_week_monday(timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_code_grant(text, text, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_invite_code(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.ods_week_monday(timestamptz) TO service_role;

COMMENT ON FUNCTION public.activate_code_grant(text, text, uuid, uuid) IS
  'Activa un código ODS y concede acceso a una app: valida correo destino, caducidad, publicación de la app, límite semanal ISO y app no repetida; todo en una transacción.';
COMMENT ON FUNCTION public.revoke_invite_code(uuid) IS
  'Revoca un código municipal individual y retira la concesión de acceso que generó.';

COMMIT;
