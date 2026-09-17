import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { MUNICIPALITY_COOKIE, municipalitySlugCandidates, municipalitySlugFromHost, validMunicipalitySlug } from '@/lib/tenant/entry-context'

export async function GET(request: Request) {
  const slug = municipalitySlugFromHost(new URL(request.url).host)
    || validMunicipalitySlug(new URL(request.url).searchParams.get('tenant'))
    || validMunicipalitySlug(cookies().get(MUNICIPALITY_COOKIE)?.value)
  if (!slug) return NextResponse.json({ municipality: null })
  // `in` con el slug y sus alias publicados: el mismo municipio responde tanto
  // en `villafrancadelosbarros.tecuida.group` como en la forma con guiones, y
  // el formulario de registro necesita saber si ese municipio exige código.
  const { data, error } = await createAdminClient().from('municipalities')
    .select('slug, nombre_municipio, escudo_url, invite_codes_required')
    .in('slug', municipalitySlugCandidates(slug))
    .not('estado_suscripcion', 'in', '(suspendida,cancelada)')
    .order('slug', { ascending: true })
    .limit(1).maybeSingle()
  const response = NextResponse.json({ municipality: error ? null : data })
  if (data && !error) response.cookies.set(MUNICIPALITY_COOKIE, data.slug, {
    httpOnly: true, sameSite: 'lax', secure: new URL(request.url).protocol === 'https:', path: '/', maxAge: 15552000,
  })
  return response
}
