# Despliegue de la migración 069 — Lotes ODS con app pre-asignada

> **Programa ODS · Villafranca de los Barros**
> Los códigos dejan de exigirse en el registro y pasan a ser invitaciones
> vinculadas a aplicaciones concretas (lote → app).

---

## 1. Qué cambia

| Elemento | Antes (068) | Después (069) |
|---|---|---|
| Registro en Villafranca | Exige código municipal | **Sin código** (registro abierto) |
| Código ODS | El ciudadano elige la app al activar | La app viene **pre-asignada en el lote** (si se definió) |
| `municipal_invite_batches` | Sin `application_id` | Columna nueva `application_id` (NULL = comportamiento clásico) |
| `activate_code_grant()` | Requiere `p_application_id` | `p_application_id` opcional; prioridad: app del lote |
| Correo del código | Genérico | Menciona la app asignada (si la hay) |
| Otros municipios | — | **Sin cambios** (flags por-municipio) |

Ámbito: **solo** los slugs `villafranca-de-los-barros` y `villafrancadelosbarros`.

---

## 2. Pre-requisitos

- [ ] Acceso al SQL Editor del proyecto Supabase de producción
      (`https://supabase.com/dashboard/project/dxxxhocqfuygngtxpuae`).
- [ ] Permisos de `postgres` o similar (la migración usa DDL: ALTER TABLE, funciones).
- [ ] Confirmar con la gestora qué aplicación (o aplicaciones) recibirá el primer
      lote pre-asignado, y que esa app está **publicada** en Villafranca
      (`municipality_applications.publication_status = 'publicada'` y `activa = true`).
- [ ] Aviso a la gestora: a partir del despliegue el **registro en Villafranca no
      pedirá código**. Si ella quiere seguir exigiéndolo, decirlo ANTES (ver rollback R3).

---

## 3. Copia de seguridad (obligatoria)

En el SQL Editor, antes de tocar nada:

```sql
-- 3.1 Estado previo de los flags y funciones (informativo)
SELECT slug, invite_codes_required, grant_mode
  FROM public.municipalities
 WHERE slug IN ('villafranca-de-los-barros', 'villafrancadelosbarros');

-- 3.2 Backup de las tablas que la migración puede tocar
CREATE TABLE IF NOT EXISTS backup_069_municipalities AS
  SELECT * FROM public.municipalities
   WHERE slug IN ('villafranca-de-los-barros', 'villafrancadelosbarros');

CREATE TABLE IF NOT EXISTS backup_069_invite_batches AS
  SELECT * FROM public.municipal_invite_batches
   WHERE municipality_id IN (
     SELECT id FROM public.municipalities
      WHERE slug IN ('villafranca-de-los-barros', 'villafrancadelosbarros'));

-- Los códigos NO se modifican estructuralmente (solo se añade columna en
-- batches y funciones), pero por higiene dejamos también su copia:
CREATE TABLE IF NOT EXISTS backup_069_invite_codes AS
  SELECT * FROM public.municipal_invite_codes
   WHERE municipality_id IN (
     SELECT id FROM public.municipalities
      WHERE slug IN ('villafranca-de-los-barros', 'villafrancadelosbarros'));
```

---

## 4. Aplicar la migración

1. Abrir el SQL Editor del dashboard de Supabase (proyecto `dxxxhocqfuygngtxpuae`).
2. Copiar **el contenido íntegro** de
   `te-cuida-app/supabase/migrations/069_ods_preassigned_app_batches.sql`
   y ejecutarlo en una sola sesión.
3. La migración es **transaccional** (BEGIN/COMMIT) e idempotente: si falla algo
   a mitad, no queda nada aplicado; si se re-ejecuta, no duplica efectos.
4. Ejecutar la verificación del paso 5.

> **Nota (migración 070):** el SQL de esta migración incluye ya el guard de
> categoría del programa de categorías (070): `activate_code_grant()` solo
> concede apps con códigos de lotes `proposito='ods'`. La columna `proposito`
> se lee vía `to_jsonb`, así que **el orden 069→070 o 070→069 es indiferente**
> y sin la 070 aplicada el guard es inerte. Ver `docs/deploy-migracion-070.md`.

> **Nota:** si el proyecto usa migraciones gestionadas por CLI
> (`supabase db push`), puede aplicarse así en lugar del dashboard;
> el resultado es el mismo.

---

## 5. Verificación post-migración

Ejecutar en el SQL Editor:

