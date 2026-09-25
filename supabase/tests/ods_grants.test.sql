-- TE CUIDA - pgTAP tests for ODS grants (migration 068)
-- Programa ODS Villafranca: activate_code_grant, weekly rule, revoke cascade.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT * FROM no_plan();

-- ---------------------------------------------------------------------------
-- Fixtures: municipio en modo grant, app asignada + otra no asignada,
-- usuario ciudadano, lote con dos códigos con destino.
-- ---------------------------------------------------------------------------

INSERT INTO public.municipalities (
  id, slug, nombre_municipio, nombre_ayuntamiento, dominio,
  modulos_activos, estado_suscripcion, invite_codes_required, grant_mode
)
VALUES (
  '11111111-0068-0000-0000-000000000001',
  'ods-test',
  'Municipio ODS',
  'Ayuntamiento ODS',
  'ods-test.tecuida.group',
  ARRAY['marketplace']::text[],
  'activa',
  true,
  'grant'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id, nombre) VALUES
  ('55555555-0068-0000-0000-000000000005', 'Bienestar')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.applications (id, category_id, nombre, tipo, activa, app_slug) VALUES
  ('22222222-0068-0000-0000-000000000002', '55555555-0068-0000-0000-000000000005', 'App ODS Uno', 'herramienta', true, 'ods-uno'),
  ('22222222-0068-0000-0000-000000000003', '55555555-0068-0000-0000-000000000005', 'App ODS Dos', 'herramienta', true, 'ods-dos'),
  ('22222222-0068-0000-0000-000000000004', '55555555-0068-0000-0000-000000000005', 'App No Asignada', 'herramienta', true, 'ods-no-asignada')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.municipality_applications (municipality_id, application_id, activa, publication_status)
VALUES
  ('11111111-0068-0000-0000-000000000001', '22222222-0068-0000-0000-000000000002', true, 'publicada'),
  ('11111111-0068-0000-0000-000000000001', '22222222-0068-0000-0000-000000000003', true, 'publicada')
ON CONFLICT (municipality_id, application_id) DO NOTHING;

INSERT INTO public.municipal_invite_batches (id, municipality_id, nombre, cantidad, expires_at, proposito)
VALUES
  ('66666666-0068-0000-0000-000000000006', '11111111-0068-0000-0000-000000000001', 'Lote ODS semana 1', 2, now() + interval '30 days', 'ods');

INSERT INTO public.municipal_invite_codes (
  id, batch_id, municipality_id, code_hash, code_prefix, expires_at,
  destination_email_hash, destination_email_encrypted
) VALUES
  ('33333333-0068-0000-0000-000000000003',
   '66666666-0068-0000-0000-000000000006',
   '11111111-0068-0000-0000-000000000001',
   repeat('c', 64), 'ODS-TEST', now() + interval '30 days',
   repeat('d', 64), 'encrypted:ana@test.com'),
  ('33333333-0068-0000-0000-000000000013',
   '66666666-0068-0000-0000-000000000006',
   '11111111-0068-0000-0000-000000000001',
   repeat('e', 64), 'ODS-TEST', now() + interval '30 days',
   repeat('f', 64), 'encrypted:luis@test.com');

-- users.id referencia auth.users (FK): seedear primero las identidades.
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role)
VALUES
  ('44444444-0068-0000-0000-000000000004', 'ana@test.com',  '', now(), 'authenticated'),
  ('44444444-0068-0000-0000-000000000014', 'luis@test.com', '', now(), 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, municipality_id, email, rol, residency_status, residency_method)
VALUES
  ('44444444-0068-0000-0000-000000000004',
   '11111111-0068-0000-0000-000000000001',
   'ana@test.com', 'ciudadano', 'legacy_verified', 'legacy'),
  ('44444444-0068-0000-0000-000000000014',
   '11111111-0068-0000-0000-000000000001',
   'luis@test.com', 'ciudadano', 'legacy_verified', 'legacy');

-- ---------------------------------------------------------------------------
-- activate_code_grant
-- ---------------------------------------------------------------------------

