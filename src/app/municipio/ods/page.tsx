import Link from 'next/link'
import { getAdminAccess } from '@/lib/admin/activities'
import { createAdminClient } from '@/lib/supabase/server'
import { hasBatchAppColumn } from '@/lib/ods/batch-app-capability'
import OdsManager from './ods-manager'

export const metadata = {
  title: 'Programa ODS · Panel municipal',
}

interface OdsCodeRow {
  id: string
  code_value: string | null
  code_prefix: string
  estado: string
  expires_at: string | null
  destination_email_encrypted: string | null
  sent_at: string | null
  sent_count: number
  consumed_at: string | null
  batch_id: string
  batch_nombre: string
}

interface BatchRow {
  id: string
  nombre: string
  cantidad: number
  estado: string
  expires_at: string | null
  created_at: string
}

export default async function MunicipioOdsPage() {
  const access = await getAdminAccess()
  if (!access || (!access.is_superadmin && !access.municipality_id)) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-sm text-gray-600">
        No autorizado. Este panel es para gestores municipales.
      </div>
    )
  }

  const supabase = createAdminClient()

  const municipalityId = access.municipality_id as string
  let municipalityName = ''

  // Superadmin sin municipio ve aviso; gestor municipal ve su municipio.
  if (access.is_superadmin && !municipalityId) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-sm text-gray-600">
        Como superadmin, gestiona el programa ODS desde la ficha de cada municipio.
      </div>
    )
  }

  // Capacidad 069: si la columna application_id aún no existe en BD,
  // el join a applications no está disponible y se lista sin app asignada.
  const has069 = await hasBatchAppColumn()
  const batchSelect = has069
    ? 'id, nombre, cantidad, estado, expires_at, created_at, application:applications(nombre)'
    : 'id, nombre, cantidad, estado, expires_at, created_at'

  const [{ data: municipality }, { data: batchesRaw }, { data: codes }] = await Promise.all([
    supabase
      .from('municipalities')
      .select('nombre_municipio, grant_mode, invite_codes_required')
      .eq('id', municipalityId)
      .single(),
    supabase
      .from('municipal_invite_batches')
      .select(batchSelect)
      .eq('municipality_id', municipalityId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('municipal_invite_codes')
      .select(
        `id, code_value, code_prefix, estado, expires_at, destination_email_encrypted,
         sent_at, sent_count, consumed_at, batch_id,
         batch:municipal_invite_batches(nombre)`,
      )
      .eq('municipality_id', municipalityId)
      .order('created_at', { ascending: false })
      .limit(1000),
  ])

  municipalityName = (municipality?.nombre_municipio as string) || ''

  // Cast manual: el select del lote es dinámico (capacidad 069).
  const batches = (batchesRaw ?? []) as unknown as Array<{
    id: string
    nombre: string
    cantidad: number
    estado: string
    expires_at: string | null
    created_at: string
    application?: { nombre?: string } | null
  }>

  // Descifra los destinos para el panel (solo administración).
  const { decryptDestinationEmail } = await import('@/lib/ods/destination-crypto')
  const odsCodes: OdsCodeRow[] = ((codes || []) as unknown as Record<string, unknown>[]).map(
    (row) => ({
      id: row.id as string,
      code_value: (row.code_value as string | null) || null,
      code_prefix: (row.code_prefix as string) || '',
      estado: row.estado as string,
      expires_at: (row.expires_at as string | null) || null,
      destination_email_encrypted: (row.destination_email_encrypted as string | null) || null,
      sent_at: (row.sent_at as string | null) || null,
      sent_count: (row.sent_count as number) || 0,
      consumed_at: (row.consumed_at as string | null) || null,
      batch_id: row.batch_id as string,
      batch_nombre:
        ((row.batch as { nombre?: string } | null)?.nombre as string) || '',
    }),
  )
  // adjunta el email descifrado
  const codesWithEmail = odsCodes.map((c) => ({
    ...c,
    destination_email: c.destination_email_encrypted
      ? decryptDestinationEmail(c.destination_email_encrypted)
      : null,
  }))

  const batchRows: BatchRow[] = (batches || []).map((b) => ({
    id: b.id,
    nombre: b.nombre,
    cantidad: b.cantidad,
    estado: b.estado,
    expires_at: b.expires_at,
    created_at: b.created_at,
    application_nombre: has069 ? b.application?.nombre || null : null,
  }))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
            Programa ODS · {municipalityName}
          </p>
          <h1 className="text-2xl font-bold text-gray-900">
            Una idea para mejorar Villafranca. Un recurso para cuidarte a ti.
          </h1>
        </div>
        <Link href="/municipio/codigos" className="text-sm font-medium text-indigo-600 hover:underline">
          Códigos clásicos →
        </Link>
      </div>

      <OdsManager
        municipalityId={municipalityId}
        batches={batchRows}
        codes={codesWithEmail}
      />
    </div>
  )
}
