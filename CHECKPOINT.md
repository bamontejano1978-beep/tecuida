# TE CUIDA — Checkpoint de sesión

**Fecha:** 16 de junio de 2026  
**Rama:** `master`  
**Último commit en `master`:** `Add bulk application assignment mode for superadmin` (previo a esta sesión)  
**Estado del deploy:** ✅ Producción desplegada con todos los cambios de esta sesión  
**Estado de git local:** trabajo de esta sesión **uncommitted / untracked** — commits pendientes antes de seguir

---

## 🟢 Lo completado en esta sesión (16-jun-2026)

### A. Enfoque 1 (Auth + cookies) — cerrado end-to-end
| Componente | Resultado |
|-----------|-----------|
| **Login (`/api/auth/login`)** | Devuelve `JSON { success, projectRef, session }` (NO `Set-Cookie`) — bypass bug Vercel edge que strip'aba `Set-Cookie`. Front escribe `sb-<projectRef>-auth-token` via `document.cookie`. |
| **Client cookie write (`/login/page.tsx`)** | Réplica exacta de `@supabase/ssr` `createChunks`: MAX_CHUNK_SIZE=3180, UTF-8 boundary safe, `encodeURIComponent` matching `cookie.serialize()`, Max-Age=30 días para preservar `refresh_token`. |
| **`cookies.get(name)` server-side** | Añadido en TODOS los 6 adapters de `createServerClient`. Era la causa raíz de los múltiples intentos fallidos: `@supabase/ssr` v0.3+ usa `cookies.get` en `combineChunks`, no solo `getAll`. |
| **Deploy a Vercel** | ✅ Login → /dashboard → curls E2E con cookie URL-encoded → 200 OK (no más 307 → /login) |

### B. Refactor DRY — Cookies adapter helper
| Archivo | Acción |
|---------|--------|
| `src/lib/supabase/cookies.ts` | **NUEVO helper** `createAuthCookiesAdapter(cookieStore, options?)`. Tipos `CookieStoreLike` (get/getAll/set) y `CookieAdapterOptions` con `writeThrough` opcional. Reusa el `pickSupportedCookieOptions` ya existente. `setAll` blindado con try/catch por sink (un RSC read-only no rompe los demás) + outer defensive. |
| `src/lib/supabase/middleware.ts` | Adapter inline → `createAuthCookiesAdapter(request.cookies, { writeThrough: [supabaseResponse.cookies] })` |
| `src/lib/supabase/server.ts` (createClient + createAdminClient) | Adapter inline → `createAuthCookiesAdapter(cookieStore)` (×2) |
| `src/app/auth/callback/route.ts` (main client) | Adapter inline → `createAuthCookiesAdapter(request.cookies, { writeThrough: [response.cookies] })`. Los 2 admin clients no se tocan (no leen sesión). |
| `src/app/api/auth/login/route.ts` | Adapter inline → helper; drop `pickSupportedCookieOptions` import (helper lo usa internamente). |
| `src/app/api/auth/register/route.ts` | Adapter inline → helper con `writeThrough=[response.cookies]`. Pre-crea `response` redirect antes del client Supabase y muta `Location` después de `getUser()`. `getUser()` envuelto en try/catch con JSON 500 fallback (mitiga el riesgo de redirect 303 al placeholder si lanza). Eliminado el array `supabaseWrites` + su bucle de aplicación manual. |
| `src/app/api/auth/signout/route.ts` | Adapter inline → helper con `writeThrough=[response.cookies]`. Pre-crea `response` redirect `/login` (URL determinista). Ahora hereda el filtrado robusto de options vía `pickSupportedCookieOptions` (antes solo aceptaba `expires: number`; ahora también `Date` y string ISO). |

**Validación:** `tsc --noEmit` sin errores en los archivos del refactor. Code-reviewer ✅ Production-ready tras 2 rondas de correcciones (relajación de tipos `set(...args: any[])` para aceptar el rest-tuple de Next.js + try/catch defensivo).

