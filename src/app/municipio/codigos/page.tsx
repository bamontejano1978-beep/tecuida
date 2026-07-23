import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminAccess } from '@/lib/admin/activities'
import { createAdminClient } from '@/lib/supabase/server'
import { isInviteCodesConfigured } from '@/lib/auth/municipal-invite-codes'
import InviteCodesManager from '@/app/admin/municipios/[id]/codigos/invite-codes-manager'

interface CodeRow {
  id: string
  code_value: string | null
  code_prefix: string
  estado: 'disponible' | 'reservado' | 'consumido' | 'revocado'
  expires_at: string | null
  consumed_at: string | null
  created_at: string
}

interface BatchRow {
  id: string
  nombre: string
  cantidad: number
  expires_at: string | null
  estado: 'activo' | 'revocado'
  created_at: string
  municipal_invite_codes: CodeRow[]
}

export default async function MunicipalInviteCodesPage() {
  const access = await getAdminAccess()
  if (!access) redirect('/login?error=unauthorized')
  if (access.is_superadmin || !access.municipality_id) redirect('/admin')

  const municipalityId = access.municipality_id
  const supabase = createAdminClient()
  const [{ data: municipality }, { data: batchData }] = await Promise.all([
    supabase
      .from('municipalities')
      .select('id, nombre_municipio, invite_codes_required')
      .eq('id', municipalityId)
      .eq('oculto_admin', false)
      .single(),
    supabase
      .from('municipal_invite_batches')
      .select('id, nombre, cantidad, expires_at, estado, created_at, municipal_invite_codes(id, code_value, code_prefix, estado, expires_at, consumed_at, created_at)')
      .eq('municipality_id', municipalityId)
      .order('created_at', { ascending: false }),
  ])

  if (!municipality) redirect('/login?error=unauthorized')

  const now = Date.now()
  const batches = ((batchData || []) as unknown as BatchRow[]).map((batch) => {
    const effectiveStates = batch.municipal_invite_codes.map((code) =>
      code.estado === 'disponible' && code.expires_at && new Date(code.expires_at).getTime() <= now
        ? 'caducado'
        : code.estado,
    )
    type EffectiveCodeStatus = CodeRow['estado'] | 'caducado'
    return {
      id: batch.id,
      nombre: batch.nombre,
      cantidad: batch.cantidad,
      expires_at: batch.expires_at,
      estado: batch.estado,
      created_at: batch.created_at,
      disponibles: effectiveStates.filter((state) => state === 'disponible').length,
      reservados: effectiveStates.filter((state) => state === 'reservado').length,
      consumidos: effectiveStates.filter((state) => state === 'consumido').length,
      caducados: effectiveStates.filter((state) => state === 'caducado').length,
      revocados: effectiveStates.filter((state) => state === 'revocado').length,
      codes: batch.municipal_invite_codes
        .map((code) => ({
          id: code.id,
          value: code.code_value,
          prefix: code.code_prefix,
          estado: (code.estado === 'disponible' && code.expires_at && new Date(code.expires_at).getTime() <= now
            ? 'caducado'
            : code.estado) as EffectiveCodeStatus,
          expires_at: code.expires_at,
          consumed_at: code.consumed_at,
          created_at: code.created_at,
        }))
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    }
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/municipio/estadisticas"
        className="text-sm font-medium text-emerald-700 hover:text-emerald-600"
      >
        ← Volver a estadísticas
      </Link>
      <div className="mb-8 mt-3">
        <h1 className="text-2xl font-bold text-gray-900">Códigos de acceso</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestiona el acceso de nuevos residentes de {municipality.nombre_municipio}.
        </p>
      </div>
      <InviteCodesManager
        municipalityId={municipality.id}
        municipalityName={municipality.nombre_municipio}
        required={Boolean(municipality.invite_codes_required)}
        configured={isInviteCodesConfigured()}
        batches={batches}
        apiEndpoint="/api/municipio/invite-codes"
      />
    </div>
  )
}
