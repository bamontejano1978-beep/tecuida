import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { requireSuperadminPage } from '@/lib/admin/page-auth'
import InviteCodesManager from './invite-codes-manager'
import { isInviteCodesConfigured } from '@/lib/auth/municipal-invite-codes'
import { getBatchCapability } from '@/lib/ods/batch-app-capability'

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
  application_id: string | null
  proposito: 'acceso' | 'ods' | null
  municipal_invite_codes?: CodeRow[] | null
}

export default async function InviteCodesPage({ params }: { params: { id: string } }) {
  await requireSuperadminPage()
  const supabase = createAdminClient()
  // Capacidades de BD (migraciones 069/070): si una columna aún no existe,
  // se selecciona sin ella y el panel oculta esa función (modo degradado).
  const capability = await getBatchCapability()
  const batchSelectParts = ['id, nombre, cantidad, expires_at, estado, created_at']
  if (capability.hasAppColumn) {
    batchSelectParts.push('application_id, application:applications(nombre)')
  }
  if (capability.hasPurposeColumn) batchSelectParts.push('proposito')
  // Embed de los códigos del lote: alimenta la tabla y los contadores.
  // Sin él, PostgREST omite la relación y el panel mostraría lotes vacíos.
  batchSelectParts.push(
    'municipal_invite_codes(id, code_value, code_prefix, estado, expires_at, consumed_at, created_at)',
  )
  const batchSelect = batchSelectParts.join(', ')

  const [{ data: municipality }, { data: batchData }, { data: appData }] = await Promise.all([
    supabase
      .from('municipalities')
      .select('id, nombre_municipio, slug, invite_codes_required')
      .eq('id', params.id)
      .eq('oculto_admin', false)
      .single(),
    supabase
      .from('municipal_invite_batches')
      .select(batchSelect)
      .eq('municipality_id', params.id)
      .order('created_at', { ascending: false }),
    // Apps publicadas del municipio (migración 069): para el selector de
    // pre-asignación de app al generar un lote.
    supabase
      .from('municipality_applications')
      .select('application_id, application:applications!inner(id, nombre)')
      .eq('municipality_id', params.id)
      .eq('activa', true)
      .eq('publication_status', 'publicada')
      .order('application_id'),
  ])

  if (!municipality) notFound()

  interface AppOptionRow {
    application: { id: string; nombre: string } | null
  }
  const applications = ((appData || []) as unknown as AppOptionRow[])
    .map((row) => row.application)
    .filter((app): app is { id: string; nombre: string } => Boolean(app))

  interface BatchWithAppRow {
    application?: { nombre: string } | null
  }

  const now = Date.now()
  const batches = ((batchData || []) as unknown as BatchRow[]).map((batch) => {
    // PostgREST can omit an embedded relation for legacy/incomplete batches.
    // Keep the manager usable and show that batch as empty instead of crashing.
    const codes = Array.isArray(batch.municipal_invite_codes)
      ? batch.municipal_invite_codes
      : []
    const effectiveStates = codes.map((code) =>
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
      application_id: capability.hasAppColumn
        ? ((batch as { application_id?: string | null }).application_id ?? null)
        : null,
      proposito: capability.hasPurposeColumn
        ? ((batch as { proposito?: 'acceso' | 'ods' | null }).proposito ?? 'acceso')
        : 'acceso',
      application_nombre:
        ((batch as unknown as BatchWithAppRow).application?.nombre as string | undefined) || null,
      disponibles: effectiveStates.filter((state) => state === 'disponible').length,
      reservados: effectiveStates.filter((state) => state === 'reservado').length,
      consumidos: effectiveStates.filter((state) => state === 'consumido').length,
      caducados: effectiveStates.filter((state) => state === 'caducado').length,
      revocados: effectiveStates.filter((state) => state === 'revocado').length,
      codes: codes
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
        applications={capability.hasAppColumn ? applications : []}
        showPurposeSelector={capability.hasPurposeColumn}
      />
    </div>
  )
}
