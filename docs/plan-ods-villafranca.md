# Plan técnico — Programa ODS "VCA TE CUIDA" (Villafranca de los Barros)

> Estado: **IMPLEMENTADO** (salvo despliegue). Las secciones anteriores describen el
> diseño; este apéndice resume lo construido y cómo desplegarlo.

## 11. Estado de implementación (migración 068)

**Base de datos**
- `supabase/migrations/068_ods_grants_villafranca.sql`: `municipalities.grant_mode`
  (con CHECK `open|grant`), columnas de destino/envío en `municipal_invite_codes`,
  tablas `ods_weekly_participations` y `user_app_grants` (RLS, solo service_role),
  funciones `ods_week_monday()`, `activate_code_grant()` y `revoke_invite_code()`.
- Activa `grant_mode='grant'` **solo** para `villafranca-de-los-barros`.
- Tests: `supabase/tests/ods_grants.test.sql` (pgTAP).

**Librerías**
- `src/lib/ods/grants.ts`: concesiones activas, gating (`checkAppGrantAccess`),
  semana ISO (`currentWeekMonday`, `Intl` sobre Europe/Madrid).
- `src/lib/ods/gating.ts`: `getGrantedApplicationIds()` para páginas server.
- `src/lib/ods/destination-crypto.ts`: hash HMAC + cifrado AES-256-GCM del destino.
- `src/lib/ods/email.ts`: envío Resend + plantilla del correo de código.

**Endpoints**
- `POST /api/ods/activate` (ciudadano autenticado; rate-limit; mapea errores SQL).
- `GET /api/ods/eligibility` (apps elegibles + `weekly_used`).
- `POST /api/municipio/ods` (gestión: `import_destinations`, `send_pending`,
  `resend_code`, `update_destination`, `revoke_code`, `register_participations`).
- `PUT /api/admin/municipalities/[id]` acepta `grant_mode`.

**Pantallas**
- `/activar`: introducir código → elegir app → confirmación.
- `/municipio/ods`: resumen, ciclo semanal (importar destinos, enviar), tabla de
  códigos con estado efectivo y acciones (corregir correo, reenviar, revocar).
- Enlace «Programa ODS» en el panel municipal; selector «Acceso a aplicaciones»
  (`grant_mode`) en `/admin/municipios/[id]`.

**Gating (solo modo `grant`)**
- `/dashboard` y `/dashboard/aplicaciones` filtran las apps por concesiones activas.
- `/apps/[appSlug]/run` muestra pantalla «Recurso no activado» con CTA a `/activar`.
- `/apps/[appSlug]/launch` redirige a `/activar?app=<slug>` sin concesión.
- El resto de municipios (`open`) no cambia nada.

**Variables de entorno nuevas**
- `ODS_DESTINATION_KEY`: clave hex de 64 caracteres (32 bytes) para AES-256-GCM.
  Generar con `openssl rand -hex 32`. Obligatoria para importar destinos.
- `ODS_EMAIL_FROM`: remitente de los correos ODS (p. ej.
  `VCA TE CUIDA <ods@villafranca-de-los-barros.tecuida.group>`). Opcional.
- Ya existentes y reutilizadas: `RESEND_API_KEY`, `INVITE_CODE_PEPPER`.

**Despliegue**
1. Aplicar la migración 068 (`supabase db push` o SQL editor) — idempotente.
2. Configurar `ODS_DESTINATION_KEY` (y `ODS_EMAIL_FROM`) en el entorno.
3. Desplegar la app; ejecutar pgTAP si hay entorno de CI con base de datos.
4. Para el piloto: generar lote en «Códigos de acceso», importar destinos de las
   urnas en `/municipio/ods` y usar «Enviar pendientes» cada semana.

## 0. Resumen del programa

1. La persona elige uno de los 17 ODS, responde en una tarjeta física "¿Qué harías para
   mejorar Villafranca en este objetivo?" y escribe su correo.
2. Deposita la tarjeta en una urna ODS. **Máximo una tarjeta por persona y semana.**
3. Entre lunes y miércoles de la semana siguiente, el ayuntamiento le envía por correo un
   **código individual** que solo funciona con el correo escrito en la tarjeta.
4. La persona se registra en VCA TE CUIDA con ese correo, **elige la aplicación que quiere**
   y activa el código: queda vinculado a su cuenta y consumido.
