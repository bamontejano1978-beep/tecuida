import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '../tmp/citizen-verification/node_modules/@electric-sql/pglite/dist/index.js'

// Disposable PostgreSQL instance. This script never reads production credentials.
const db = new PGlite()
const user = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const app = user(101)
const municipality = user(201)
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
    CREATE TABLE public.users(id uuid PRIMARY KEY);
    CREATE TABLE public.applications(id uuid PRIMARY KEY, nombre text, activa boolean);
    CREATE TABLE public.municipality_applications(municipality_id uuid, application_id uuid, activa boolean);
    CREATE TABLE public.analytics_events(municipality_id uuid, user_id uuid, evento text, payload jsonb, created_at timestamptz DEFAULT now());
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO service_role;
  `)
  await db.exec(await readFile(new URL('../supabase/migrations/067_citizen_launcher_and_library_quality.sql', import.meta.url), 'utf8'))
  for (let n = 1; n <= 6; n++) await db.query('INSERT INTO users VALUES ($1)', [user(n)])
  await db.query('INSERT INTO applications VALUES ($1, $2, true)', [app, 'Aplicación de prueba'])
  await db.query('INSERT INTO municipality_applications VALUES ($1, $2, true)', [municipality, app])
  await db.exec('SET ROLE service_role')
  await db.query('SELECT set_application_favorite($1, $2, true)', [user(1), app])
  await db.query('SELECT record_application_open($1, $2)', [user(1), app])
  const state = (await db.query('SELECT * FROM user_application_state')).rows[0]
  assert.equal(state.favorite, true)
  assert.ok(state.last_opened_at)
  await db.query('SELECT set_application_favorite($1, $2, false)', [user(1), app])
  assert.ok((await db.query('SELECT * FROM user_application_state')).rows[0].last_opened_at)
  await db.exec('RESET ROLE; SET ROLE authenticated')
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [user(2)])
  assert.equal((await db.query('SELECT * FROM user_application_state')).rows.length, 0)
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [user(1)])
  assert.equal((await db.query('SELECT * FROM user_application_state')).rows.length, 1)
  await assert.rejects(db.query('SELECT record_application_open($1, $2)', [user(2), app]), /permission denied/)
  await assert.rejects(db.query('SELECT * FROM application_quality_checks'), /permission denied/)
  await assert.rejects(db.query('SELECT * FROM municipality_application_journey($1)', [municipality]), /permission denied/)
  await db.exec('RESET ROLE')
  const suppressed = (await db.query('SELECT * FROM municipality_application_journey($1)', [municipality])).rows[0]
  assert.equal(suppressed.views, null)
  for (let n = 1; n <= 5; n++) {
    const payload = JSON.stringify({ application_id: app, journey_id: user(n + 300) })
    await db.query("INSERT INTO analytics_events VALUES ($1,$2,'app_view',$3,now() - interval '2 days')", [municipality, user(n), payload])
    if (n <= 3) await db.query("INSERT INTO analytics_events VALUES ($1,$2,'app_launch',$3,now() - interval '2 days' + interval '1 minute')", [municipality, user(n), payload])
  }
  const metrics = (await db.query('SELECT * FROM municipality_application_journey($1)', [municipality])).rows[0]
  assert.equal(Number(metrics.views), 5)
  assert.equal(Number(metrics.launches), 3)
  assert.equal(Number(metrics.active_users), 5)
  assert.equal(Number(metrics.visits_without_launch), 2)
  assert.equal((await db.query('SELECT * FROM municipality_application_journey($1)', [user(202)])).rows.length, 0)
  await db.query('DELETE FROM users WHERE id = $1', [user(1)])
  assert.equal((await db.query('SELECT * FROM user_application_state')).rows.length, 0)
  console.log('Migration 067: SQL, atomic updates, RLS, permissions, privacy thresholds, journey counts and deletion verified.')
} finally { await db.close() }
