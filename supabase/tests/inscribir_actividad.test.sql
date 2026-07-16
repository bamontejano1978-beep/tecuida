-- ===========================================================================
-- TE CUIDA — pgTAP tests para public.inscribir_actividad()
-- ===========================================================================
-- Tests de integración SQL del RPC atómico definido en
-- supabase/migrations/038_inscribir_actividad_rpc.sql.
--
-- Patrón general:
--   1. La transacción entera vive dentro de BEGIN/ROLLBACK, así que todas
--      las inserciones de seed se deshacen al final (autolimpieza).
--   2. `auth.uid()` se mockea vía `set_config('request.jwt.claims', ...)`
--      con `is_local=true` (3er arg) para que sólo viva en esta transacción.
--   3. Las carreras (concurrencia real) no se simulan: pgTAP single-session
--      no permite múltiples conexiones reales. En su lugar, “preparamos
--      el estado” (aforo lleno, inscripción previa, etc.) y verificamos que
--      el RPC responde correctamente. La defensa contra carreras viene del
--      diseño (UPDATE-WHERE atómico + UNIQUE INDEX) y se valida a través de
--      los invariantes de los tests.
--
-- Cómo ejecutar (runner TBD: se puede usar pg_prove o psql directo):
--   pg_prove -U postgres supabase/tests/inscribir_actividad.test.sql
--   #   ó
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/inscribir_actividad.test.sql
--
-- REQUISITOS:
--   - La extensión pgtap debe estar disponible (creada al inicio).
--   - El usuario que conecta debe tener permisos INSERT/UPDATE/DELETE sobre
--     `public.users`, `public.municipalities`, `auth.users`, etc. (típico
--     del rol `postgres` en CI / tests locales).
-- ===========================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

-- ───────────────────────────────────────────────────────────────────────
-- FIXTURES — Datos seed insertados al inicio.
--   Las UUIDs son fijas para poder referenciarlas en los tests sin
--   `SELECT * FROM no_plan_vars()`.
-- ───────────────────────────────────────────────────────────────────────

-- Helper: usernames reutilizables para evitar errores al re-ejecutar tests
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role)
VALUES
  ('00000000-0000-0000-0000-aaaaaaaaaaaa', 'alice@test.com',         '', now(), 'authenticated'),
  ('00000000-0000-0000-0000-bbbbbbbbbbbb', 'bob@test.com',           '', now(), 'authenticated'),
  ('00000000-0000-0000-0000-cccccccccccc', 'mallory@tenant-b.com',   '', now(), 'authenticated'),
  ('00000000-0000-0000-0000-dddddddddddd', 'no-profile@test.com',    '', now(), 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.municipalities (id, slug, nombre_municipio, nombre_ayuntamiento, dominio,
                                     modulos_activos, estado_suscripcion)
VALUES
  ('11111111-0000-0000-0000-000000000001', 'tenant-a', 'Tenant A', 'Ayto A', 'tenant-a.tecuida.group',
   ARRAY['marketplace']::text[], 'activa'),
  ('22222222-0000-0000-0000-000000000002', 'tenant-b', 'Tenant B', 'Ayto B', 'tenant-b.tecuida.group',
   ARRAY['marketplace']::text[], 'activa')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, municipality_id, email, alias, rol)
VALUES
  ('00000000-0000-0000-0000-aaaaaaaaaaaa', '11111111-0000-0000-0000-000000000001',
   'alice@test.com',         'alice',  'ciudadano'),
  ('00000000-0000-0000-0000-cccccccccccc', '22222222-0000-0000-0000-000000000002',
   'mallory@tenant-b.com',  'mallory','ciudadano')
ON CONFLICT (id) DO NOTHING;
-- NOTA: 'no-profile@test.com' existe en auth.users pero NO en public.users.
--   Eso permite testear el path INSC_NO_PROFILE.
-- bob existe en auth.users pero no lo usamos en los tests, sólo para evitar
--   errores de FK en escenarios donde aparezca como user_id.