SELECT throws_ok(
  $$
    SELECT public.activate_code_grant(
      repeat('c', 64), repeat('z', 64),
      '44444444-0068-0000-0000-000000000004',
      '22222222-0068-0000-0000-000000000002'
    )
  $$,
  '22023',
  'CODE_EMAIL_MISMATCH',
  'the code cannot be activated with a different email than its destination'
);

SELECT throws_ok(
  $$
    SELECT public.activate_code_grant(
      repeat('X', 64), repeat('d', 64),
      '44444444-0068-0000-0000-000000000004',
      '22222222-0068-0000-0000-000000000002'
    )
  $$,
  '22023',
  'CODE_NOT_FOUND',
  'an unknown code hash is rejected'
);

SELECT throws_ok(
  $$
    SELECT public.activate_code_grant(
      repeat('c', 64), repeat('d', 64),
      '44444444-0068-0000-0000-000000000004',
      '22222222-0068-0000-0000-000000000004'::uuid
    )
  $$,
  '22023',
  'APP_NOT_AVAILABLE',
  'an app not assigned to the municipality cannot be granted'
);

SELECT is(
  public.activate_code_grant(
    repeat('c', 64), repeat('d', 64),
    '44444444-0068-0000-0000-000000000004',
    '22222222-0068-0000-0000-000000000002'
  ),
  '22222222-0068-0000-0000-000000000002'::uuid,
  'the destination email activates the code and grants the chosen app'
);

SELECT is(
  (SELECT estado FROM public.municipal_invite_codes WHERE id = '33333333-0068-0000-0000-000000000003'),
  'consumido',
  'activation consumes the code'
);

SELECT is(
  (SELECT consumed_by FROM public.municipal_invite_codes WHERE id = '33333333-0068-0000-0000-000000000003'),
  '44444444-0068-0000-0000-000000000004'::uuid,
  'the consumed code records its user'
);

SELECT is(
  (
    SELECT count(*)::integer
      FROM public.user_app_grants
     WHERE user_id = '44444444-0068-0000-0000-000000000004'
       AND application_id = '22222222-0068-0000-0000-000000000002'
       AND revoked_at IS NULL
  ),
  1,
  'the grant is created active'
);

SELECT is(
  public.activate_code_grant(
    repeat('c', 64), repeat('d', 64),
    '44444444-0068-0000-0000-000000000004',
    '22222222-0068-0000-0000-000000000003'
  ),
  '22222222-0068-0000-0000-000000000002'::uuid,
  're-activating a consumed code is idempotent and returns the original app'
);

SELECT throws_ok(
  $$
    SELECT public.activate_code_grant(
      repeat('c', 64), repeat('d', 64),
      '44444444-0068-0000-0000-000000000014',
      '22222222-0068-0000-0000-000000000002'
    )
  $$,
  '22023',
  'CODE_NOT_ACTIVE',
  'another user cannot activate a code consumed by someone else'
);

-- Semana 1 de Luis: activa su código con la segunda app.
SELECT is(
  public.activate_code_grant(
    repeat('e', 64), repeat('f', 64),
    '44444444-0068-0000-0000-000000000014',
    '22222222-0068-0000-0000-000000000003'
  ),
  '22222222-0068-0000-0000-000000000003'::uuid,
  'a second citizen activates a different app the same week'
);

-- La misma semana, Luis no puede activar un segundo código (weekly limit).
INSERT INTO public.municipal_invite_codes (
  id, batch_id, municipality_id, code_hash, code_prefix, expires_at,
  destination_email_hash
) VALUES
  ('33333333-0068-0000-0000-000000000023',
   '66666666-0068-0000-0000-000000000006',
   '11111111-0068-0000-0000-000000000001',
   repeat('g', 64), 'ODS-TEST', now() + interval '30 days',
   repeat('f', 64));

SELECT throws_ok(
  $$
    SELECT public.activate_code_grant(
      repeat('g', 64), repeat('f', 64),
      '44444444-0068-0000-0000-000000000014',
      '22222222-0068-0000-0000-000000000002'
    )
  $$,
  '22023',
  'WEEKLY_LIMIT_REACHED',
  'a second activation in the same ISO week is rejected'
);

