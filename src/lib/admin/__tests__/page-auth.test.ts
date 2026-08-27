const mockRedirect = jest.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`)
})
const mockGetUser = jest.fn()
const mockMaybeSingle = jest.fn()

jest.mock('next/navigation', () => ({
  redirect: (path: string) => mockRedirect(path),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
  }),
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: mockMaybeSingle }),
      }),
    }),
  }),
}))

import { requireSuperadminPage } from '@/lib/admin/page-auth'

describe('requireSuperadminPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@example.com' } } })
  })

  it('detiene la página antes de consultar datos cuando no hay sesión', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    await expect(requireSuperadminPage()).rejects.toThrow(
      'REDIRECT:/login?redirect=/admin',
    )
    expect(mockMaybeSingle).not.toHaveBeenCalled()
  })

  it('envía al gestor a su panel municipal', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'user-1', rol: 'admin_municipio' },
    })

    await expect(requireSuperadminPage()).rejects.toThrow(
      'REDIRECT:/municipio/estadisticas',
    )
  })

  it('rechaza a un ciudadano autenticado', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: 'user-1', rol: 'ciudadano' } })

    await expect(requireSuperadminPage()).rejects.toThrow('REDIRECT:/dashboard')
  })

  it('autoriza al superadministrador', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: 'user-1', rol: 'superadmin' } })

    await expect(requireSuperadminPage()).resolves.toEqual({
      id: 'user-1',
      email: 'test@example.com',
    })
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})