INSERT INTO public.categories (id, nombre, descripcion, orden)
VALUES
  ('33333333-0000-0000-0000-000000000003', 'Salud', 'Categoría de salud', 1),
  ('44444444-0000-0000-0000-000000000004', 'Cultura', 'Categoría de cultura', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.professionals (id, municipality_id, nombre, tipo, email, estado)
VALUES
  ('55555555-0000-0000-0000-000000000005',
   '11111111-0000-0000-0000-000000000001',
   'Dra. Test', 'colegiado', 'dra@test.com', 'activo'),
  ('66666666-0000-0000-0000-000000000006',
   '22222222-0000-0000-0000-000000000002',
   'Sr. TenantB', 'profesional_autonomo', 'b@test.com', 'activo')
ON CONFLICT (id) DO NOTHING;

-- Actividades con diferentes estados/testigos
INSERT INTO public.activities
  (id, municipality_id, professional_id, category_id,
   nombre, descripcion, modalidad, fecha_inicio,
   aforo, plazas_inscritas, estado)
VALUES
  -- A1: tenant-A, publicada, aforo=2, 0 inscritos (happy path)
  ('77777777-0000-0000-0000-000000000007',
   '11111111-0000-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000005',
   '33333333-0000-0000-0000-000000000003',
   'Taller A1', 'Test', 'presencial', '2030-01-01',
   2, 0, 'publicada'),
  -- A2: tenant-A, BORRADOR (test del path INSC_NOT_PUBLISHED)
  ('77777777-0000-0000-0000-000000000008',
   '11111111-0000-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000005',
   '33333333-0000-0000-0000-000000000003',
   'Borrador',  'Test', 'presencial', '2030-01-01',
   NULL, 0, 'borrador'),
  -- A3: tenant-B, publicada (test del path INSC_CROSS_TENANT)
  ('77777777-0000-0000-0000-000000000009',
   '22222222-0000-0000-0000-000000000002',
   '66666666-0000-0000-0000-000000000006',
   '44444444-0000-0000-0000-000000000004',
   'Tenant-B', 'Test', 'presencial', '2030-01-01',
   5, 0, 'publicada')
ON CONFLICT (id) DO NOTHING;

-- Helper: setear el "current user" como Supabase lo haría.
-- `is_local=true` hace que el setting sólo viva en esta transacción.
CREATE OR REPLACE FUNCTION tests_set_auth(p_user_id uuid) RETURNS void AS $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text,
    true  -- is_local
  );
END;
$$ LANGUAGE plpgsql;

-- ───────────────────────────────────────────────────────────────────────
-- PLAN: sin conteo manual — `no_plan()` permite que pgTAP descubra el
-- número de assertions al ejecutar `finish()`. Preferible a `plan(N)` en
-- esta primera versión del archivo porque añadir tests no rompe la suite
-- por mismatch de conteo.
-- ───────────────────────────────────────────────────────────────────────
SELECT * FROM no_plan();

-- ───────────────────────────────────────────────────────────────────────
-- TEST 1: Happy path — primera inscripción consume 1 plaza
-- ───────────────────────────────────────────────────────────────────────
SELECT tests_set_auth('00000000-0000-0000-0000-aaaaaaaaaaaa'::uuid);

SELECT lives_ok(
  $$SELECT public.inscribir_actividad(
       '77777777-0000-0000-0000-000000000007'::uuid,
       'alice@test.com',
       'Alice',
       'Tengo alergia al polen.'
     )$$,
  'inscribir_actividad: nueva inscripción no debe lanzar excepción'
);

SELECT is(
  (SELECT plazas_inscritas FROM public.activities
    WHERE id = '77777777-0000-0000-0000-000000000007'::uuid),
  1,
  'plazas_inscritas se incrementa en 1 tras una inscripción exitosa'
);

SELECT is(
  (SELECT estado::text FROM public.activity_inscriptions
    WHERE activity_id = '77777777-0000-0000-0000-000000000007'::uuid
      AND user_id = '00000000-0000-0000-0000-aaaaaaaaaaaa'::uuid),
  'confirmada',
  'se crea una fila en activity_inscriptions con estado=confirmada'
);

-- ───────────────────────────────────────────────────────────────────────
-- TEST 2: Idempotente — llamar 2 veces no incrementa plaza
-- ───────────────────────────────────────────────────────────────────────
SELECT lives_ok(
  $$SELECT public.inscribir_actividad(
       '77777777-0000-0000-0000-000000000007'::uuid,
       'alice@test.com'
     )$$,
  'segunda llamada (idempotente) no debe lanzar excepción'
);

SELECT is(
  (SELECT plazas_inscritas FROM public.activities
    WHERE id = '77777777-0000-0000-0000-000000000007'::uuid),
  1,
  'idempotencia: plazas_inscritas NO se incrementa en la segunda llamada'
);

SELECT is(
  (SELECT (result->>'was_duplicate')::boolean
    FROM (SELECT public.inscribir_actividad(
            '77777777-0000-0000-0000-000000000007'::uuid,
            'alice@test.com') AS result) t),
  true,
  'idempotencia: segunda llamada devuelve was_duplicate=true'
);

