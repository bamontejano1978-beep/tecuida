-- TE CUIDA — 051: códigos municipales de acceso de un solo uso

BEGIN;

ALTER TABLE public.municipalities
  ADD COLUMN IF NOT EXISTS invite_codes_required boolean NOT NULL DEFAULT false;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS residency_status text NOT NULL DEFAULT 'legacy_verified',
  ADD COLUMN IF NOT EXISTS residency_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS residency_method text NOT NULL DEFAULT 'legacy';

UPDATE public.users
   SET residency_verified_at = COALESCE(residency_verified_at, created_at)
 WHERE residency_status = 'legacy_verified';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_residency_status_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_residency_status_check
      CHECK (residency_status IN ('legacy_verified', 'code_verified', 'open_registration'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.protect_user_municipal_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (
    NEW.municipality_id IS DISTINCT FROM OLD.municipality_id
    OR NEW.residency_status IS DISTINCT FROM OLD.residency_status
    OR NEW.residency_verified_at IS DISTINCT FROM OLD.residency_verified_at
    OR NEW.residency_method IS DISTINCT FROM OLD.residency_method
  ) THEN
    RAISE EXCEPTION 'USER_MUNICIPAL_IDENTITY_IMMUTABLE' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_municipal_identity_trigger ON public.users;
CREATE TRIGGER protect_user_municipal_identity_trigger
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.protect_user_municipal_identity();

CREATE TABLE IF NOT EXISTS public.municipal_invite_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id uuid NOT NULL REFERENCES public.municipalities(id) ON DELETE CASCADE,
  nombre text NOT NULL CHECK (char_length(nombre) BETWEEN 1 AND 100),
  cantidad integer NOT NULL CHECK (cantidad BETWEEN 1 AND 500),
  expires_at timestamptz,
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'revocado')),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.municipal_invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.municipal_invite_batches(id) ON DELETE CASCADE,
  municipality_id uuid NOT NULL REFERENCES public.municipalities(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  code_prefix text NOT NULL,
  estado text NOT NULL DEFAULT 'disponible'
    CHECK (estado IN ('disponible', 'reservado', 'consumido', 'revocado')),
  expires_at timestamptz,
  reservation_token uuid,
  reserved_until timestamptz,
  reserved_email_hash text,
  consumed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (municipality_id, code_hash)
);

CREATE INDEX IF NOT EXISTS municipal_invite_codes_lookup_idx
  ON public.municipal_invite_codes(municipality_id, code_hash, estado);
CREATE UNIQUE INDEX IF NOT EXISTS municipal_invite_codes_reservation_idx
  ON public.municipal_invite_codes(reservation_token)
  WHERE reservation_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS municipal_invite_batches_municipality_idx
  ON public.municipal_invite_batches(municipality_id, created_at DESC);

ALTER TABLE public.municipal_invite_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipal_invite_codes ENABLE ROW LEVEL SECURITY;

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

CREATE OR REPLACE FUNCTION public.release_municipal_invite_code(
  p_reservation_token uuid,
  p_email_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_released boolean;
BEGIN
  UPDATE public.municipal_invite_codes
     SET estado = 'disponible',
         reservation_token = NULL,
         reserved_until = NULL,
         reserved_email_hash = NULL
   WHERE reservation_token = p_reservation_token
     AND reserved_email_hash = p_email_hash
     AND estado = 'reservado';
  v_released := FOUND;
  RETURN v_released;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_municipal_invite_registration(
  p_reservation_token uuid,
  p_user_id uuid,
  p_email text,
  p_email_hash text,
  p_alias text DEFAULT NULL,
  p_genero text DEFAULT NULL,
  p_anio_nacimiento integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code public.municipal_invite_codes%ROWTYPE;
BEGIN
  SELECT * INTO v_code
    FROM public.municipal_invite_codes
   WHERE reservation_token = p_reservation_token
   FOR UPDATE;

  IF NOT FOUND OR v_code.reserved_email_hash IS DISTINCT FROM p_email_hash THEN
    RAISE EXCEPTION 'INVITE_INVALID' USING ERRCODE = '22023';
  END IF;

  IF v_code.estado = 'consumido' AND v_code.consumed_by = p_user_id THEN
    RETURN v_code.municipality_id;
  END IF;

  IF v_code.estado <> 'reservado' OR v_code.reserved_until <= now() THEN
    RAISE EXCEPTION 'INVITE_EXPIRED' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.users (
    id, municipality_id, email, alias, genero, anio_nacimiento,
    nombre, apellidos, rol, residency_status, residency_verified_at,
    residency_method
  ) VALUES (
    p_user_id, v_code.municipality_id, lower(p_email), NULLIF(p_alias, ''),
    p_genero, p_anio_nacimiento, NULL, NULL, 'ciudadano', 'code_verified',
    now(), 'municipal_invite_code'
  )
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (
    SELECT 1 FROM public.users
     WHERE id = p_user_id AND municipality_id = v_code.municipality_id
  ) THEN
    RAISE EXCEPTION 'INVITE_PROFILE_CONFLICT' USING ERRCODE = '23505';
  END IF;

  UPDATE public.municipal_invite_codes
     SET estado = 'consumido',
         consumed_by = p_user_id,
         consumed_at = now(),
         reserved_until = NULL
   WHERE id = v_code.id;

  RETURN v_code.municipality_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_municipal_invite_code(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_municipal_invite_code(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_municipal_invite_registration(uuid, uuid, text, text, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_municipal_invite_code(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_municipal_invite_code(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_municipal_invite_registration(uuid, uuid, text, text, text, text, integer) TO service_role;

COMMENT ON COLUMN public.municipalities.invite_codes_required IS
  'Exige un código municipal válido para crear nuevas cuentas ciudadanas.';
COMMENT ON TABLE public.municipal_invite_codes IS
  'Códigos municipales de un solo uso; solo se almacena su hash.';

COMMIT;
