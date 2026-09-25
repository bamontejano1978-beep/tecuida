# Despliegue de la migración 070 — Categorías de códigos (acceso / ODS)

> **Programa ODS · Villafranca de los Barros**
> Dos categorías explícitas de códigos por lote: **acceso** (alta de
> ciudadanos en el registro) y **ods** (invitaciones a aplicaciones del
> programa de recursos). Un código de una categoría ya no se puede
> consumir por la otra vía.

---

## 1. Qué cambia

| Elemento | Antes (051/068/069) | Después (070) |
|---|---|---|
| Uso de los códigos | Un mismo código servía para registro Y activación ODS (ganaba el primer consumo) | Cada lote tiene `proposito`: `'acceso'` (solo registro) o `'ods'` (solo activación de apps) |
| Registro con un código ODS | Posible: consumía el código sin conceder la app | **Rechazado** (el código no se gasta; el ciudadano debe activarlo en `/activar`) |
| Activación ODS con un código de acceso | Posible: concedía una app | **Rechazado** con error `CODE_NOT_ODS` (mensaje claro al ciudadano) |
| Lotes existentes | — | Backfill: `proposito='ods'` en municipios con `grant_mode='grant'` (hoy Villafranca); `'acceso'` en el resto |
| Panel municipal/admin | — | Selector "Tipo de lote" al generar + badge de categoría en el historial |

Sin cambios: cifrado (pepper/AES), email destino, límite semanal ISO, app no repetida, estados, RLS, ni el flujo de la 069 (app pre-asignada por lote sigue siendo opcional: `application_id` NULL = el ciudadano elige).

## 2. Orden de aplicación y compatibilidad

- **La 070 es independiente del orden respecto a la 069**: ambas funciones
  (`reserve_municipal_invite_code`, `activate_code_grant`) leen la categoría
  vía `COALESCE(to_jsonb(batch)->>'proposito', <default>)`, por lo que el guard
  es inerte hasta que la columna existe. Aplicar 069 → 070 o 070 → 069 produce
  el mismo resultado.
- El código Next ya desplegado y el de este repo **degradan con elegancia**:
  `getBatchCapability()` detecta si existen `application_id` (069) y
  `proposito` (070) y oculta/desactiva lo no disponible (cache de 5 min).
- Sin 070 aplicada, la API rechaza `proposito:'ods'` con 503 y el panel no
  muestra el selector de tipo.

## 3. Pre-requisitos

- [ ] Acceso al SQL Editor del proyecto de producción
      (`https://supabase.com/dashboard/project/dxxxhocqfuygngtxpuae`).
- [ ] Si la **069 no está aplicada aún**, aplicar primero (ver
      `docs/deploy-migracion-069.md`) o aplicar 070 primero (válido también).
- [ ] Aviso a la gestora: los códigos ODS ya emitidos **dejan de servir para
      registrarse** (si alguien los usaba así) y solo activan apps; los códigos
      de acceso siguen sirviendo solo para el alta.

## 4. Backup (obligatorio)

En el SQL Editor, antes de tocar nada:

```sql
-- 4.1 Estado previo (informativo)
SELECT slug, grant_mode, invite_codes_required
  FROM public.municipalities
 WHERE grant_mode = 'grant';

-- 4.2 Copia de lotes (la migración solo añade columna + backfill)
CREATE TABLE IF NOT EXISTS backup_070_batches AS
  SELECT * FROM public.municipal_invite_batches;

-- 4.3 Copia de códigos, por higiene (no se modifican filas)
CREATE TABLE IF NOT EXISTS backup_070_codes AS
  SELECT * FROM public.municipal_invite_codes;
```

## 5. Aplicar la migración

1. Abrir `te-cuida-app/supabase/migrations/070_invite_code_categories.sql`.
2. Copiar **el contenido íntegro** al SQL Editor y ejecutarlo **una sola vez**.
3. Es transaccional (BEGIN/COMMIT) e idempotente: si falla algo, no queda nada
   aplicado; re-ejecutar no duplica efectos.

## 6. Verificación post-migración