-- ───────────────────────────────────────────────────────────────────────
-- TEST 3: Reactivación — cancelar + reinscribir vuelve a reservar una plaza
-- ───────────────────────────────────────────────────────────────────────
SELECT lives_ok(
  $$SELECT public.cancelar_inscripcion_atomic(
       '77777777-0000-0000-0000-000000000007'::uuid
     )$$,
  'cancelar_inscripcion_atomic: inscripción activa se cancela sin error'
);

SELECT is(
  (SELECT plazas_inscritas FROM public.activities
    WHERE id = '77777777-0000-0000-0000-000000000007'::uuid),
  0,
  'cancelar decrementa plazas_inscritas (a 0)'
);

SELECT is(
  (SELECT (result->>'was_reactivation')::boolean
    FROM (SELECT public.inscribir_actividad(
            '77777777-0000-0000-0000-000000000007'::uuid,
            'alice@test.com') AS result) t),
  true,
  'reactivación: llamada tras cancelar devuelve was_reactivation=true'
);

SELECT is(
  (SELECT plazas_inscritas FROM public.activities
    WHERE id = '77777777-0000-0000-0000-000000000007'::uuid),
  1,
  'reactivación: plazas_inscritas vuelve a 1'
);

-- Una reactivación también debe respetar el aforo disponible.
SELECT lives_ok(
  $$SELECT public.cancelar_inscripcion_atomic(
       '77777777-0000-0000-0000-000000000007'::uuid
     )$$,
  'preparación: cancelar antes de probar reactivación con aforo lleno'
);

UPDATE public.activities
   SET plazas_inscritas = aforo
 WHERE id = '77777777-0000-0000-0000-000000000007'::uuid;

SELECT throws_ok(
  $$SELECT public.inscribir_actividad(
       '77777777-0000-0000-0000-000000000007'::uuid,
       'alice@test.com'
     )$$,
  'P0001',
  'INSC_FULL',
  'reactivación con aforo lleno debe lanzar INSC_FULL'
);

SELECT is(
  (SELECT estado::text FROM public.activity_inscriptions
    WHERE activity_id = '77777777-0000-0000-0000-000000000007'::uuid
      AND user_id = '00000000-0000-0000-0000-aaaaaaaaaaaa'::uuid),
  'cancelada',
  'reactivación rechazada conserva la inscripción cancelada'
);

-- Restablecer el escenario base para el resto de la suite.
UPDATE public.activities
   SET plazas_inscritas = 0
 WHERE id = '77777777-0000-0000-0000-000000000007'::uuid;

SELECT lives_ok(
  $$SELECT public.inscribir_actividad(
       '77777777-0000-0000-0000-000000000007'::uuid,
       'alice@test.com'
     )$$,
  'restablecer inscripción confirmada tras la prueba de aforo'
);

-- ───────────────────────────────────────────────────────────────────────
-- TEST 4: INSC_NO_AUTH — sin setear request.jwt.claims
-- ───────────────────────────────────────────────────────────────────────
-- Limpiamos el setting local antes de cada test que lo necesite
PERFORM set_config('request.jwt.claims', NULL, true);

SELECT throws_ok(
  $$SELECT public.inscribir_actividad(
       '77777777-0000-0000-0000-000000000007'::uuid,
       'alice@test.com'
     )$$,
  '42501',
  'INSC_NO_AUTH',
  'sin sesión, inscribir debe lanzar INSC_NO_AUTH (SQLSTATE 42501)'
);

-- ───────────────────────────────────────────────────────────────────────
-- TEST 5: INSC_NO_PROFILE — auth.uid apunta a usuario sin fila en public.users
-- ───────────────────────────────────────────────────────────────────────
SELECT tests_set_auth('00000000-0000-0000-0000-dddddddddddd'::uuid);

SELECT throws_ok(
  $$SELECT public.inscribir_actividad(
       '77777777-0000-0000-0000-000000000007'::uuid,
       'no-profile@test.com'
     )$$,
  '42501',
  'INSC_NO_PROFILE',
  'auth.uid sin fila en public.users debe lanzar INSC_NO_PROFILE'
);

-- ───────────────────────────────────────────────────────────────────────
-- TEST 6: INSC_EMAIL_MISMATCH — sesión y body no coinciden
-- ───────────────────────────────────────────────────────────────────────
SELECT tests_set_auth('00000000-0000-0000-0000-aaaaaaaaaaaa'::uuid);

SELECT throws_ok(
  $$SELECT public.inscribir_actividad(
       '77777777-0000-0000-0000-000000000007'::uuid,
       'intruso@otro-dominio.com'
     )$$,
  '22023',
  'INSC_EMAIL_MISMATCH',
  'email body vs sesión no coinciden debe lanzar INSC_EMAIL_MISMATCH'
);

