import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ActivateOdsClient from './activate-client'

export const metadata = {
  title: 'Activar código ODS · VCA TE CUIDA',
  description: 'Activa el código que has recibido por correo y elige tu recurso.',
}

export default async function ActivarPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/activar')

  return <ActivateOdsClient />
}