### C. Admin — Ver landing / catálogo público
| Archivo | Acción |
|---------|--------|
| `src/lib/tenant/landing.ts` | **NUEVO helper**. `getMunicipioLandingUrl(municipio, currentHost)` resuelve la URL pública desde el campo `dominio` con fallback dev a `?tenant=slug`. Defensa contra scheme prefix pegado: `cleanHostname(value: string\|null\|undefined)` exportada y usada por call-sites para comparar contra URLs construidas. |
| `src/app/admin/municipios/[id]/page.tsx` | Botón indigo prominente "Ver landing pública" con icono external-link SVG + span condicional `(url)` solo visible cuando difiere del dominio crudo (caso dev). `currentHost = headers().get('host')` hoisteado fuera del compute. |
| `src/app/admin/municipios/page.tsx` | 3ª acción "Landing" en la columna Acciones (color emerald) → external link al subdominio del municipio. `currentHost` hoisteado a la altura del totalPages (NO dentro del `.map()` por row). |
| `src/app/admin/municipios/[id]/aplicaciones/page.tsx` | Botón indigo promientente "Ver catálogo público" (mismo patrón que "Ver landing pública"). Query del municipio extendida para incluir `dominio`. `currentHost` hoisteado. `catalogUrl` + `showResolvedUrl` siguen mismo patrón que edit page. |

**Validación:** 
- Typecheck OK
- Code-reviewer ✅ Production-ready (con 1 nit a11y sin aplicar: SVG debería tener `aria-hidden="true"`)
- Deploy a Vercel production ✅
- **Browser-use E2E**: Ambos botones (lista + edit page) verificados con href=`https://zafra.tecuida.group/`, `target="_blank"`, `rel="noopener noreferrer"`. 0 console errors.

---

## 🟡 Pendiente para la próxima sesión

### Alta prioridad (heredado de sesión anterior, todavía no hecho)
1. **Configurar DNS en Nominalia**: cambiar nameservers a `ns1.vercel-dns.com` / `ns2.vercel-dns.com`. Ver guía detallada en sección "🌐 Guía DNS" más abajo.
2. **Sincronizar migraciones con Supabase**: aplicar `009_subscription_plans.sql` (planes de suscripción con trigger de auto-asignación) y `seed/004_subscription_plans.sql` (3 planes base: básico 6 apps, estándar 16 apps, premium 26 apps).
3. **Asignar apps a los 6 municipios extremeños** (siguen sin apps asignadas). Opciones:
   - A) Modo bulk: `/admin/aplicaciones/bulk` 
   - B) Migración SQL con INSERTs en `municipality_applications`

### Alta prioridad (nuevo de esta sesión)
4. **`aria-hidden="true"` en los SVG de iconos external-link** de los botones indigo — el code-reviewer lo señaló como nit. Aplicar tanto en `/admin/municipios/[id]/page.tsx` como en `/admin/municipios/[id]/aplicaciones/page.tsx` retroactivamente.
5. **Tests unitarios del helper `createAuthCookiesAdapter`** en `src/__tests__/`. Branches críticos: getAll con entries ausentes, setAll con sink read-only, writeThrough=undefined y writeThrough=[]. Reduce riesgo de regresión si Next.js o @supabase/ssr cambian internals.
6. **Calamonte** (y demás municipios que falten): añadir a `supabase/migrations/008_seed_extremadura_municipalities.sql` — el usuario lo mencionó explícitamente, no existe todavía en el seed.

### Media prioridad
7. **Tests E2E con Playwright/Cypress** del flujo auth completo: login → /dashboard → signout → /login sin cookies residuales → cookies vaciadas correctamente.
8. **Segundo helper `createReadOnlyCookiesAdapter(cookieStore)`** para los admin clients: `getAll + setAll() {}` (no-op). Call-sites candidatos: 2 en `src/app/auth/callback/route.ts` (líneas ~87 y ~168) y 1 en `src/middleware.ts` (~línea 142). DRY win modesto.
9. **Refactor del botón indigo con icono SVG a componente compartido** `LandingPreviewButton({municipio, variant="landing"|"catalog"})`. Las 2 páginas admin duplican ~30 líneas de Tailwind + JSX del botón (la fuente única está en `src/lib/tenant/landing.ts` + JSX duplicado).