-- Semana siguiente (forzada): Luis puede activar otra app distinta.
UPDATE public.user_app_grants
   SET granted_at = granted_at - interval '7 days'
 WHERE user_id = '44444444-0068-0000-0000-000000000014';

SELECT is(
  public.activate_code_grant(
    repeat('g', 64), repeat('f', 64),
    '44444444-0068-0000-0000-000000000014',
    '22222222-0068-0000-0000-000000000002'
  ),
  '22222222-0068-0000-0000-000000000002'::uuid,
  'next week the same citizen can activate a different app'
);

-- Y no puede repetir app ya concedida aunque sea otra semana.
INSERT INTO public.municipal_invite_codes (
  id, batch_id, municipality_id, code_hash, code_prefix, expires_at,
  destination_email_hash
) VALUES
  ('33333333-0068-0000-0000-000000000033',
   '66666666-0068-0000-0000-000000000006',
   '11111111-0068-0000-0000-000000000001',
   repeat('h', 64), 'ODS-TEST', now() + interval '30 days',
   repeat('f', 64));

UPDATE public.user_app_grants
   SET granted_at = granted_at - interval '14 days'
 WHERE user_id = '44444444-0068-0000-0000-000000000014'
   AND application_id = '22222222-0068-0000-0000-000000000003';

SELECT throws_ok(
  $$
    SELECT public.activate_code_grant(
      repeat('h', 64), repeat('f', 64),
      '44444444-0068-0000-0000-000000000014',
      '22222222-0068-0000-0000-000000000003'
    )
  $$,
  '22023',
  'APP_ALREADY_GRANTED',
  'an already granted app cannot be granted again in a later week'
);

-- ---------------------------------------------------------------------------
-- ods_weekly_participations: una por correo y semana
-- ---------------------------------------------------------------------------

INSERT INTO public.ods_weekly_participations (municipality_id, week_monday, email_hash, ods_code)
VALUES ('11111111-0068-0000-0000-000000000001', public.ods_week_monday(now()), repeat('d', 64), 11);

SELECT throws_ok(
  $$
    INSERT INTO public.ods_weekly_participations (municipality_id, week_monday, email_hash, ods_code)
    VALUES ('11111111-0068-0000-0000-000000000001', public.ods_week_monday(now()), repeat('d', 64), 12)
  $$,
  '23505',
  NULL,
  'the same email cannot participate twice in the same ISO week'
);

SELECT is(
  public.ods_week_monday('2026-09-16 12:00:00+02'::timestamptz),
  '2026-09-14'::date,
  'ods_week_monday returns the Monday of the ISO week'
);

-- ---------------------------------------------------------------------------
-- revoke_invite_code: revoca el código y retira su concesión
-- ---------------------------------------------------------------------------

SELECT lives_ok(
  $$ SELECT public.revoke_invite_code('33333333-0068-0000-0000-000000000013') $$,
  'revoking a single code succeeds'
);

SELECT is(
  (SELECT estado FROM public.municipal_invite_codes WHERE id = '33333333-0068-0000-0000-000000000013'),
  'revocado',
  'revocation marks the code as revocado'
);

SELECT is(
  (
    SELECT count(*)::integer
      FROM public.user_app_grants
     WHERE source_code_id = '33333333-0068-0000-0000-000000000013'
       AND revoked_at IS NULL
  ),
  0,
  'revocation retires the grant it produced'
);

-- ---------------------------------------------------------------------------
-- grant_mode: por defecto 'open' y Villafranca pasa a 'grant'
-- ---------------------------------------------------------------------------

SELECT is(
  (SELECT grant_mode FROM public.municipalities WHERE slug = 'ods-test'),
  'grant',
  'the fixture municipality keeps its explicit grant mode'
);

SELECT is(
  (SELECT grant_mode FROM public.municipalities WHERE slug = 'villafranca-de-los-barros'),
  'grant',
  'Villafranca de los Barros is switched to grant mode by the migration'
);

SELECT * FROM finish();

ROLLBACK;
