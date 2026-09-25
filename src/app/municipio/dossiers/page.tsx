import { redirect } from 'next/navigation'
import { getAdminAccess } from '@/lib/admin/activities'
import { DOSSIERS } from '@/lib/dossiers/catalog'
import DossiersGrid from './dossiers-grid'

export const metadata = {
  title: 'Dossieres · Panel municipal',
}

export default async function MunicipioDossiersPage() {
  // Guard explícito: el panel municipal exige sesión de gestor municipal
  // o superadmin. (El layout también protege, pero la página es estática y
  // podría servirse en build sin sesión.)
  const access = await getAdminAccess()
  if (!access) redirect('/login?error=unauthorized')

  const programa = DOSSIERS.filter((d) => d.kind === 'program')
  const plataforma = DOSSIERS.filter((d) => d.kind === 'platform')
  const apps = DOSSIERS.filter((d) => d.kind === 'app')

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dossieres del programa</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Documentos PDF listos para imprimir, enviar por correo o compartir con
          medios y ciudadanía: describen cada aplicación, el modelo de acceso y
          el programa ODS con capturas reales de la plataforma.
        </p>
      </header>

      {[
        { titulo: 'Programa', items: programa },
        { titulo: 'Plataforma', items: plataforma },
        { titulo: 'Aplicaciones', items: apps },
      ]
        .filter((s) => s.items.length > 0)
        .map((seccion) => (
          <section key={seccion.titulo} className="mb-10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {seccion.titulo}
            </h2>
            <DossiersGrid items={seccion.items} />
          </section>
        ))}

      <p className="mt-8 text-xs text-gray-400">
        ¿Falta algún dossier o necesitas una versión adaptada? Solicítalo al
        equipo de la plataforma.
      </p>
    </div>
  )
}
