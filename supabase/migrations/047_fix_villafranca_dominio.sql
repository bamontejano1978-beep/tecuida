-- ============================================================
-- TE CUIDA — Migration 047: canonicalize dominio for Villafranca
-- ============================================================
-- Hallazgo post-046: aunque slug se renombró a la forma canónica,
-- el campo `dominio` quedó con el valor histórico sin guiones
-- ('villafrancadelosbarros.tecuida.group'). Esto bloquea el botón
-- admin "Ver landing pública" en `src/app/admin/municipios/[id]/page.tsx`
-- y `/admin/municipios/[id]/aplicaciones/page.tsx`, porque
-- `getMunicipioLandingUrl()` lee `municipio.dominio`. Sin normalización,
-- ese botón apunta a un subdominio que extrae `villafrancadelosbarros`
-- en el middleware, no encuentra fila en DB (post-046) y devuelve /404.
--
-- Esta migración:
--   a) Normaliza dominio: 'villafrancadelosbarros.tecuida.group' →
--                          'villafranca-de-los-barros.tecuida.group'
--   b) Deja intencionalmente SIN TOCAR hero_image_url y escudo_url:
--      La URL completa apunta a
--      /storage/v1/object/public/municipalities/villafrancadelosbarros/{hero|escudo}.jpg
--      y la carpeta física en Supabase Storage existe bajo ese nombre
--      histórico. Cambiar la cadena sin mover la carpeta físicamente
--      produciría 404 inmediato de los assets. El rename del folder
--      en Storage debe hacerse vía Dashboard o API (service_role_key)
--      y luego una migración posterior actualizar las URLs
--      en DB. Por ahora la consistencia es: storage path =
--      old-slug-encoded-as-no-hyphens. La parte textual del path
--      (carpeta) no se renormaliza porque rompería los renders en
--      producción hasta que se sincronice con el lado Supabase.
--   c) Idempotente: el WHERE filtra sólo la forma incorrecta en el
--      momento del push; si se re-ejecuta, la segunda vez es no-op.
--
-- Saneamiento complementario:
--   * Añade CHECK opcional de formato de dominio para que nuevas
--     filas tengan el patrón DNS-friendly (a-z, 0-9, ., -). No va en
--     DO block por la cantidad de dominios ya válidos en producción;
--     si el CHECK rechaza alguno histórico, next migration lo ajusta.
-- ============================================================

-- (a) Normalizar dominio (solo si está en la forma incorrecta)
UPDATE public.municipalities
   SET dominio = 'villafranca-de-los-barros.tecuida.group'
 WHERE slug = 'villafranca-de-los-barros'
   AND dominio <> 'villafranca-de-los-barros.tecuida.group';

-- Comentario en DB para futuras auditorías explicando el split deliberado.
COMMENT ON COLUMN public.municipalities.dominio IS
  'Dominio público del subdominio TE CUIDA del municipio. #047 renombró villafrancadelosbarros.tecuida.group -> villafranca-de-los-barros.tecuida.group en DB; las URLs de storage (hero_image_url/escudo_url) NO se mueven aún porque requieren rename físico del folder en Supabase Storage — ver nota en migration 047.';

-- (c) Limpieza: si el dominio tenía prefijo http(s):// pegado por error,
--     defensivamente lo quitamos. Es no-op si ya está limpio.
UPDATE public.municipalities
   SET dominio = LTRIM(REPLACE(REPLACE(REPLACE(LOWER(dominio), 'https://', ''), 'http://', ''), ' ', ''), '.')
 WHERE dominio LIKE '%http%' OR dominio LIKE '% %';

-- (c-bis) Defensa para INSERTs futuros: CHECK que el dominio no incluya
--         scheme prefix ni espacios. No se aplica retroactivamente porque
--         podemos tener dominios válidos ya en producción que no
--         necesitamos tocar — la columna acepta variantes razonables.
--         Mantenemos la validación en el INSERT/UPDATE path vía el código
--         de la app (src/lib/tenant/landing.ts:cleanHostname) por ahora.
-- NOTA: añadir un CHECK agresivo de dominio podría romper filas legacy.
--       Se omite intencionalmente y se documenta para revisión futura.
