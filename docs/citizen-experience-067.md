# Experiencia ciudadana y calidad de biblioteca

## Cambios

- El dominio general muestra un directorio real de municipios, con buscador. El enlace `/?tenant=slug` permite distribuir accesos y QR municipales.
- El municipio validado se recuerda mediante una cookie de preferencia HttpOnly. No acredita residencia ni cambia la pertenencia de una cuenta.
- El registro conserva el destino original, muestra el municipio y permite volver al catálogo sin crear una cuenta. El código solo se oculta cuando el municipio permite registro abierto; el servidor conserva su validación.
- El inicio ofrece accesos directos, favoritos y la última aplicación abierta, además de la próxima actividad. Se ha retirado el bloque promocional redundante de la lanzadera.
- Favoritos y última apertura se guardan por usuario en `user_application_state`. No se recopilan respuestas, notas ni contenido de las aplicaciones para esta función.
- Las fichas públicas y de la lanzadera explican el público, la dedicación y el guardado. Los datos contrastados están en `src/lib/applications/citizen-facts.ts`.
- Organizatron y Salud Adolescente se abren en un marco municipal, con regreso a la lanzadera y alternativa en otra pestaña. Estas versiones no requieren una segunda cuenta: Organizatron conserva su selección de perfil local.
- `/municipio/estadisticas` muestra consultas, aperturas, usuarios y visitas sin apertura en 24 horas. Solo utiliza analítica consentida y oculta las aplicaciones con menos de cinco usuarios identificados en la ventana de 30 días.
- `/admin/aplicaciones/calidad` revisa descripciones, iconos, posibles duplicados, contenido y enlaces autorizados. Guarda resultado y fecha; no retira aplicaciones automáticamente.

## Límites del guardado

Los favoritos se sincronizan con la cuenta. El contenido de cada aplicación conserva su mecanismo de guardado original. Varias aplicaciones usan almacenamiento local y no sincronizan sus notas entre dispositivos.

Algunos navegadores separan el almacenamiento de una aplicación embebida del de su pestaña propia. La opción de abrir en otra pestaña permite acceder directamente al origen donde estaban los avances anteriores. No se migran ni copian estos datos.

El marco municipal no es un proveedor SSO universal. Si una futura aplicación introduce autenticación propia, necesitará una integración específica; no se envían tokens ni contraseñas por la URL.

## Publicación

1. Revisar y aplicar `supabase/migrations/067_citizen_launcher_and_library_quality.sql` al entorno de destino.
2. Desplegar el código de TE CUIDA después de la migración.
3. Verificar favoritos con una cuenta ciudadana, métricas con un gestor y revisión de biblioteca con un superadministrador.

La migración es aditiva. Las funciones de escritura y agregación solo son ejecutables por el servicio del servidor. La tabla personal permite leer únicamente las filas del propio usuario mediante RLS. La eliminación de la cuenta elimina sus favoritos y aperturas mediante cascada.

Sin la migración, las páginas muestran avisos de indisponibilidad y no dan por guardados los favoritos.

## Verificación local

```powershell
npm run typecheck
npm run lint
npm test -- --silent
npm install --prefix tmp/citizen-verification --no-save --package-lock=false @electric-sql/pglite
node scripts/verify-launcher-migration.mjs
node scripts/verify-citizen-experience.mjs
npm run build
```

El test SQL usa PostgreSQL embebido y temporal. El test visual arranca Next y un servidor local de datos ficticios, comprueba móvil/escritorio y guarda capturas en `tmp/citizen-verification/screens`. Lee las aplicaciones externas públicas para comprobar su visualización; no crea usuarios ni escribe en producción. Las capturas usan datos de prueba y no representan las estadísticas reales de ningún municipio.