```sql
-- 5.1 La columna existe y es nullable (NULL = clásico)
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'municipal_invite_batches'
   AND column_name = 'application_id';
-- Esperado: 1 fila, uuid, YES

-- 5.2 Los flags de Villafranca quedaron como se busca
SELECT slug, invite_codes_required, grant_mode
  FROM public.municipalities
 WHERE slug IN ('villafranca-de-los-barros', 'villafrancadelosbarros');
-- Esperado: invite_codes_required = false, grant_mode = 'grant' (ambas filas)

-- 5.3 La función tiene el nuevo contrato (p_application_id con DEFAULT)
SELECT proname, pg_get_function_arguments(oid) AS args
  FROM pg_proc
 WHERE proname = 'activate_code_grant'
   AND pronamespace = 'public'::regnamespace;
-- Esperado: "p_code_hash text, p_email_hash text, p_user_id uuid, p_application_id uuid DEFAULT NULL"

-- 5.4 RLS sigue activo en las tablas nuevas/afectadas
SELECT tablename, rowsecurity
  FROM pg_tables
 WHERE schemaname = 'public'
   AND tablename IN ('municipal_invite_codes', 'municipal_invite_batches', 'user_app_grants');
-- Esperado: rowsecurity = true en las tres
```

Además, humo por UI (puede hacerse antes o después de desplegar el código Next):

- [ ] `/register` desde `villafrancadelosbarros.tecuida.group` **no** muestra el
      campo "Código municipal" (aparece tras ~1 s; el componente consulta el flag).
- [ ] En el panel municipal (`/municipio/codigos`), al generar un lote aparece el
      selector "Aplicación del lote (opcional)" con las apps publicadas.
- [ ] `/activar` con un código de un lote **con** app asignada: activa directo,
      sin pantalla de elección.

---

## 6. Desplegar el código Next

La migración es **retrocompatible** con el código actual (la firma de
`activate_code_grant` se mantiene y `application_id` es opcional), por lo que el
orden seguro es:

1. **Migración 069 en Supabase** (pasos 3–5).
2. **Deploy de la app** con los cambios ya fusionados (activa el nuevo flujo en
   `/activar`, paneles y correos).

Si por cualquier motivo se despliega el código ANTES de la migración, no hay
rotura: el cliente enviaría `p_application_id` normal y `activate_code_grant()`
antigua funcionaría igual; el único efecto sería que `/api/ods/resolve` fallaría
con 500 (columna inexistente) y `/activar` caería al flujo clásico de elección.

---

## 7. Plan de rollback

La migración es idempotente y aditiva; el rollback es quirúrgico:

### R1 · Volver al comportamiento clásico de activación (sin tocar schema)
```sql
-- Desasignar la app de los lotes afectados: los códigos vuelven a
-- "el ciudadano elige al activar". No se pierde ningún dato.
UPDATE public.municipal_invite_batches
   SET application_id = NULL
 WHERE municipality_id IN (
   SELECT id FROM public.municipalities
    WHERE slug IN ('villafranca-de-los-barros', 'villafrancadelosbarros'));
```

### R2 · Revertir el cambio de la función `activate_code_grant`
Solo necesario si se quiere volver al binario de la 068 tal cual
(p. ej. para volver a una versión de la app anterior a 069):

```sql
-- Recuperar la definición de la 068 (usar el archivo original):
-- supabase/migrations/068_ods_grants_villafranca.sql → sección 7.
-- Al crear la función con la firma SIN DEFAULT, el endpoint actual que
-- envía p_application_id sigue funcionando; el que envía NULL fallaría
-- con APP_REQUIRED — coordinar con el deploy de la app si se hace.
```
> En la práctica, R1 basta: con `application_id = NULL` en todos los lotes,
> la función de 069 se comporta idéntica a la de 068.

### R3 · Re-exigir código en el registro de Villafranca
Desde el propio panel (`/municipio/codigos` → "Activar restricción") o por SQL:
```sql
UPDATE public.municipalities
   SET invite_codes_required = true
 WHERE slug IN ('villafranca-de-los-barros', 'villafrancadelosbarros');
```
> El panel exige al menos un código vigente antes de permitirlo (regla
> existente de `set_required`); si no hay lotes activos, generar uno primero
> o hacerlo por SQL.

### R4 · Rollback completo del schema (caso extremo)
```sql
-- Solo si hubiera que eliminar la columna (no se esperan datos en ella
-- que no se hayan revertido antes con R1):
ALTER TABLE public.municipal_invite_batches DROP COLUMN IF EXISTS application_id;
-- Y restaurar la función desde 068 (archivo original, sección 7).
-- Restore de tablas si hiciera falta:
--   TRUNCATE ... ; INSERT FROM backup_069_* (ver paso 3)
```

---

## 8. Checklist final

| Paso | Estado |
|---|---|
| Backup `backup_069_*` creado | ☐ |
| Migración 069 ejecutada sin errores | ☐ |
| Verificaciones 5.1–5.4 correctas | ☐ |
| Smoke test UI: registro sin código | ☐ |
| Smoke test UI: panel municipal con selector de app | ☐ |
| Deploy de la app (código 069) | ☐ |
| Smoke test UI: `/activar` activa directo con lote pre-asignado | ☐ |
| Correo de envío menciona la app asignada | ☐ |
| Gestora informada (registro abierto + cómo re-activar R3) | ☐ |
