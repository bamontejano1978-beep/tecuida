const mockGetUser = jest.fn()
const mockMaybeSingle = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: { getUser: mockGetUser } }),
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: mockMaybeSingle }),
      }),
    }),
  }),
}))

import { getAdminAccess } from '@/lib/admin/activities'

describe('getAdminAccess con línea de negocio exclusiva', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'admin-1', email: 'admin@example.com' } },
    })
  })

  it('rechaza al gestor municipal cuando la función exige superadmin', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        email: 'gestor@example.com',
        rol: 'admin_municipio',
        municipality_id: 'municipio-1',
      },
    })

    await expect(getAdminAccess({ superadminOnly: true })).resolves.toBeNull()
  })

  it('mantiene el acceso municipal para las funciones propias del gestor', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        email: 'gestor@example.com',
        rol: 'admin_municipio',
        municipality_id: 'municipio-1',
      },
    })

    await expect(getAdminAccess()).resolves.toMatchObject({
      is_superadmin: false,
      municipality_id: 'municipio-1',
    })
  })

  it('autoriza al superadministrador en la línea exclusiva', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        email: 'super@example.com',
        rol: 'superadmin',
        municipality_id: 'platform',
      },
    })

    await expect(getAdminAccess({ superadminOnly: true })).resolves.toMatchObject({
      is_superadmin: true,
    })
  })
})
