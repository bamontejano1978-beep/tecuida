# TE CUIDA

Plataforma municipal multitenant de bienestar y participación ciudadana. Cada
municipio dispone de su propia landing, catálogo, actividades y área de gestión,
manteniendo los datos aislados por `municipality_id`.

## Arquitectura

- Next.js 14 con App Router, React y TypeScript estricto.
- Supabase para autenticación, PostgreSQL, RLS y almacenamiento.
- Upstash Redis para caché de tenants y rate limiting distribuido.
- Zod para validar entradas de formularios y API.
- Jest, Testing Library, Playwright y pgTAP para pruebas.
- Vercel para despliegue y dominios multitenant.

Las áreas principales están en:

- `src/app`: páginas, Server Components y rutas API.
- `src/components`: componentes de catálogo, landing, programas y administración.
- `src/lib`: autenticación, Supabase, tenants, validaciones y reglas de dominio.
- `supabase/migrations`: evolución versionada de la base de datos.
- `supabase/tests`: pruebas de integración PostgreSQL.
- `library`: plantilla para aplicaciones independientes del catálogo.

## Requisitos

- Node.js 20.
- npm.
- Supabase CLI y Docker para ejecutar las pruebas de base de datos.

## Configuración local

```bash
npm ci
cp .env.local.example .env.local
npm run dev
```

Completa `.env.local` con las credenciales de un entorno de desarrollo. Nunca
copies contraseñas, claves de servicio ni cuentas administrativas al repositorio.

Variables principales:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_BASE_DOMAIN`
- `NEXT_PUBLIC_SITE_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `REGISTER_APP_API_KEY`
- `DEMO_MODE`
- `HEALTH_ALERT_WEBHOOK_URL` (opcional, para avisos operativos)

## Personalizacion municipal

Cada municipio puede utilizar la landing clasica o la variante editorial desde
su ficha de administracion. La variante editorial permite configurar subtitulo,
introduccion, texto institucional, etiquetas, ODS visibles, orden de secciones y
visibilidad de programas y ODS. El formulario incluye una vista previa local que
no publica cambios hasta guardar.

Las aplicaciones se gestionan desde un registro unico. La URL publica canonica
es `/apps/<slug-o-id>` y resuelve de forma uniforme aplicaciones nativas,
paquetes ZIP y destinos externos. El panel de cada aplicacion muestra el tipo de
alojamiento, el destino efectivo y accesos para comprobar ambas rutas.
Cada asignacion municipal puede incorporar un icono propio para la landing y el
catalogo; si no se configura, hereda automaticamente el icono global.

## Calidad y pruebas

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run test:e2e
npm run build
```

Para validar migraciones y RPC en una base local:

```bash
supabase start
npm run test:db
```

Los cambios no deben integrarse si falla cualquiera de estos controles. Las
pruebas SQL son especialmente importantes para aforo, concurrencia, RLS y
aislamiento entre municipios.

## Roles y seguridad

- `ciudadano`: consulta el catálogo y gestiona sus propias inscripciones.
- `admin_municipio`: administra únicamente su municipio.
- `superadmin`: administra la plataforma completa.

La `service_role` solo puede utilizarse en código servidor. Las inscripciones se
crean y cancelan mediante RPC PostgreSQL; no se permite escribir directamente en
`activity_inscriptions`, porque se saltarían las comprobaciones de aforo y tenant.

Si un secreto llega a Git, hay que rotarlo primero y después limpiar el historial.
Eliminarlo únicamente en el último commit no lo invalida.

## Migraciones y despliegue

1. Crear una migración nueva; no editar una ya aplicada en producción.
2. Ejecutar las pruebas locales de base de datos.
3. Revisar el SQL de RLS, permisos y funciones `SECURITY DEFINER`.
4. Aplicar la migración primero en un entorno de pruebas.
5. Desplegar la aplicación después de confirmar la compatibilidad de esquema.

Vercel ejecuta `npm run build`. GitHub Actions valida lint, tipos, Jest,
cobertura, migraciones, pruebas PostgreSQL y navegacion real con Playwright en
cada push o pull request.

## Operación

El endpoint `/api/admin/health` comprueba conectividad sin exponer mensajes
internos de la base de datos. Las tareas operativas y credenciales deben vivir en
el gestor de secretos y en la documentación privada del equipo, no en archivos de
checkpoint versionados.

Los errores del navegador se registran de forma sanitizada mediante
`/api/client-errors`. El endpoint de salud incorpora un identificador de
despliegue y puede avisar a un webhook configurando `HEALTH_ALERT_WEBHOOK_URL`.
La analitica funcional se envia a `/api/analytics` solo despues del consentimiento
del visitante; el servidor valida los eventos, aplica limite distribuido y
determina el municipio de usuarios autenticados sin confiar en el navegador.

La migracion `049_platform_operability.sql` incorpora el RPC agregado
`get_municipality_stats`, que calcula las estadisticas municipales dentro de
PostgreSQL para evitar descargar filas individuales al servidor web. Debe
aplicarse antes de desplegar esta version; mientras tanto, el panel conserva una
ruta de compatibilidad con el calculo anterior.
