import { appMeta } from './config'
import Home from './pages/Home'

/**
 * App raíz — entry point de la PWA.
 *
 * La página principal (`/`) renderiza Home con los metadatos
 * de la app definidos en `config.ts`.
 *
 * Para añadir enrutamiento: `npm install react-router-dom`
 * y envuelve las rutas en <BrowserRouter>.
 *
 * La PWA se instala automáticamente gracias a vite-plugin-pwa.
 */
export default function App() {
  return <Home meta={appMeta} />
}
