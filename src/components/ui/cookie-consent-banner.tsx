/**
 * Cookie Consent Banner — Banner RGPD para el consentimiento de cookies
 *
 * Client Component que:
 *   - Se muestra en la parte inferior de la pantalla si el usuario no ha decidido aún
 *   - Ofrece tres acciones: aceptar, rechazar, más información (/privacidad)
 *   - Almacena la decisión en localStorage vía `lib/analytics/consent.ts`
 *   - Se oculta automáticamente tras decidir
 *
 * Estilo: se integra con la paleta visual del proyecto (verdes, ámbar, blanco roto).
 */

'use client'

import { useCookieConsent } from '@/lib/analytics/consent'
import Link from 'next/link'

export default function CookieConsentBanner() {
  const { hasDecided, accept, reject } = useCookieConsent()

  // Ya decidió → no mostrar nada
  if (hasDecided) return null

  return (
    <div
      role="dialog"
      aria-label="Consentimiento de cookies"
      className="fixed bottom-0 inset-x-0 z-[9999] animate-slide-up"
    >
      <div className="bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-8px_40px_rgba(0,0,0,.08)]">
        <div className="max-w-[1120px] mx-auto px-[clamp(16px,4vw,40px)] py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Texto */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#30372e] leading-relaxed">
                <strong className="text-[#1a2e1d]">🍪 Tu privacidad nos importa.</strong>{' '}
                Utilizamos cookies propias para medir de forma anónima el impacto de
                nuestros programas de bienestar.{' '}
                <span className="text-[#64705e]">
                  No compartimos estos datos con terceros ni los usamos con fines
                  publicitarios. Puedes aceptar, rechazar o{' '}
                  <Link
                    href="/privacidad"
                    className="text-[#38633e] underline hover:text-[#264d2c] font-medium"
                  >
                    consultar nuestra política de privacidad
                  </Link>
                  .
                </span>
              </p>
            </div>

            {/* Botones */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={reject}
                className="inline-flex items-center justify-center min-h-[40px] px-4 rounded-lg text-sm font-semibold text-[#64705e] border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
              >
                Rechazar
              </button>
              <button
                type="button"
                onClick={accept}
                className="inline-flex items-center justify-center min-h-[40px] px-5 rounded-lg text-sm font-semibold text-white bg-gradient-to-br from-[#38633e] to-[#264d2c] shadow-[0_4px_14px_rgba(38,77,44,.25)] hover:from-[#426e48] hover:to-[#2d5a33] transition-all"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