```sql
-- 6.1 La columna existe con default 'acceso'
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'municipal_invite_batches'
   AND column_name = 'proposito';
-- Esperado: 1 fila, text, NO, 'acceso'

-- 6.2 El backfill clasificó los lotes de Villafranca como ODS
SELECT m.slug, b.nombre, b.proposito
  FROM public.municipal_invite_batches b
  JOIN public.municipalities m ON m.id = b.municipality_id
 WHERE m.slug IN ('villafranca-de-los-barros', 'villafrancadelosbarros')
 ORDER BY b.created_at DESC;
-- Esperado: proposito = 'ods' en todos los lotes de Villafranca

-- 6.3 La reserva solo acepta lotes 'acceso' (guard presente)
SELECT prosrc FROM pg_proc WHERE proname = 'reserve_municipal_invite_code';
-- Esperado: el cuerpo contiene COALESCE(to_jsonb(batch)->>'proposito', 'acceso')

-- 6.4 La activación solo acepta lotes 'ods' (guard presente)
SELECT prosrc FROM pg_proc WHERE proname = 'activate_code_grant';
-- Esperado: el cuerpo contiene CODE_NOT_ODS y COALESCE(to_jsonb(v_batch)->>'proposito', 'ods')

-- 6.5 RLS sigue activo
SELECT tablename, rowsecurity FROM pg_tables
 WHERE schemaname = 'public'
   AND tablename IN ('municipal_invite_batches', 'municipal_invite_codes');
-- Esperado: rowsecurity = true en ambas
```

## 7. Smoke tests por UI (sin nuevo deploy: el detector de capacidad tarda ~5 min)

- [ ] `/municipio/codigos` (y su equivalente admin) muestra el selector
      **"Tipo de lote"** al generar, con opciones "Acceso" y "Recurso (ODS)".
- [ ] Los lotes del historial muestran su badge de categoría
      ("Acceso" / "Recurso (ODS)"); los de Villafranca, "Recurso (ODS)".
- [ ] Generar un lote **acceso** y un lote **ods** de prueba; verificar que en
      el registro el código de acceso reserva normalmente y el ODS es
      rechazado con "El código municipal no es válido…" (sin consumirse).
- [ ] `/activar` con un código de acceso → mensaje claro "Este código es de
      acceso al registro municipal, no del programa de recursos…".
- [ ] `/activar` con un código ODS → activa igual que antes (directo si el
      lote tiene app pre-asignada, elección si no).

## 8. Plan de rollback

- **R1 · Volver al comportamiento clásico sin tocar schema** (el habitual):
  ```sql
  UPDATE public.municipal_invite_batches SET proposito = 'acceso';
  ```
  Con todos los lotes en `'acceso'`, el registro acepta cualquier código como
  antes; la activación ODS devolvería `CODE_NOT_ODS`, así que si hay códigos
  ODS en circulación usa R1 solo junto a R2.
- **R2 · Reclasificar solo los lotes ODS** (revertir el backfill a mano):
  ```sql
  UPDATE public.municipal_invite_batches
     SET proposito = 'acceso'
   WHERE municipality_id IN (
     SELECT id FROM public.municipalities
      WHERE slug IN ('villafranca-de-los-barros', 'villafrancadelosbarros'));
  ```
- **R3 · Rollback completo de schema** (caso extremo; la columna es aditiva):
  ```sql
  ALTER TABLE public.municipal_invite_batches DROP COLUMN IF EXISTS proposito;
  -- Restaurar las funciones desde los archivos originales:
  --   reserve_municipal_invite_code → 051_municipal_invite_codes.sql
  --   activate_code_grant           → 068_ods_grants_villafranca.sql (sección 7)
  --   (sin 069) o 069_ods_preassigned_app_batches.sql (con 069)
  -- Restore de tablas desde backup_070_* si hiciera falta.
  ```

## 9. Checklist final

| Paso | Estado |
|---|---|
| Backup `backup_070_*` creado | ☐ |
| Migración 070 ejecutada sin errores | ☐ |
| Verificaciones 6.1–6.5 correctas | ☐ |
| Smoke: selector de tipo + badges en panel | ☐ |
| Smoke: registro acepta 'acceso' y rechaza 'ods' | ☐ |
| Smoke: `/activar` rechaza 'acceso' y acepta 'ods' | ☐ |
| Gestora informada (categorías y qué significa cada una) | ☐ |
