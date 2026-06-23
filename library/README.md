# 📚 Biblioteca de aplicaciones — TE CUIDA

Cada app de TE CUIDA es un **proyecto independiente** desplegado en su propia URL.  
El catálogo (`tecuida.group`) actúa como **capa de discovery**: muestra las fichas
de las apps y enlaza a sus URLs reales.

## 🏗️ Arquitectura

```
tecuida.group  ←→  Catálogo central (Next.js + Supabase)
                       │
    ┌──────────────────┼──────────────────┐
    ▼                  ▼                  ▼
miapp.tecuida.group  reto30.vercel.app   tool.netlify.app
   (App 1)            (App 2)            (App 3)
```

Cada app es un proyecto autónomo con su propio `package.json`, build, y deploy.
Se registra en el catálogo vía API para que los ciudadanos la encuentren.

## 🚀 Crear una app nueva

### 1. Copia el template

```bash
cp -r library/template library/mi-app
cd library/mi-app
npm install
```

### 2. Personaliza los metadatos

Edita `src/config.ts`:

```ts
export const appMeta = {
  nombre: 'Mi App Increíble',
  descripcion: 'Una app que mejora la vida de los ciudadanos...',
  app_slug: 'mi-app',
  tipo: 'herramienta',    // programa | herramienta | encuesta | recurso
  brand_color: '#7c3aed', // Color de marca en hex
  category_id: '11111111-0000-0000-0000-000000000001', // Bienestar emocional
  thumbnail_url: 'https://...', // Imagen de portada en el catálogo
}
```

### 3. Configura el .env

```bash
cp .env.example .env
```

Rellena `TECUIDA_API_KEY` (la obtienes del panel de admin de Te Cuida).

### 4. Desarrolla tu app

Edita `src/pages/Home.tsx` y añade tus componentes.  
El template ya incluye:

| Herramienta | ¿Para qué? |
|-------------|------------|
| Vite + React + TypeScript | Build rápido y tipado |
| Tailwind CSS | Estilos utility-first |
| vite-plugin-pwa | Instalación PWA automática |
| `src/config.ts` | Metadatos centralizados |
| `scripts/register.ts` | Registro en el catálogo |
| `scripts/deploy.sh` | Deploy a Vercel |

### 5. Despliega

```bash
npm run deploy
```

Esto compila la app y la sube a Vercel en producción.  
La URL aparecerá al final. **Cópiala a `VITE_APP_URL` en tu `.env`.**

### 6. Registra en el catálogo

```bash
npm run register
```

Esto crea la ficha de tu app en `tecuida.group`.  
Los ciudadanos la verán en el catálogo de su municipio.

## 📋 Requisitos técnicos

- **Node.js** ≥ 18
- **Vercel CLI** (`npm i -g vercel`) para deploy
- **API key de Te Cuida** para registro

## 🎨 Convenciones

| Campo | Descripción |
|-------|-------------|
| `app_slug` | Solo minúsculas, números y guiones. Define el subdominio. |
| `brand_color` | Hex de 6 dígitos (`#rrggbb`). Se usa en la ficha del catálogo. |
| `tipo` | `programa`, `herramienta`, `encuesta` o `recurso`. |
| `category_id` | UUID de la categoría en Supabase. |

## 🔄 Flujo de actualización

1. Cambia el código de tu app
2. `npm run deploy` — actualiza la PWA en Vercel
3. Si cambiaste metadatos (nombre, descripción, etc.), edítalos también en el panel de admin de Te Cuida

## 🧩 Apps existentes en esta biblioteca

| App | Slug | URL |
|-----|------|-----|
| _(template)_ | — | — |

_Añade tus apps aquí cuando las crees._
