/**
 * Layout compartido para páginas de autenticación (login, registro)
 *
 * Proporciona un diseño centrado vertical y horizontalmente
 * con un card blanco para el formulario, ideal para páginas
 * que no requieren la UI completa de la aplicación.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">{children}</div>
    </div>
  )
}
