import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { getCitizenTenantForUser } from '@/lib/tenant/citizen-context'
import { getTenantFromHeaders } from '@/lib/tenant/headers'

export default async function MunicipalAppNavigation() {
  const { data: { user } } = await createClient().auth.getUser()
  const tenant = user ? await getCitizenTenantForUser(user.id) : getTenantFromHeaders()
  return <nav aria-label="Volver a tu municipio" className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-2 text-sm text-gray-900">
    <a href={user ? '/dashboard/aplicaciones' : tenant ? `/?tenant=${encodeURIComponent(tenant.slug)}` : '/'} className="flex min-h-11 items-center gap-2 font-semibold">
      <span aria-hidden="true">←</span>{tenant?.escudo_url && <Image src={tenant.escudo_url} alt="" width={28} height={28} className="h-7 w-7 object-contain" />}
      {user ? 'Mis aplicaciones' : 'Aplicaciones municipales'}
    </a>
    <span className="break-words text-gray-600">{tenant?.nombre_municipio || 'TE CUIDA'}</span>
  </nav>
}