5. Cada semana puede repetir el ciclo y **acumular acceso a aplicaciones distintas**
   (nunca a una que ya tenga). Lema: *"Una idea para mejorar Villafranca. Un recurso para
   cuidarte a ti."*

### Requisitos del ayuntamiento → cobertura en este plan

| Requisito | Cómo se resuelve |
|---|---|
| Generar códigos desde administración y tenerlos disponibles antes de enviarlos | Panel existente de códigos (`/municipio/codigos`) + columna de "envío" nueva |
| Cada código asignado a una aplicación elegida por la persona | La persona elige la app **al activar** (decisión de producto, ver §8.1); la concesión se crea en ese acto |
| Un solo uso | Estados `disponible → reservado → consumido` ya existentes (migración 051), atómicos en BD |
| Solo activable con el correo al que se envió | **Vinculación estricta**: `destination_email_hash` fija el correo destino; `activate_code_grant` valida hash(email) = hash(destino) |
| Consumido y vinculado a la cuenta | `consumed_by` + concesión `user_app_grants` |
| Acceso solo a la app elegida, no al resto | Modo concesiones (flag por municipio) + filtrado en dashboard + verificación server-side en `/run` y `/launch` |
| Ver disponible / activado / caducado / revocado | Panel actual + estados efectivos nuevos (pendiente de envío, enviado, expirado) |
| Fecha de caducidad | `expires_at` por código y lote (ya existe) |
| Revocación manual | Nueva acción por código individual (hoy solo existe revocar lote completo) |
| Una activación nueva por semana, siempre app distinta | Regla aplicada en BD dentro de la misma transacción (ver §3.3) |
| Acumulación semanal por correo | Una concesión por (usuario, app); se acumulan filas semana a semana |
| Que no acceda nadie de otro municipio | Los códigos no se publican; el destino queda fijado por hash; el municipio sigue teniendo su tenant aislado |

## 1. Principios de diseño

- **Reutilizar, no duplicar.** El sistema de códigos municipales (051/056) ya resuelve:
  generación, hash con pepper (`INVITE_CODE_PEPPER`), reserva atómica de 48 h con
  `SKIP LOCKED`, consumo `idempotente` por usuario, caducidad, RLS y lotes. Sobre esa base
  se añaden: destino de email por código, envío por email, y concesiones por app.
- **La regla de negocio vive en la base de datos**, no solo en la UI: la activación es una
  función `SECURITY DEFINER` transaccional, igual que hoy `finalize_municipal_invite_registration`.
  Nada de "activar" desde el cliente con varias llamadas.
- **Un flag por municipio** (`grant_mode`) para que el resto de municipios no cambie de
  comportamiento: `open` (todos ven todas sus apps publicadas, como hoy) o `grant` (solo
  apps con concesión activa). Villafranca pasa a `grant`; nadie más se toca.
- **Privacidad RGPD:** en BD solo se guardan hashes del correo (mismo patrón que
  `reserved_email_hash`); el email destino en claro se guarda **cifrada** en una columna
  aparte, visible solo para administración (necesaria para reenvíos y erratas). El envío
  se hace desde el backend; el correo nunca se expone en tablas que lea el ciudadano.

## 2. Modelo de datos (migración `068_ods_grants.sql`)

Todas las tablas nuevas con RLS activado desde el minuto uno (patrón 051).

### 2.1 `municipal_invite_codes` — columnas nuevas

```sql
ALTER TABLE public.municipal_invite_codes
  ADD COLUMN IF NOT EXISTS destination_email_encrypted text,   -- email destino, cifrado (libsodium/AES-GCM, clave en env)
  ADD COLUMN IF NOT EXISTS destination_email_hash text,        -- HMAC-SHA256(pepper, email) para verificación sin descifrar
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,                -- primer envío correcto
  ADD COLUMN IF NOT EXISTS sent_count integer NOT NULL DEFAULT 0, -- reenvíos
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text;                         -- nota interna del gestor (p.ej. "errata corregida")

CREATE INDEX IF NOT EXISTS municipal_invite_codes_destination_idx
  ON public.municipal_invite_codes(municipality_id, destination_email_hash);

COMMENT ON COLUMN public.municipal_invite_codes.destination_email_hash IS
  'HMAC del correo destino del programa ODS. Un código solo puede activarse con el correo cuyo hash coincida.';
```

