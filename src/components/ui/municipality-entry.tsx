'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function MunicipalityEntry({ tenant, onResolved }: {
  tenant: string | null
  onResolved?: (required: boolean) => void
}) {
  const [municipality, setMunicipality] = useState<{ nombre_municipio: string; slug: string } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/municipality-context${tenant ? `?tenant=${encodeURIComponent(tenant)}` : ''}`, { signal: controller.signal })
      .then((response) => response.json()).then(({ municipality: value }) => {
        setMunicipality(value)
        onResolved?.(!value || value.invite_codes_required)
      }).catch(() => {})
    return () => controller.abort()
  }, [tenant, onResolved])
  return <div className="mt-4 border-y border-gray-200 py-3 text-center text-sm">
    {municipality && <p className="mb-2 font-semibold text-gray-900">{municipality.nombre_municipio}</p>}
    <Link className="text-indigo-700 underline" href={municipality ? `/?tenant=${encodeURIComponent(municipality.slug)}` : '/'}>Explorar sin registrarme</Link>
    <Link className="ml-4 text-gray-600 underline" href="/municipios">Elegir municipio</Link>
  </div>
}
