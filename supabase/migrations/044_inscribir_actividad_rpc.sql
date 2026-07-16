-- ===========================================================================
-- TE CUIDA — 044: RPC atómico de inscripción + cancelación (Fase 2)
-- ===========================================================================
-- Reemplaza la implementación TS en Node por funciones plpgsql que viven en
-- el servidor de Postgres, garantizando:
--
--   1. ATOMICIDAD REAL — El UPDATE del contador (plazas_inscritas += 1) y el
--      INSERT en activity_inscriptions ocurren dentro de la misma transacción.
--      Si cualquier paso falla, ROLLBACK automático: jamás quedará una plaza
--      consumida sin inscripción (ni viceversa).
--
--   2. CHECK AFORO ATÓMICO — El "plazas_inscritas < aforo" se aplica en el
--      propio WHERE del UPDATE; sin lectura previa. RETURNING vacío == lleno.
--
--   3. TENANT GATE en DB — Compara users.municipality_id con activities.
--      municipality_id antes de cualquier escritura. Bloquea inscripción
--      cruzada desde la API o el SQL directo, defense-in-depth al lado del
--      checkTenantAccess() del application layer.
--
--   4. EMAIL-SESIÓN MATCH — El email del body DEBE coincidir (lowercase) con
--      users.email del auth.uid(). Evita que un usuario inscriba a otro con
--      un email arbitrario.
--
--   5. SECURITY DEFINER + search_path = public — Necesario porque:
--        a) usuarios autenticados no pueden modificar activities.plazas_inscritas
--           directamente (no hay policy de UPDATE sobre `activities`).
--        b) El match contra public.users se hace bypassing RLS del propio
--           usuario (necesario para leer municipality_id con consistencia).
--      search_path blindado contra search_path hijacking.
--
-- ERRORES (códigos predecibles, prefijos INSC_*):
--   INSC_NO_AUTH              → 401  no hay sesión
--   INSC_NO_PROFILE           → 403  usuario sin fila en public.users
--   INSC_EMAIL_MISMATCH       → 400  email body vs sesión no coinciden
--   INSC_NOT_FOUND            → 404  actividad no existe
--   INSC_CROSS_TENANT         → 403  actividad de otro municipio
--   INSC_NOT_PUBLISHED        → 400  actividad no acepta inscripciones
--   INSC_FULL                 → 400  aforo completo
--   INSC_DUPLICATE            → 409  ya existe inscripción activa (UNIQUE INDEX)
--   INSC_ALREADY_CANCELLED    → 400  inscripción ya estaba cancelada
--   INSC_NOT_INSCRIBED        → 404  intento de cancelar sin inscripción activa
-- ===========================================================================

BEGIN;

