/** @jest-environment node */

jest.mock('server-only', () => ({}))

import {
  generateMunicipalInviteCode,
  hashInviteCode,
  isInviteCodesConfigured,
  normalizeInviteCode,
  reserveMunicipalInviteCode,
} from '../municipal-invite-codes'

const ORIGINAL_PEPPER = process.env.INVITE_CODE_PEPPER

beforeEach(() => {
  process.env.INVITE_CODE_PEPPER = 'test-pepper-with-more-than-32-characters-long'
})

afterAll(() => {
  if (ORIGINAL_PEPPER === undefined) delete process.env.INVITE_CODE_PEPPER
  else process.env.INVITE_CODE_PEPPER = ORIGINAL_PEPPER
})

describe('códigos municipales', () => {
  it('genera códigos legibles con 80 bits aleatorios y prefijo municipal', () => {
    const codes = new Set(
      Array.from({ length: 500 }, () => generateMunicipalInviteCode('villafranca')),
    )
    expect(codes.size).toBe(500)
    for (const code of codes) {
      expect(code).toMatch(/^VI-[A-HJ-NP-Z2-9]{4}(?:-[A-HJ-NP-Z2-9]{4}){3}$/)
    }
  })

  it('normaliza separadores y mayúsculas antes de calcular el hash', () => {
    expect(normalizeInviteCode('vi-7kq9 m4xt')).toBe('VI7KQ9M4XT')
    expect(hashInviteCode('vi-7kq9-m4xt')).toBe(hashInviteCode('VI 7KQ9 M4XT'))
  })

  it('detecta si el secreto criptográfico está configurado', () => {
    expect(isInviteCodesConfigured()).toBe(true)
    process.env.INVITE_CODE_PEPPER = 'corto'
    expect(isInviteCodesConfigured()).toBe(false)
  })

  it('reserva mediante el RPC usando hashes, sin enviar el código en claro', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [{ reservation_token: '11111111-1111-1111-1111-111111111111' }],
      error: null,
    })
    const result = await reserveMunicipalInviteCode(
      { rpc } as never,
      '22222222-2222-2222-2222-222222222222',
      'VI-7KQ9-M4XT-P2DN-8RWC',
      'Vecina@Example.com',
    )

    expect(result?.token).toBe('11111111-1111-1111-1111-111111111111')
    expect(rpc).toHaveBeenCalledWith(
      'reserve_municipal_invite_code',
      expect.objectContaining({
        p_municipality_id: '22222222-2222-2222-2222-222222222222',
        p_code_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
        p_email_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    )
    expect(JSON.stringify(rpc.mock.calls)).not.toContain('7KQ9')
    expect(JSON.stringify(rpc.mock.calls)).not.toContain('Vecina@Example.com')
  })
})