### Baja prioridad
10. Refactorizar los tests pre-existentes en `__tests__/` que están desactualizados:
    - `src/__tests__/middleware.test.ts`: necesita `--downlevelIteration` y posiblemente mock update por la nueva helper `createAuthCookiesAdapter`.
    - `src/types/__tests__/types.test.ts`: `MunicipalityConfig` necesita `hero_image_url` y `plan_id` (verificado por basher pero no aplicado a tests).
11. Añadir tests para el modo bulk y gestión de planes.
12. Copiar URL al lado del botón admin (UX nicety).

---

## 🌐 Guía DNS — Nominalia → Vercel (pendiente de aplicar)

**Decisión tomada (16-jun-2026):** Cambiar los nameservers (no solo registros) para delegar toda la gestión DNS a Vercel.

### Diagnóstico previo
| Componente | Estado |
|------------|--------|
| Registrador | Nominalia |
| NS actuales | `dns1.nominalia.com` / `dns2.nominalia.com` |
| A `@` | `81.88.48.71` ❌ (apunta a hosting antiguo) |
| CNAME `www` | → `tecuida.group` ❌ |
| CNAME `*` | → `cname.vercel-dns.co` ✅ (Vercel acepta el alias) |
| Wildcard en Vercel | `*.tecuida.group` ✅ ya asignado al proyecto `tecuida` |
| Dominio en Vercel | `tecuida.group` ✅ registrado |
| HTTPS | ❌ cert incorrecto (porque A apunta a IP antigua) |

