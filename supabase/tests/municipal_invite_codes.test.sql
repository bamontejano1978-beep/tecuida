-- TE CUIDA - pgTAP tests for one-time municipal access codes (migration 051)

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT * FROM no_plan();

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role)
VALUES (
  '44444444-0051-0000-0000-000000000004',
  'resident@test.com',
  '',
  now(),
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.municipalities (
  id, slug, nombre_municipio, nombre_ayuntamiento, dominio,
  modulos_activos, estado_suscripcion, invite_codes_required
)
VALUES (
  '11111111-0051-0000-0000-000000000001',
  'invite-test',
  'Municipio Test',
  'Ayuntamiento Test',
  'invite-test.tecuida.group',
  ARRAY['marketplace']::text[],
  'activa',
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.municipal_invite_batches (
  id, municipality_id, nombre, cantidad, expires_at
)
VALUES (
  '22222222-0051-0000-0000-000000000002',
  '11111111-0051-0000-0000-000000000001',
  'Lote de prueba',
  1,
  now() + interval '7 days'
);

INSERT INTO public.municipal_invite_codes (
  id, batch_id, municipality_id, code_hash, code_prefix, expires_at
)
VALUES (
  '33333333-0051-0000-0000-000000000003',
  '22222222-0051-0000-0000-000000000002',
  '11111111-0051-0000-0000-000000000001',
  repeat('a', 64),
  'VI-TEST',
  now() + interval '7 days'
);

SELECT is(
  (
    SELECT count(*)::integer
      FROM public.reserve_municipal_invite_code(
        '99999999-0051-0000-0000-000000000009',
        repeat('a', 64),
        repeat('b', 64)
      )
  ),
  0,
  'a code cannot be reserved for a different municipality'
);

SELECT is(
  (
    SELECT count(*)::integer
      FROM public.reserve_municipal_invite_code(
        '11111111-0051-0000-0000-000000000001',
        repeat('a', 64),
        repeat('b', 64)
      )
  ),
  1,
  'an available code can be reserved once'
);

SELECT is(
  (
    SELECT estado
      FROM public.municipal_invite_codes
     WHERE id = '33333333-0051-0000-0000-000000000003'
  ),
  'reservado',
  'reserving changes the code status'
);

SELECT is(
  (
    SELECT count(*)::integer
      FROM public.reserve_municipal_invite_code(
        '11111111-0051-0000-0000-000000000001',
        repeat('a', 64),
        repeat('b', 64)
      )
  ),
  0,
  'a live reservation cannot be reserved a second time'
);

SELECT lives_ok(
  $$
    SELECT public.finalize_municipal_invite_registration(
      (
        SELECT reservation_token
          FROM public.municipal_invite_codes
         WHERE id = '33333333-0051-0000-0000-000000000003'
      ),
      '44444444-0051-0000-0000-000000000004',
      'Resident@Test.com',
      repeat('b', 64),
      'residente',
      NULL,
      NULL
    )
  $$,
  'finalizing the reservation creates the municipal profile atomically'
);

SELECT is(
  (
    SELECT municipality_id
      FROM public.users
     WHERE id = '44444444-0051-0000-0000-000000000004'
  ),
  '11111111-0051-0000-0000-000000000001'::uuid,
  'the user is linked to the municipality encoded by the code'
);

SELECT is(
  (
    SELECT residency_status
      FROM public.users
     WHERE id = '44444444-0051-0000-0000-000000000004'
  ),
  'code_verified',
  'the profile records code-based residency verification'
);

SELECT is(
  (
    SELECT estado
      FROM public.municipal_invite_codes
     WHERE id = '33333333-0051-0000-0000-000000000003'
  ),
  'consumido',
  'finalization consumes the code'
);

SELECT is(
  (
    SELECT consumed_by
      FROM public.municipal_invite_codes
     WHERE id = '33333333-0051-0000-0000-000000000003'
  ),
  '44444444-0051-0000-0000-000000000004'::uuid,
  'the consumed code records its user'
);

SELECT lives_ok(
  $$
    SELECT public.finalize_municipal_invite_registration(
      (
        SELECT reservation_token
          FROM public.municipal_invite_codes
         WHERE id = '33333333-0051-0000-0000-000000000003'
      ),
      '44444444-0051-0000-0000-000000000004',
      'resident@test.com',
      repeat('b', 64),
      'residente',
      NULL,
      NULL
    )
  $$,
  'finalization is idempotent for the same user'
);

SELECT * FROM finish();

ROLLBACK;