-- ===========================================================================
-- 1. inscribir_actividad()
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.inscribir_actividad(
  p_activity_id uuid,
  p_email        text,
  p_nombre       text DEFAULT NULL,
  p_notas        text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id              uuid;
  v_user_email           text;
  v_user_municipality    uuid;
  v_activity_estado      text;
  v_activity_aforo       integer;
  v_activity_plazas      integer;
  v_activity_municipality uuid;
  v_inscription_id       uuid;
  v_inscription_estado   text;
  v_new_plazas           integer;
BEGIN
  -- ── Autenticación ─────────────────────────────────────────────────────
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'INSC_NO_AUTH' USING ERRCODE = '42501';
  END IF;

  -- ── Perfil + email match ───────────────────────────────────────────────
  SELECT email, municipality_id
    INTO v_user_email, v_user_municipality
  FROM public.users
  WHERE id = v_user_id;

  IF v_user_municipality IS NULL THEN
    RAISE EXCEPTION 'INSC_NO_PROFILE' USING ERRCODE = '42501';
  END IF;

  IF LOWER(COALESCE(p_email, '')) <> LOWER(COALESCE(v_user_email, '')) THEN
    RAISE EXCEPTION 'INSC_EMAIL_MISMATCH' USING ERRCODE = '22023';
  END IF;

  -- ── Actividad: existencia, tenant, estado ─────────────────────────────
  SELECT estado, aforo, plazas_inscritas, municipality_id
    INTO v_activity_estado, v_activity_aforo, v_activity_plazas, v_activity_municipality
  FROM public.activities
  WHERE id = p_activity_id;

  IF NOT FOUND OR v_activity_municipality IS NULL THEN
    RAISE EXCEPTION 'INSC_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_activity_municipality <> v_user_municipality THEN
    RAISE EXCEPTION 'INSC_CROSS_TENANT' USING ERRCODE = '42501';
  END IF;

  IF v_activity_estado <> 'publicada' THEN
    RAISE EXCEPTION 'INSC_NOT_PUBLISHED' USING ERRCODE = 'P0001';
  END IF;

  -- Bloquea la fila previa, si existe. Esto serializa reactivaciones y
  -- cancelaciones simultáneas del mismo usuario/actividad.
  SELECT id, estado INTO v_inscription_id, v_inscription_estado
  FROM public.activity_inscriptions
  WHERE activity_id = p_activity_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF FOUND AND v_inscription_estado = 'confirmada' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'inscription_id', v_inscription_id,
      'plazas_inscritas', v_activity_plazas,
      'was_reactivation', false,
      'was_duplicate', true
    );
  END IF;

  -- Reactivar una cancelación vuelve a ocupar plaza y respeta el aforo.
  IF v_inscription_id IS NOT NULL AND v_inscription_estado = 'cancelada' THEN
    UPDATE public.activities
      SET plazas_inscritas = plazas_inscritas + 1,
          updated_at       = now()
      WHERE id = p_activity_id
        AND estado = 'publicada'
        AND (aforo IS NULL OR plazas_inscritas < aforo)
    RETURNING plazas_inscritas INTO v_new_plazas;

    IF NOT FOUND THEN
      SELECT plazas_inscritas, aforo, estado
        INTO v_activity_plazas, v_activity_aforo, v_activity_estado
      FROM public.activities
      WHERE id = p_activity_id;

      IF v_activity_aforo IS NOT NULL
         AND v_activity_plazas >= v_activity_aforo THEN
        RAISE EXCEPTION 'INSC_FULL' USING ERRCODE = 'P0001';
      END IF;

      RAISE EXCEPTION 'INSC_NOT_PUBLISHED' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.activity_inscriptions
    SET estado = 'confirmada',
        notas  = p_notas,
        nombre = COALESCE(nombre, NULLIF(TRIM(p_nombre), '')),
        email  = LOWER(p_email)
    WHERE id = v_inscription_id;

    RETURN jsonb_build_object(
      'ok', true,
      'inscription_id', v_inscription_id,
      'plazas_inscritas', v_new_plazas,
      'was_reactivation', true,
      'was_duplicate', false
    );
  END IF;

  -- ── NUEVA INSCRIPCIÓN: atomicidad UPDATE-contador + INSERT en la
  --    misma transacción (RAISE EXCEPTION => ROLLBACK automático).
  UPDATE public.activities
    SET plazas_inscritas = plazas_inscritas + 1,
        updated_at       = now()
    WHERE id = p_activity_id
      AND estado = 'publicada'
      AND (aforo IS NULL OR plazas_inscritas < aforo)
  RETURNING plazas_inscritas INTO v_new_plazas;

  IF NOT FOUND THEN
    -- Re-leer para distinguir "aforo lleno" de "estado cambió" / "race"
    SELECT plazas_inscritas, aforo, estado
      INTO v_activity_plazas, v_activity_aforo, v_activity_estado
    FROM public.activities
    WHERE id = p_activity_id;

    IF v_activity_aforo IS NOT NULL
       AND v_activity_plazas >= v_activity_aforo THEN
      RAISE EXCEPTION 'INSC_FULL' USING ERRCODE = 'P0001';
    END IF;

    RAISE EXCEPTION 'INSC_NOT_PUBLISHED' USING ERRCODE = 'P0001';
  END IF;

  -- INSERT. Si el UNIQUE INDEX (activity_id,user_id) WHERE user_id NOT NULL
  -- dispara (race con otro INSERT concurrente del mismo user), RAISE → ROLLBACK
  -- automático del UPDATE anterior: plazas_inscritas no queda sobrecontado.
  INSERT INTO public.activity_inscriptions
    (activity_id, municipality_id, user_id, email, nombre, notas, estado)
  VALUES
    (p_activity_id, v_user_municipality, v_user_id, LOWER(p_email),
     NULLIF(TRIM(p_nombre), ''), p_notas, 'confirmada')
  RETURNING id INTO v_inscription_id;

  RETURN jsonb_build_object(
    'ok', true,
    'inscription_id', v_inscription_id,
    'plazas_inscritas', v_new_plazas,
    'was_reactivation', false,
    'was_duplicate', false
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Defensa última por si hubo un INSERT fugitivo entre los SELECTs de
    -- idempotencia/reactivación y el UPDATE-atómico.
    RAISE EXCEPTION 'INSC_DUPLICATE' USING ERRCODE = '23505';
END;
$$;

COMMENT ON FUNCTION public.inscribir_actividad(uuid, text, text, text) IS
  'Inscribe atómicamente al usuario actual (auth.uid()) en una actividad del mismo municipio. Actualiza plazas_inscritas + INSERT en UN solo transacción (RAISE => ROLLBACK atómico). Devuelve jsonb con { ok, inscription_id, plazas_inscritas, was_reactivation, was_duplicate } o códigos de error prefijados INSC_*.';

-- ===========================================================================
-- 2. cancelar_inscripcion_atomic()
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.cancelar_inscripcion_atomic(
  p_activity_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        uuid;
  v_inscription_id uuid;
  v_new_plazas     integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'INSC_NO_AUTH' USING ERRCODE = '42501';
  END IF;

  -- Gate atómico: solo una cancelación concurrente puede cambiar el estado
  -- y, por tanto, llegar al decremento de plazas.
  UPDATE public.activity_inscriptions
  SET estado = 'cancelada'
  WHERE activity_id = p_activity_id
    AND user_id = v_user_id
    AND estado = 'confirmada'
  RETURNING id INTO v_inscription_id;

  IF NOT FOUND THEN
    -- Distinguimos "ya cancelada" vs "nunca inscrito"
    PERFORM 1
    FROM public.activity_inscriptions
    WHERE activity_id = p_activity_id
      AND user_id = v_user_id
      AND estado = 'cancelada';

    IF FOUND THEN
      RAISE EXCEPTION 'INSC_ALREADY_CANCELLED' USING ERRCODE = 'P0001';
    END IF;

    RAISE EXCEPTION 'INSC_NOT_INSCRIBED' USING ERRCODE = 'P0002';
  END IF;

  -- Decremento seguro: GREATEST evita underflow si ya estaba en 0
  UPDATE public.activities
    SET plazas_inscritas = GREATEST(0, plazas_inscritas - 1),
        updated_at       = now()
    WHERE id = p_activity_id
  RETURNING plazas_inscritas INTO v_new_plazas;

  RETURN jsonb_build_object(
    'ok', true,
    'inscription_id', v_inscription_id,
    'plazas_inscritas', v_new_plazas
  );
END;
$$;

COMMENT ON FUNCTION public.cancelar_inscripcion_atomic(uuid) IS
  'Cancela atómicamente la inscripción activa del usuario actual. Decrementa plazas_inscritas con GREATEST(0, n-1) en la misma transacción.';

-- ===========================================================================
-- 3. GRANT EXECUTE — solo a authenticated; auth.uid() es el gate
-- ===========================================================================

REVOKE ALL ON FUNCTION public.inscribir_actividad(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancelar_inscripcion_atomic(uuid)             FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.inscribir_actividad(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_inscripcion_atomic(uuid)             TO authenticated;

-- ===========================================================================
-- 4. Log informativo
-- ===========================================================================

DO $$
BEGIN
  RAISE NOTICE '[038_inscribir_actividad] ✅ RPC inscribir_actividad() y cancelar_inscripcion_atomic() creados.';
  RAISE NOTICE '[038_inscribir_actividad] ✅ Atomicidad vía transacción plpgsql (RAISE => ROLLBACK).';
  RAISE NOTICE '[038_inscribir_actividad] ✅ Grados de defensa: tenant match en DB + email match + SECURITY DEFINER.';
  RAISE NOTICE '[038_inscribir_actividad] ⚠️  Tras aplicar: la lógica TypeScript equivalente en lib/admin/activities.ts pasa a ser un thin-wrapper sobre .rpc() — ver código cliente.';
END $$;

COMMIT;