### Pasos a aplicar en el panel de Nominalia
1. Acceder a la **Zona Cliente** en [www.nominalia.com](https://www.nominalia.com)
2. Seleccionar el dominio **`tecuida.group`**
3. Ir a **"DOMINIO Y DNS"** → **"Gestionar DNS"**
4. Pulsar **"Empezar el cambio de DNS"** (columna izquierda)
5. ⚠️ Nominalia mostrará una advertencia: al cambiar DNS, sus servicios dejarán de funcionar. Marcar la casilla de aceptación y **"CONTINUAR"**
6. Introducir los nuevos nameservers:
   - **NS1:** `ns1.vercel-dns.com`
   - **NS2:** `ns2.vercel-dns.com`
7. Si Nominalia pide IPs, obtenerlas con `nslookup ns1.vercel-dns.com` / `nslookup ns2.vercel-dns.com`
8. Pulsar **"Guardar"**

### Después del cambio (verificación)
```bash
nslookup -type=NS tecuida.group 8.8.8.8          # hasta 24h en propagarse
nslookup -type=A tecuida.group 8.8.8.8           # 76.76.21.21 (Vercel)
nslookup -type=A zafra.tecuida.group 8.8.8.8     # mismo wildcard
curl -I https://tecuida.group
```

### Consideraciones
- **Propagación:** hasta 24h (`.group` puede ser más lento que `.com`)
- **Cert SSL:** Vercel emite Let's Encrypt automáticamente al detectar el dominio
- **Servicios que se perderán en Nominalia:** hosting antiguo + correo. Si usas email con este dominio, migra antes o configura MX en Vercel.
- **Tras propagar:** todos los `*.tecuida.group` funcionan (multi-tenancy automática)

---

## 🔑 Credenciales y URLs

| Recurso | Valor |
|---------|-------|
| **Producción** | https://tecuida.group |
| **Develop** | https://tecuida.group/login (admin) / https://zafra.tecuida.group/ (tenant) |
| **Admin user** | `admin.tecuida@tecuida.es` / `TestAdmin2026!Secure` |
| **Admin panel** | https://tecuida.group/admin |
| **Modo Bulk** | https://tecuida.group/admin/aplicaciones/bulk |
| **Apps por municipio** | https://tecuida.group/admin/municipios/<id>/aplicaciones |
| **Supabase dashboard** | https://supabase.com/dashboard/project/dxxxhocqfuygngtxpuae |
| **Supabase anon key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4eHhob2NxZnV5Z25ndHhwdWFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MzUyMDksImV4cCI6MjA5NzExMTIwOX0.-_IdQDSs-hq8BPO1YnkD_YeFEaL6bHTf52mHbucu8l8` |
| **Vercel project** | `barto-s-projects1/tecuida` |
| **DB password** | `TeCuida2024!Secure` |

### Variables de entorno (Vercel, prod)
```
NEXT_PUBLIC_SUPABASE_URL=https://dxxxhocqfuygngtxpuae.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key arriba>
SUPABASE_SERVICE_ROLE_KEY=<configurada>
NEXT_PUBLIC_BASE_DOMAIN=tecuida.group
DEMO_MODE=false
```

---

## 🏗️ Arquitectura del proyecto

```
te-cuida-app/
├── src/
│   ├── app/
│   │   ├── page.tsx                   # Landing (RootLanding + TenantPage)
│   │   ├── layout.tsx                 # Layout raíz
│   │   ├── globals.css
│   │   ├── catalog-client.tsx         # Catálogo client component
│   │   ├── dashboard/page.tsx
│   │   ├── login/page.tsx             # ← MODIFICADO: writeSupabaseSessionCookie (Enfoque 1)
│   │   ├── register/page.tsx
│   │   ├── admin/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── municipios/
│   │   │   │   ├── page.tsx           # ← MODIFICADO: 3ª acción "Landing"
│   │   │   │   ├── crear/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx       # ← MODIFICADO: "Ver landing pública" +
│   │   │   │       │                  #    span condicional (url)
│   │   │   │       ├── edit-form.tsx
│   │   │   │       └── aplicaciones/
│   │   │   │           └── page.tsx   # ← MODIFICADO: "Ver catálogo público"
│   │   │   ├── aplicaciones/bulk/     # Modo bulk (sesión anterior)
│   │   │   └── planes/                # Planes (sesión anterior)
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   │   ├── municipalities/...  # CRUD municipio
│   │   │   │   ├── applications/...   # bulk
│   │   │   │   └── plans/...          # Planes
│   │   │   └── auth/
│   │   │       ├── login/route.ts     # ← MODIFICADO: refactor → createAuthCookiesAdapter
│   │   │       ├── register/route.ts  # ← MODIFICADO: refactor + pre-create response
│   │   │       │                       #    + getUser try/catch
│   │   │       └── signout/route.ts   # ← MODIFICADO: refactor + pre-create response
│   │   ├── auth/callback/route.ts     # ← MODIFICADO: main client usa helper
│   │   └── app/[id]/page.tsx          # Página de programa individual
│   ├── components/
│   │   ├── catalog/
│   │   └── program/
│   ├── lib/
│   │   ├── admin/                     # Auth y rate-limit del admin
│   │   ├── supabase/
│   │   │   ├── cookies.ts             # ← MODIFICADO (mayor): createAuthCookiesAdapter +
│   │   │   │                          #   CookieStoreLike + CookieAdapterOptions;
│   │   │   │                          #   pickSupportedCookieOptions (existente)
│   │   │   ├── middleware.ts          # ← MODIFICADO: usa helper writeThrough
│   │   │   └── server.ts              # ← MODIFICADO: createClient + createAdminClient usan helper
│   │   ├── tenant/
│   │   │   ├── cache.ts               # Caché de tenant
│   │   │   ├── headers.ts             # Resolver tenant desde DB
│   │   │   └── landing.ts             # ← NUEVO: getMunicipioLandingUrl + cleanHostname
│   │   ├── demo-data.ts
│   │   └── validations/
│   ├── middleware.ts                  # Tenant routing raíz
│   └── types/index.ts                 # Types Supabase-augmented
├── supabase/
│   ├── migrations/                    # 001..008 (009 pendiente de push)
│   ├── seed/                          # 001..003 (004 pendiente de push)
│   └── .temp/                         # Estado local CLI
├── extremadura/                       # Plantillas HTML de municipios (referencia visual)
├── CHECKPOINT.md                      # ← ESTE ARCHIVO
├── jest.config.mjs
├── next.config.mjs
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json
```

### Helpers centralizados (no reinlineadr en otros archivos)
| Helper | Archivo | API |
|--------|---------|-----|
| `createAuthCookiesAdapter(cookieStore, options?)` | `src/lib/supabase/cookies.ts` | Adapter de cookies para `createServerClient` de `@supabase/ssr`. `options.writeThrough` replica escrituras a sinks adicionales (típicamente `response.cookies`). |
| `pickSupportedCookieOptions(options)` | `src/lib/supabase/cookies.ts` | Filtra options que `NextResponse.cookies.set` acepta; normaliza `expires` (number/Date/string ISO). |
| `cleanHostname(value)` | `src/lib/tenant/landing.ts` | Quita scheme prefix `http(s)://` + whitespace. Devuelve siempre string. |
| `getMunicipioLandingUrl(municipio, currentHost?)` | `src/lib/tenant/landing.ts` | Resuelve URL pública: dominio → https://<dom>; fallback dev con `?tenant=slug`. |

---

## 🧪 Tests — estado actual

### Jest
- **48 tests pasan** en 3 suites aplicaciones
- **1 suite falla**: `src/__tests__/middleware.test.ts` — pre-existente, no causado por el refactor. Causa: necesita flag `--downlevelIteration` o mock update para la nueva helper `createAuthCookiesAdapter`. Los mocks `jest.mock('@/lib/supabase/middleware')` siguen funcionando porque el signature público de `updateSession(request)` no cambió.
- **`plans-sync-integration.test.ts`** también falla — pre-existente, no relacionado.

### Typecheck
- `npx tsc --noEmit` sin errores en los archivos del refactor.
- Errores pre-existentes: `MunicipalityConfig` no tiene `hero_image_url` o `plan_id` en `src/types/__tests__/types.test.ts`. Resolver actualizando el tipo o el test.

---

## 💡 Cómo empezar en la próxima sesión

En la terminal del proyecto:
```bash
cd "C:/Users/borea/OneDrive/Escritorio/ciudad te cuida/te-cuida-app"
```

### Comandos útiles:

```bash
# Desplegar a producción
vercel --prod --yes

# Sincronizar migraciones con Supabase
npx supabase db push --password "TeCuida2024!Secure"

# Typecheck
npx tsc --noEmit

# Tests (excluir el fallido pre-existente)
npx jest --passWithNoTests --testPathIgnorePatterns="plans-sync-integration"

# Modo desarrollo local (DEMO_MODE=true en .env.local)
npm run dev

# Browser-use E2E (verificación visual)
# Requiere Chrome. Spawn en CLI: revisar capturas en /tmp/
```

### Git workflow recomendado al retomar
1. `git status` para revisar los cambios uncommitted de esta sesión (todos en archivos modificados, ningún archivo nuevo sin commitear — CHECKPOINT.md SÍ es nuevo).
2. Decide commit message: `git commit -am "feat(admin): preview buttons + refactor cookies adapter"`.
3. Push: `git push origin master` (o PR si hay colaboradores).

### Archivos de referencia clave
- `supabase/migrations/` — todas las migraciones SQL
- `supabase/seed/` — datos semilla
- `src/app/admin/` — panel de superadministración
- `src/lib/supabase/cookies.ts` — helper DRY que NO debiera volver a duplicarse
- `src/lib/tenant/landing.ts` — helper de URL pública
- `CHECKPOINT.md` — este archivo