-- ───────────────────────────────────────────────────────────────────────
-- TEST 7: INSC_NOT_FOUND — uuid que no existe
-- ───────────────────────────────────────────────────────────────────────
SELECT tests_set_auth('00000000-0000-0000-0000-aaaaaaaaaaaa'::uuid);

SELECT throws_ok(
  $$SELECT public.inscribir_actividad(
       'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid,
       'alice@test.com'
     )$$,
  'P0002',
  'INSC_NOT_FOUND',
  'actividad inexistente debe lanzar INSC_NOT_FOUND (SQLSTATE P0002)'
);

-- ───────────────────────────────────────────────────────────────────────
-- TEST 8: INSC_CROSS_TENANT — usuario tenant-A intenta inscribir en actividad tenant-B
-- ───────────────────────────────────────────────────────────────────────
SELECT tests_set_auth('00000000-0000-0000-0000-aaaaaaaaaaaa'::uuid);

SELECT throws_ok(
  $$SELECT public.inscribir_actividad(
       '77777777-0000-0000-0000-000000000009'::uuid,
       'alice@test.com'
     )$$,
  '42501',
  'INSC_CROSS_TENANT',
  'inscripción cruzada de tenant debe lanzar INSC_CROSS_TENANT'
);

-- ───────────────────────────────────────────────────────────────────────
-- TEST 9: INSC_NOT_PUBLISHED — actividad en borrador
-- ───────────────────────────────────────────────────────────────────────
SELECT tests_set_auth('00000000-0000-0000-0000-aaaaaaaaaaaa'::uuid);

SELECT throws_ok(
  $$SELECT public.inscribir_actividad(
       '77777777-0000-0000-0000-000000000008'::uuid,
       'alice@test.com'
     )$$,
  'P0001',
  'INSC_NOT_PUBLISHED',
  'actividad en borrador debe lanzar INSC_NOT_PUBLISHED'
);

-- ───────────────────────────────────────────────────────────────────────
-- TEST 10: INSC_FULL — aforo agotado
-- ───────────────────────────────────────────────────────────────────────
-- Pre-condición: dejamos A1 con plazas_inscritas=2 (igual a aforo=2),
-- de modo que el UPDATE-WHERE del RPC no tiene match y lanza INSC_FULL.
UPDATE public.activities
   SET plazas_inscritas = 2
 WHERE id = '77777777-0000-0000-0000-000000000007'::uuid;

SELECT tests_set_auth('00000000-0000-0000-0000-aaaaaaaaaaaa'::uuid);

SELECT throws_ok(
  $$SELECT public.inscribir_actividad(
       '77777777-0000-0000-0000-000000000007'::uuid,
       'alice@test.com'
     )$$,
  'P0001',
  'INSC_FULL',
  'aforo completo debe lanzar INSC_FULL'
);

-- ───────────────────────────────────────────────────────────────────────
-- TEST 11: ATOMICIDAD (rollback verification) — INSC_FULL debe hacer
-- rollback completo: NO crear fila de inscripción fantasma, NO consumir
-- plaza. Estado PRE-TEST 10: 1 inscripción (la reactivada por TEST 3),
-- plazas_inscritas=2 (pre-llenado). Estado POST-TEST 10 (esperado): el
-- mismo: 1 inscripción, plazas_inscritas=2.
-- ───────────────────────────────────────────────────────────────────────
SELECT is(
  (SELECT COUNT(*)::int FROM public.activity_inscriptions
    WHERE activity_id = '77777777-0000-0000-0000-000000000007'::uuid
      AND user_id = '00000000-0000-0000-0000-aaaaaaaaaaaa'::uuid
      AND estado = 'confirmada'),
  1,
  'atomicidad: el INSERT fantasma de TEST 10 se rolled-back; sólo sobrevive la inscripción de TEST 3'
);

SELECT is(
  (SELECT plazas_inscritas FROM public.activities
    WHERE id = '77777777-0000-0000-0000-000000000007'::uuid),
  2,  -- sigue en 2 (no decrementado por el rollback)
  'atomicidad: plazas_inscritas NO cambia tras INSC_FULL (no consumido por rollback)'
);

-- ───────────────────────────────────────────────────────────────────────
-- Cleanup
-- ───────────────────────────────────────────────────────────────────────
-- `no_plan()` no requiere conteo manual; las definiciones de fixtures
-- se limpian automáticamente con el ROLLBACK final.
SELECT * FROM finish();

ROLLBACK;