`destination_email_hash` es la clave de la **vinculación estricta**: se fija cuando el
gestor carga/adjunta la lista de correos de las tarjetas recogidas (o al editar un código
individual), y `activate_code_grant` rechaza cualquier activación cuyo `email_hash`
no coincida exactamente.

### 2.2 `ods_weekly_participations` — antifraude de "una por semana"

No es estrictamente necesaria para activar (la regla se puede deducir de los códigos
consumidos por `consumed_by`), pero conviene registrar la **participación semanal** por
correo para: (a) aplicar el máximo semanal aunque la persona no haya activado aún,
(b) auditar el programa, (c) detectar dos tarjetas con el mismo correo.

```sql
CREATE TABLE IF NOT EXISTS public.ods_weekly_participations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id uuid NOT NULL REFERENCES public.municipalities(id) ON DELETE CASCADE,
  iso_year integer NOT NULL,
  iso_week integer NOT NULL,
  email_hash text NOT NULL,
  ods_code integer CHECK (ods_code BETWEEN 1 AND 17),
  idea_title text,          -- opcional: transcripción breve de la idea (para el ayuntamiento)
  batch_id uuid REFERENCES public.municipal_invite_batches(id) ON DELETE SET NULL,
  code_id uuid REFERENCES public.municipal_invite_codes(id) ON DELETE SET NULL,
  registered_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (municipality_id, iso_year, iso_week, email_hash)
);

CREATE INDEX IF NOT EXISTS ods_weekly_participations_lookup_idx
  ON public.ods_weekly_participations(municipality_id, iso_year, iso_week, email_hash);
```

El `UNIQUE` da la garantía dura: **un mismo correo no puede registrarse dos veces en la
misma semana ISO del mismo municipio.** Es también la definición operativa de "una tarjeta
por persona y semana" que el ayuntamiento puede aplicar al revisar las urnas.

### 2.3 `user_app_grants` — concesiones de acceso (la pieza nueva central)

```sql
CREATE TABLE IF NOT EXISTS public.user_app_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  municipality_id uuid NOT NULL REFERENCES public.municipalities(id) ON DELETE CASCADE,
  source_code_id uuid REFERENCES public.municipal_invite_codes(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,            -- heredada del código; NULL = sin caducidad
  revoked_at timestamptz,            -- revocación manual (en cascada con el código, ver §3.4)
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, application_id)
);

CREATE INDEX IF NOT EXISTS user_app_grants_user_idx
  ON public.user_app_grants(user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS user_app_grants_municipality_idx
  ON public.user_app_grants(municipality_id, application_id);
```

`UNIQUE (user_id, application_id)` garantiza que una app concedida no se pueda conceder
dos veces (regla "siempre una app distinta"), y permite filtrar en la UI las apps "que ya
tienes" frente a las "que puedes elegir".

### 2.4 `municipalities` — modo de acceso

```sql
ALTER TABLE public.municipalities
  ADD COLUMN IF NOT EXISTS grant_mode text NOT NULL DEFAULT 'open'
  CHECK (grant_mode IN ('open', 'grant'));

COMMENT ON COLUMN public.municipalities.grant_mode IS
  'open: el ciudadano ve todas las apps publicadas del municipio. grant: solo ve las apps con concesión activa (programa ODS).';
```

### 2.5 Función `activate_code_grant` — activación atómica

Reemplaza el papel de `finalize_municipal_invite_registration` **solo para el flujo ODS**
(el flujo de registro existente no se toca). Se ejecuta con el usuario ya autenticado
(registrado con el mismo correo), vía service role desde un endpoint autenticado:

```sql
CREATE OR REPLACE FUNCTION public.activate_code_grant(
  p_code_hash text,
  p_email text,
  p_email_hash text,
  p_user_id uuid,
  p_application_id uuid
)
RETURNS uuid  -- application_id concedida
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_code public.municipal_invite_codes%ROWTYPE;
BEGIN
  -- 1. Localizar y bloquear el código (FOR UPDATE: sin carreras)
  SELECT * INTO v_code FROM public.municipal_invite_codes
   WHERE municipality_id = (SELECT municipality_id FROM public.users WHERE id = p_user_id)
     AND code_hash = p_code_hash
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CODE_NOT_FOUND' USING ERRCODE = '22023'; END IF;

  -- 2. Vinculación estricta al correo destino
  IF v_code.destination_email_hash IS DISTINCT FROM p_email_hash THEN
    RAISE EXCEPTION 'CODE_EMAIL_MISMATCH' USING ERRCODE = '22023';
  END IF;

  -- 3. Idempotencia: el mismo usuario re-activa el mismo código → devolver su concesión
  IF v_code.estado = 'consumido' AND v_code.consumed_by = p_user_id THEN
    RETURN (SELECT application_id FROM public.user_app_grants
             WHERE source_code_id = v_code.id ORDER BY granted_at LIMIT 1);
  END IF;

  -- 4. Estados válidos y caducidad
  IF v_code.estado NOT IN ('disponible', 'reservado')
     OR (v_code.expires_at IS NOT NULL AND v_code.expires_at <= now()) THEN
    RAISE EXCEPTION 'CODE_NOT_ACTIVE' USING ERRCODE = '22023';
  END IF;

  -- 5. La app debe estar publicada y activa en el municipio del usuario
  IF NOT EXISTS (
    SELECT 1 FROM public.municipality_applications ma
     JOIN public.applications a ON a.id = ma.application_id
    WHERE ma.municipality_id = v_code.municipality_id
      AND ma.application_id = p_application_id
      AND ma.activa AND ma.publication_status = 'publicada'
      AND a.activa
  ) THEN RAISE EXCEPTION 'APP_NOT_AVAILABLE' USING ERRCODE = '22023'; END IF;

  -- 6. Regla semanal: solo una activación por semana ISO
  --    y siempre sobre una app que el usuario aún no tenga.
  IF EXISTS (
    SELECT 1 FROM public.user_app_grants g
     WHERE g.user_id = p_user_id
       AND date_trunc('week', g.granted_at AT TIME ZONE 'Europe/Madrid') =
           date_trunc('week', now() AT TIME ZONE 'Europe/Madrid')
  ) THEN RAISE EXCEPTION 'WEEKLY_LIMIT_REACHED' USING ERRCODE = '22023'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_app_grants g
     WHERE g.user_id = p_user_id AND g.application_id = p_application_id
       AND g.revoked_at IS NULL
  ) THEN RAISE EXCEPTION 'APP_ALREADY_GRANTED' USING ERRCODE = '22023'; END IF;

  -- 7. Consumir el código + crear la concesión, en la misma transacción
  UPDATE public.municipal_invite_codes
     SET estado = 'consumido', consumed_by = p_user_id, consumed_at = now(),
         reserved_until = NULL
   WHERE id = v_code.id;

  INSERT INTO public.user_app_grants (user_id, application_id, municipality_id,
                                      source_code_id, expires_at)
  VALUES (p_user_id, p_application_id, v_code.municipality_id, v_code.id, v_code.expires_at)
  ON CONFLICT (user_id, application_id) DO NOTHING;

  RETURN p_application_id;
END $$;
```

Errores como códigos SQLSTATE `P0001` con mensaje estable (`CODE_EMAIL_MISMATCH`,
`WEEKLY_LIMIT_REACHED`…) para que el frontend los mapee a mensajes claros en español.

**Criterio de "semana" (decisión ya tomada con el ayuntamiento): semana ISO**
(lunes 00:00 a domingo 24:00, zona `Europe/Madrid`). Encaja con su ciclo de recogida.
En la migración final, la comparación semanal debe usar `EXTRACT(ISOYEAR ...)` /
`EXTRACT(ISOWEEK ...)` con la misma función que calcula la semana de participación
(`ods_weekly_participations`), de modo que la regla semanal de activación y la
participación semanal usen exactamente la misma definición de semana.

### 2.6 Revocación en cascada

Revocar un código individual debe retirar el acceso que generó:

```sql
CREATE OR REPLACE FUNCTION public.revoke_invite_code(p_code_id uuid) RETURNS void
-- UPDATE municipal_invite_codes SET estado='revocado' WHERE id=p_code_id AND estado IN ('disponible','reservado');
-- UPDATE user_app_grants SET revoked_at = now() WHERE source_code_id = p_code_id AND revoked_at IS NULL;
```

(Cuando el lote completo se revoca, igual: revocar códigos no consumidos y sus concesiones.
Los códigos ya consumidos por usuarios activos se revisan caso a caso; es la política que
el ayuntamiento decida, pero la mecánica técnica es la misma.)

