import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import InviteCodesManager from './invite-codes-manager'
import { isInviteCodesConfigured } from '@/lib/auth/municipal-invite-codes'

interface CodeRow {
  estado: 'disponible' | 'reservado' | 'consumido' | 'revocado'
  expires_at: string | null
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

export default async function InviteCodesPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient()
  const [{ data: municipality }, { data: batchData }] = await Promise.all([
    supabase
      .from('municipalities')
      .select('id, nombre_municipio, slug, invite_codes_required')
      .eq('id', params.id)
      .eq('oculto_admin', false)
      .single(),
    supabase
      .from('municipal_invite_batches')
      .select('id, nombre, cantidad, expires_at, estado, created_at, municipal_invite_codes(estado, expires_at)')
      .eq('municipality_id', params.id)
      .order('created_at', { ascending: false }),
  ])

  if (!municipality) notFound()

  const now = Date.now()
  const batches = ((batchData || []) as unknown as BatchRow[]).map((batch) => {
    const effectiveStates = batch.municipal_invite_codes.map((code) =>
      code.estado === 'disponible' && code.expires_at && new Date(code.expires_at).getTime() <= now
        ? 'caducado'
        : code.estado,
    )
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
    }
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/admin/municipios/${params.id}`}
        className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
      >
        ← Volver al municipio
      </Link>
      <div className="mt-3 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Códigos municipales</h1>
        <p className="mt-1 text-sm text-gray-500">
          Control de acceso para residentes de {municipality.nombre_municipio}.
        </p>
      </div>
      <InviteCodesManager
        municipalityId={municipality.id}
        municipalityName={municipality.nombre_municipio}
        required={Boolean(municipality.invite_codes_required)}
        configured={isInviteCodesConfigured()}
        batches={batches}
      />
    </div>
  )
}
