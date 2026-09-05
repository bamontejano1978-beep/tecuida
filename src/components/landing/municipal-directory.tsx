import Link from 'next/link'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/server'

export default async function MunicipalDirectory({ query = '' }: { query?: string }) {
  const { data, error } = await createAdminClient().from('municipalities')
    .select('slug, nombre_municipio, escudo_url').eq('oculto_admin', false).neq('slug', 'platform')
    .not('estado_suscripcion', 'in', '(suspendida,cancelada)').order('nombre_municipio')
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const municipalities = (data || []).filter((item) => normalize(item.nombre_municipio).includes(normalize(query)))
  return <div className="min-h-screen bg-white text-gray-900">
    <header className="border-b border-gray-200"><nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5"><Link href="/" className="text-xl font-bold">TE CUIDA</Link><Link href="/login" className="min-h-11 py-3 text-sm font-semibold text-emerald-800">Iniciar sesión</Link></nav></header>
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Tu municipio</h1>
      <form action="/municipios" method="get" className="my-6 flex max-w-xl gap-2">
        <label className="flex-1"><span className="sr-only">Buscar municipio</span><input name="q" type="search" defaultValue={query} placeholder="Buscar municipio" className="min-h-12 w-full rounded-md border border-gray-300 px-3" /></label>
        <button className="rounded-md bg-emerald-700 px-4 font-semibold text-white">Buscar</button>
      </form>
      {error ? <p role="alert" className="text-red-700">No se pudieron cargar los municipios. Vuelve a intentarlo.</p> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {municipalities.map((item) => <Link key={item.slug} href={`/?tenant=${encodeURIComponent(item.slug)}`} className="flex min-h-24 items-center gap-4 rounded-lg border border-gray-200 p-4 hover:border-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-700">
          {item.escudo_url ? <Image src={item.escudo_url} alt="" width={48} height={48} className="h-12 w-12 shrink-0 object-contain" /> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-emerald-50 font-bold text-emerald-800">{item.nombre_municipio.slice(0, 1)}</span>}
          <span className="break-words font-semibold">{item.nombre_municipio}</span>
        </Link>)}
      </div>}
      {!error && !municipalities.length && <p className="text-gray-600">No se han encontrado municipios.</p>}
    </main>
  </div>
}