## 3. Backend — endpoints (Next.js App Router)

Patrones ya existentes que se reutilizan: `verifyAdminAccess()` para gestión, `verifyMunicipioAccess()`
para gestores municipales, `checkRateLimitAsync` en todas las rutas, `revalidatePath` tras mutaciones,
zod para validación, y `lib/email.ts` nuevo sobre el patrón Resend ya usado en
`managers/route.ts` y `delete-account/route.ts`.

### 3.1 Activación (ciudadano autenticado)

`POST /api/ods/activate` — autenticada, rate-limited.

```jsonc
// Request
{ "code": "VI-XXXX-XXXX-XXXX-XXXX", "application_id": "<uuid>" }
// 200 OK
{ "application_id": "...", "app_slug": "reto30", "grant_id": "..." }
// Errores mapeados (422/403):
// CODE_NOT_FOUND, CODE_EMAIL_MISMATCH ("Este código fue emitido para otro correo"),
// WEEKLY_LIMIT_REACHED ("Ya has activado un recurso esta semana. Vuelve el lunes."),
// APP_ALREADY_GRANTED, APP_NOT_AVAILABLE, CODE_NOT_ACTIVE (consumido/caducado/revocado)
```

Flujo: `auth.getUser()` → `hashInviteCode(code)` → `admin.rpc('activate_code_grant', …)`.
Sesión previa: la persona se **registra/inicia sesión con el correo destino** (mismo flujo de
registro municipal que hoy; si el municipio tiene `invite_codes_required`, ya necesita su
código ODS para crear la cuenta — ver §8.3 sobre esta doble capa).

`GET /api/ods/eligibility` — para pintar la pantalla de activación:
apps publicadas del municipio **menos** las ya concedidas, y si la concesión semanal de
esta semana ya está usada (`weekly_used: true`) o quedan apps elegibles.

### 3.2 Gestión ODS (admin + gestor municipal)

Sobre los endpoints existentes `…/{id}/invite-codes` y `…/municipio/invite-codes`
(se añaden acciones al schema zod, manteniendo los patrones de rate-limit y revalidación):

| Acción | Payload | Notas |
|---|---|---|
| `import_destinations` | CSV/JSON `{ code_value \| code_prefix, email, ods? }[]` | fija `destination_email_encrypted/hash` en lote; rechaza filas con hash duplicado en la misma semana (`ods_weekly_participations`) |
| `send_pending` | `{ batch_id?, code_ids? }` | envía por Resend los códigos con destino y sin `sent_at`; plantilla con el lema del programa; registra `sent_at/count` |
| `resend_code` | `{ code_id }` | reenvío individual |
| `revoke_code` | `{ code_id }` | revoca código + concesión (función §2.6) |
| `update_destination` | `{ code_id, email }` | corrige erratas del papel **antes** del envío; si ya enviado, obliga a confirmar |
| `register_participations` | `{ week: [iso_year, iso_week], rows: { email, ods? }[] }` | da de alta las participaciones semanales al recoger las urnas; valida único semanal |

Envío de email: `lib/email.ts` con `sendOdsCodeEmail({ to, code, appName?, expiresAt })`,
plantilla HTML sencilla con el lema, remitente configurado por variable de entorno
(`ODS_EMAIL_FROM`, p.ej. `VCA TE CUIDA <ods@villafranca…>`), y **log de resultados** por
código (éxito/error) para poder reintentar los fallidos sin duplicar envíos.

### 3.3 Acceso a apps (gating)

- `GET /api/citizen/applications` y las páginas `dashboard`, `dashboard/aplicaciones`:
  si `tenant.grant_mode === 'grant'`, filtrar `activeApps` por
  `user_app_grants` activos del usuario (`revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())`).
- `GET /apps/[appSlug]` (página y `run/page.tsx`): tras `getPublicApplication`, si el
  municipio está en modo `grant` y el usuario autenticado **no** tiene concesión activa
  para esa app → redirigir a `/dashboard?grant_required=slug` con banner explicativo.
  La landing pública de la app sigue siendo visible (es información, no recurso), pero el
  contenido/run queda tras la concesión. Puntos de entrada `launch/route.ts` y
  `run/route.ts` (si existe) reciben la misma comprobación server-side.
