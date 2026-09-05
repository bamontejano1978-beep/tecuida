import { createAdminClient } from '@/lib/supabase/server'

export default async function ApplicationJourneyStats({ municipalityId }: { municipalityId: string }) {
  const { data, error } = await createAdminClient().rpc('municipality_application_journey', { p_municipality: municipalityId })
  return <section className="mt-8 border-t border-gray-200 pt-6" aria-labelledby="journey-title">
    <h2 id="journey-title" className="text-xl font-bold text-gray-900">Descubrimiento y uso de aplicaciones</h2>
    <p className="my-3 max-w-3xl text-sm text-gray-600">Últimos 30 días. Solo actividad con consentimiento analítico. Se ocultan los recuentos con menos de 5 usuarios identificados. «Sin apertura» cuenta visitas de una misma pestaña sin abrir la app en las 24 horas siguientes; no implica abandono definitivo.</p>
    {error ? <p role="status" className="text-sm text-amber-800">Las métricas de aplicaciones no están disponibles en este momento.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="border-b bg-gray-50"><tr><th className="p-3">Aplicación</th><th className="p-3">Consultas</th><th className="p-3">Aperturas</th><th className="p-3">Usuarios activos</th><th className="p-3">Sin apertura en 24 h</th></tr></thead>
      <tbody>{(data as { application_id: string; nombre: string; views: number | null; launches: number | null; active_users: number | null; visits_without_launch: number | null }[] || []).map((row) => <tr key={row.application_id} className="border-b"><th className="p-3 font-medium">{row.nombre}</th><td className="p-3">{row.views ?? 'Datos insuficientes'}</td><td className="p-3">{row.launches ?? 'Datos insuficientes'}</td><td className="p-3">{row.active_users ?? 'Datos insuficientes'}</td><td className="p-3">{row.visits_without_launch ?? 'Datos insuficientes'}</td></tr>)}</tbody>
    </table>{!data?.length && <p className="py-6 text-gray-500">Todavía no hay aplicaciones disponibles para este municipio.</p>}</div>}
  </section>
}