- La comprobación se centraliza en `lib/grants.ts`:
  `hasActiveGrant(admin, userId, applicationId)` y `listGrantedApplications(admin, userId)`,
  usadas por dashboard, páginas de app y launch.

## 4. Frontend — pantallas

### 4.1 Ciudadano

1. **Pantalla de activación** (`/activar` nueva o sección del onboarding):
   - Si el usuario no tiene apps aún: "Introduce el código que has recibido por correo".
   - Paso 2: selector de **aplicaciones elegibles** (tarjetas con miniatura, las que aún no
     tiene; si `weekly_used`, deshabilitado con explicación "Vuelve el lunes").
   - Paso 3: confirmación → `POST /api/ods/activate` → éxito con CTA "Abrir [app]".
   - Mensajes de error legibles (los de §3.1), incluido el caso de errata en el correo
     ("Este código fue emitido para otro correo. Revisa el correo que escribiste en la tarjeta").
2. **Dashboard y `/dashboard/aplicaciones`**: en modo `grant` muestran solo las apps
   concedidas + una tarjeta fija "Añadir recurso con tu código ODS" que lleva a `/activar`
   (así el ciudadano siempre ve el camino para la siguiente semana).
3. **Estado vacío**: si no tiene concesiones, el dashboard muestra la explicación del
   programa (lema, cómo participar en la urna ODS, cuándo llega el correo).

### 4.2 Administración (municipio)

Se amplía el panel existente `/municipio/codigos` (y su homólogo admin) con:

- **Vista por lote** actual + **vista "Programa ODS"**: tabla de códigos con columnas
  `código (visible, 056) · correo destino · estado efectivo · enviado el · concesión (app) · acciones`.
  Estados efectivos: `pendiente de destino`, `pendiente de envío`, `enviado`,
  `activado (app)`, `expirado`, `revocado` — derivados, no estados nuevos en BD salvo `sent_at`.
- Acciones por fila: reenviar, corregir correo, revocar. Acciones de lote: importar
  destinos (CSV), enviar pendientes, revocar lote (ya existe).
- **Resumen semanal**: participaciones registradas de la semana ISO en curso, códigos
  enviados, activaciones — para el ciclo lunes–miércoles del ayuntamiento.
- Badges de `grant_mode` y aviso si el municipio no está en modo `grant` cuando importan
  destinos ODS.

### 4.3 Admin de plataforma (`/admin/municipios/[id]`)

- Toggle `grant_mode` por municipio (como el toggle existente `invite_codes_required`),
  con confirmación y explicación del impacto.

## 5. Emails (Resend)

- Plantilla única `ods-code`: asunto `Tu código de acceso a VCA TE CUIDA`,
  cuerpo: lema del programa, código en grande con tipografía monoespaciada, enlace a
  `/activar`, caducidad si aplica, y recordatorio de que debe registrarse **con este mismo
  correo**.
- Reintentos: el envío es por lotes con control de `sent_at`; los fallos se marcan y se
  pueden reintentar. No se envía nada sin `destination_email_hash` fijado.
- Dominio de envío: dar de alta el dominio del ayuntamiento en Resend (DKIM/SPF) o usar el
  dominio actual de la plataforma; decisión operativa, no técnica.

## 6. Seguridad y cumplimiento

- **Códigos**: se mantienen con pepper (`INVITE_CODE_PEPPER`) y hash HMAC; el valor en
  claro solo en `code_value` (056, visible para gestores) y en el correo.
- **Emails destino**: cifrados en reposo (`destination_email_encrypted`, clave
  `ODS_DESTINATION_KEY` de 32 bytes en env) + hash HMAC para comparación. El hash es el
  campo de negocio; el cifrado es para reenvíos/auditoría.
- **RLS**: las tablas nuevas habilitan RLS sin políticas públicas (solo service role y las
  funciones `SECURITY DEFINER` con `GRANT` explícito, igual que 051). El ciudadano nunca
  lee códigos ni participaciones; lee sus concesiones vía vistas propias si hace falta.
- **Antifraude**: `UNIQUE` semanal por correo-hash; activación transaccional con `FOR UPDATE`;
  rate-limit en endpoints; correo del código fijado por el municipio (no editable por el
  ciudadano); una app no se concede dos veces (`UNIQUE user_id+application_id`).
- **RGPD**: base del tratamiento = participación voluntaria al programa municipal; el
  correo se usa para el fin único de entregar el acceso; borrado de cuenta ya existente
  (`delete-account`) debería también purgar `ods_weekly_participations` asociadas (aunque
  el hash no es reversible, conviene limpiar la fila) y las concesiones mueren con el
  usuario (`ON DELETE CASCADE`).

## 7. Tests (mismo enfoque que la suite actual)

1. **pgTAP** (`tests/ods_grants.test.sql`, siguiendo `municipal_invite_codes.test.sql`):
   activación feliz; rechazo por hash de correo distinto; rechazo por semanal; rechazo por
   app ya concedida; rechazo por app no publicada en el municipio; caducidad; revocación de
   código retira concesión; idempotencia; unicidad de participación semanal; modos
   `open`/`grant`.
2. **Jest** (rutas): `POST /api/ods/activate` (mapeo de errores a mensajes), eligibility,
   endpoints de gestión (import CSV, send_pending con mock de Resend, revocación), gating
   del dashboard y de `/apps/[appSlug]/run` en modo `grant` (con y sin concesión, expirada
   y revocada), y modo `open` intacto (no romper a otros municipios).
3. **E2E (Playwright)**: flujo feliz ciudadano (registro con correo destino → activar →
   app visible → otra app bloqueada) y flujo gestor (importar CSV → enviar → ver estado).

## 8. Decisiones abiertas (bloquean implementación, no diseño)

1. **¿Cuándo se elige la app?** Este plan asume **elección en pantalla al activar** (recomendada:
   menos trabajo manual y sin errores de transcripción de tarjetas). Si el ayuntamiento
   prefiere que la elección quede registrada en la tarjeta y el código venga **pre-asignado**
   a una app, basta añadir `application_id` nullable a `municipal_invite_codes` + validación
   en el paso 5 de `activate_code_grant`; el resto no cambia.
2. **Erratas del correo en papel**: se resuelve con `update_destination` antes del envío.
   Decidir quién lo hace (gestor municipal) y qué pasa si el código ya fue enviado
   (reenvío al correo corregido y caducidad del anterior).
3. **Doble capa de códigos**: si el municipio activa `invite_codes_required` (registro
   municipal cerrado) **y** el programa ODS, el ciudadano usaría un código para registrarse
   y el mismo/otro para activar apps. Recomendación: en modo `grant`, **el código ODS hace
   las dos cosas** (registro y primera concesión) para no pedir dos códigos; requiere que
   el flujo de registro llame también a la activación de concesión, o bien mantener el
   registro abierto y que solo la activación exija código. Decidir con el ayuntamiento;
   el plan soporta ambas.
4. **Caducidad por defecto**: sugerimos 12 meses por código (configurable por lote), pero
   es política municipal.

## 9. Plan de trabajo estimado (orden de implementación)

| Fase | Contenido | Esfuerzo |
|---|---|---|
| 1 | Migración `068` (tablas, columnas, `activate_code_grant`, revocación, RLS) + pgTAP | 1 día |
| 2 | `lib/grants.ts` + gating en dashboard, apps y launch + tests Jest | 1 día |
| 3 | Pantalla `/activar` + eligibility + mensajes de error | 1 día |
| 4 | Endpoints de gestión (import, send, resend, revoke, update_destination, participaciones) | 1 día |
| 5 | `lib/email.ts` + plantilla Resend + reintentos | 0.5 día |
| 6 | Panel ODS (vista programa, acciones por fila, resumen semanal) + toggle admin | 1 día |
| 7 | E2E Playwright + pasada de RGPD (borrado) + revisión de rate-limits | 0.5 día |

Total ≈ **6 días efectivos**. Fases 1–3 desbloquean un piloto interno; 4–6 completan el
ciclo lunes–miércoles del ayuntamiento.

## 10. Qué NO cambia

- Flujo de registro existente con códigos municipales (`/api/auth/register`,
  `auth/callback`, funciones 051) — se conserva tal cual.
- Los otros municipios: con `grant_mode = 'open'` por defecto, su experiencia es idéntica
  a la actual; el flag solo se activa para Villafranca.
- Despliegue: migraciones Supabase + env vars nuevas (`ODS_DESTINATION_KEY`, `ODS_EMAIL_FROM`)
  además de las existentes (`RESEND_API_KEY`, `INVITE_CODE_PEPPER`).
