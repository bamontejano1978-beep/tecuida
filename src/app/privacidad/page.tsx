/**
 * Página de Política de Privacidad RGPD — /privacidad
 *
 * Server Component que:
 *   - Detecta si se accede desde un subdominio de municipio (tenant)
 *   - Muestra el header institucional del municipio si hay tenant
 *   - Muestra header genérico de TE CUIDA si es el dominio raíz
 *   - Detalla: datos recogidos, base legal, retención, derechos, anonimización
 *
 * Accesible desde el footer de todas las landings.
 * Esta página es compartida — todos los municipios la sirven automáticamente
 * al crear su web, sin configuración adicional.
 */

import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import Image from 'next/image'
import { getTenantConfigFromDB, getTenantFromHeaders } from '@/lib/tenant/headers'

// ===========================================================================
// Metadata SEO
// ===========================================================================

export const metadata: Metadata = {
  title: 'Política de Privacidad — TE CUIDA',
  description:
    'Cómo tratamos tus datos en TE CUIDA: qué recogemos, por qué, base legal RGPD, tiempo de retención, derechos ARSLPO y cómo anonimizamos las métricas de impacto.',
  robots: { index: true, follow: true },
}

// ===========================================================================
// Constantes de configuración legal (ajustar según la entidad real)
// ===========================================================================

const LEGAL = {
  responsable: 'TE CUIDA',
  domicilio: 'Extremadura, España',
  email: 'privacidad@tecuida.group',
  dpoEmail: 'dpo@tecuida.group',
  autoridadControl: 'Agencia Española de Protección de Datos (AEPD)',
  autoridadUrl: 'https://www.aepd.es',
  ultimaActualizacion: '1 de julio de 2026',
} as const

const SELLO_RGPD = [
  { label: 'Reglamento', value: 'Reglamento (UE) 2016/679 (RGPD)' },
  { label: 'Ley nacional', value: 'Ley Orgánica 3/2018 de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD)' },
] as const

// ===========================================================================
// Datos que se describen
// ===========================================================================

interface DatosRecogidosItem {
  dato: string
  obligatorio: boolean
  finalidad: string
  baseLegal: string
  retencion: string
}

const DATOS_RECOGIDOS: DatosRecogidosItem[] = [
  {
    dato: 'Correo electrónico',
    obligatorio: true,
    finalidad:
      'Identificarte de forma única en la plataforma, permitir el inicio de sesión y enviarte comunicaciones esenciales del servicio (verificación de cuenta, recuperación de contraseña, cambios en los términos).',
    baseLegal:
      'Ejecución del contrato de servicio (art. 6.1.b RGPD). Al registrarte, estableces una relación contractual con la plataforma para acceder a los programas de tu ayuntamiento.',
    retencion:
      'Mientras tu cuenta esté activa. Si eliminas tu cuenta, el email se suprime en un plazo máximo de 30 días.',
  },
  {
    dato: 'Alias / pseudónimo',
    obligatorio: false,
    finalidad:
      'Personalizar tu experiencia en el dashboard y en las comunicaciones. Se usa como nombre visible internamente — nunca se muestra a otros usuarios ni a los ayuntamientos de forma individual.',
    baseLegal:
      'Interés legítimo (art. 6.1.f RGPD). Un alias mejora la usabilidad sin identificarte, y puedes no proporcionarlo.',
    retencion:
      'Mientras tu cuenta esté activa. Puedes cambiarlo o eliminarlo desde /perfil en cualquier momento.',
  },
  {
    dato: 'Género (categoría: hombre, mujer, no binario)',
    obligatorio: false,
    finalidad:
      'Métrica de impacto agregada y anónima. Permite a la plataforma y a los ayuntamientos entender si los programas de bienestar están llegando por igual a todos los géneros — siempre en forma de porcentajes agregados, nunca individualmente.',
    baseLegal:
      'Consentimiento explícito (art. 9.2.a RGPD, categoría especial de dato). Marcas una casilla opcional y puedes retirarlo en cualquier momento desde /perfil.',
    retencion:
      'Mientras tu cuenta esté activa o hasta que retires el consentimiento. La retirada no afecta a los agregados ya calculados.',
  },
  {
    dato: 'Año de nacimiento (sin mes ni día)',
    obligatorio: false,
    finalidad:
      'Métrica de impacto agregada y anónima. Permite segmentar la efectividad de los programas por franjas etarias (18-24, 25-34, etc.) — solo en forma de distribuciones agregadas, nunca individualmente.',
    baseLegal:
      'Consentimiento explícito (art. 6.1.a RGPD). Se solicita de forma opcional y puedes retirarlo en cualquier momento desde /perfil.',
    retencion:
      'Mientras tu cuenta esté activa o hasta que retires el consentimiento. La retirada no afecta a los agregados ya calculados.',
  },
  {
    dato: 'Datos de uso (programas abiertos, lecciones completadas)',
    obligatorio: true,
    finalidad:
      'Medir el impacto agregado de los programas: cuántos ciudadanos usan cada herramienta, tasas de finalización, progreso medio. Estos datos se asocian a un UUID anónimo (identificador técnico) sin información personal identificable en las tablas de analítica.',
    baseLegal:
      'Interés legítimo (art. 6.1.f RGPD). La medición de impacto es esencial para mejorar los programas y justificar la inversión pública. Los datos se anonimizan antes de cualquier agregación.',
    retencion:
      'Los eventos de uso se conservan de forma seudonimizada durante 5 años con fines estadísticos. Pasado ese plazo, se agregan irreversiblemente y se eliminan los registros individuales.',
  },
]

// ===========================================================================
// Derechos ARSLPO
// ===========================================================================

const DERECHOS = [
  {
    derecho: 'Acceso',
    icon: '📂',
    descripcion:
      'Puedes solicitar una copia de todos los datos personales que conservamos sobre ti. Te los entregaremos en un formato estructurado y legible (JSON) en el plazo máximo de un mes.',
  },
  {
    derecho: 'Rectificación',
    icon: '✏️',
    descripcion:
      'Si algún dato es inexacto o está incompleto, puedes corregirlo tú mismo desde /perfil o solicitarnos la rectificación.',
  },
  {
    derecho: 'Supresión',
    icon: '🗑️',
    descripcion:
      'Puedes solicitar la eliminación de tus datos personales («derecho al olvido»). Eliminaremos tu cuenta y todos los datos asociados en un plazo máximo de 30 días, salvo aquellos que debamos conservar por obligación legal.',
  },
  {
    derecho: 'Limitación',
    icon: '⏸️',
    descripcion:
      'Puedes solicitar que limitemos el tratamiento de tus datos mientras se verifica una impugnación sobre su exactitud o licitud.',
  },
  {
    derecho: 'Portabilidad',
    icon: '📦',
    descripcion:
      'Puedes recibir tus datos en un formato estructurado y transferirlos a otro responsable sin que se lo impidamos.',
  },
  {
    derecho: 'Oposición',
    icon: '🚫',
    descripcion:
      'Puedes oponerte al tratamiento de tus datos basado en interés legítimo. Evaluaremos tu solicitud y, salvo motivos legítimos imperiosos, cesaremos el tratamiento.',
  },
]

// ===========================================================================
// Cómo se anonimizan las métricas
// ===========================================================================

const ANONIMIZACION = [
  {
    paso: '1. Separación de tablas',
    descripcion:
      'Los datos personales (email, alias, género, año nacimiento) y los datos de uso (eventos) se almacenan en tablas separadas con niveles de acceso distintos. No hay forma de unir ambos mundos desde la interfaz de usuario.',
  },
  {
    paso: '2. Agregación irreversible',
    descripcion:
      'Cuando un administrador consulta las estadísticas demográficas, el sistema ejecuta consultas de agregación (COUNT, GROUP BY) que devuelven números totales — nunca filas individuales. Un panel que dice "142 usuarios, 38% mujeres, 27% entre 25-34" no permite identificar a ninguna persona.',
  },
  {
    paso: '3. Umbral mínimo',
    descripcion:
      'Si una franja demográfica tiene menos de 5 usuarios, el sistema no muestra el desglose para esa franja — evita que una cifra muy pequeña permita identificar indirectamente a alguien.',
  },
  {
    paso: '4. Sin exportación individual',
    descripcion:
      'Los administradores de ayuntamiento NO pueden exportar, descargar ni visualizar datos demográficos individuales. Solo ven gráficos de barras y porcentajes agregados.',
  },
  {
    paso: '5. Almacenamiento seudonimizado',
    descripcion:
      'Los datos demográficos se guardan vinculados a un UUID (identificador único universal) sin relación directa con el email. Para reidentificar a una persona, un atacante necesitaría acceso simultáneo a dos tablas separadas con claves de cifrado distintas (RLS de Supabase).',
  },
]

// ===========================================================================
// Componentes de UI reutilizables
// ===========================================================================

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-12">
      <h2 className="flex items-center gap-3 text-2xl font-bold text-[#1a2e1d] mb-5">
        <span aria-hidden="true" className="text-3xl">
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function InfoCard({
  children,
  variant = 'default',
}: {
  children: React.ReactNode
  variant?: 'default' | 'amber' | 'green' | 'blue'
}) {
  const variants = {
    default: 'bg-white border-gray-200',
    amber: 'bg-amber-50 border-amber-200',
    green: 'bg-emerald-50 border-emerald-200',
    blue: 'bg-blue-50 border-blue-200',
  }
  return (
    <div
      className={`rounded-xl border p-5 ${variants[variant]} text-[#30372e] leading-relaxed`}
    >
      {children}
    </div>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#eef5ea] px-2.5 py-0.5 text-xs font-semibold text-[#38633e]">
      {children}
    </span>
  )
}

// ===========================================================================
// Página principal
// ===========================================================================

export default async function PrivacidadPage() {
  // Detectar si estamos en un subdominio de municipio
  const tenantHeaders = getTenantFromHeaders()
  const tenant = tenantHeaders?.slug
    ? await getTenantConfigFromDB(tenantHeaders.slug)
    : null

  const inicial = tenant
    ? tenant.nombre_municipio.charAt(0).toUpperCase()
    : 'T'

  const topbarTitle = tenant
    ? tenant.nombre_ayuntamiento
    : 'TE CUIDA'
  const topbarSubtitle = tenant
    ? `${tenant.nombre_municipio} te cuida`
    : 'Política de privacidad'
  const homeHref = '/'

  return (
    <div className="min-h-screen font-sans text-[#20231f] bg-[#f7f1e7]">
      {/* ── Topbar (tenant-aware) ── */}
      <header className="sticky top-0 z-50 flex items-center justify-between gap-7 px-[clamp(20px,5vw,70px)] py-[18px] bg-gradient-to-r from-[#142c19] to-[#264d2c] text-white shadow-lg">
        <Link
          href={homeHref}
          className="flex items-center gap-3.5 no-underline text-white min-w-max"
        >
          {tenant?.escudo_url ? (
            <Image
              src={tenant.escudo_url}
              alt={`Escudo de ${tenant.nombre_municipio}`}
              width={48}
              height={48}
              className="h-12 w-auto rounded-xl object-contain drop-shadow-md"
            />
          ) : (
            <span className="w-12 h-12 rounded-2xl grid place-items-center bg-gradient-to-br from-[#e4aa45] to-[#b87924] text-white font-bold text-3xl shadow-[inset_0_0_0_1px_rgba(255,255,255,.38)]">
              {inicial}
            </span>
          )}
          <span>
            <strong className="block text-xl leading-tight">
              {topbarTitle}
            </strong>
            <span className="block text-xs opacity-80 tracking-wider">
              {topbarSubtitle}
            </span>
          </span>
        </Link>
        <Link
          href={homeHref}
          className="border border-white/40 rounded-2xl px-[18px] py-3 no-underline font-bold text-sm bg-white/10 hover:bg-white/20 transition-colors"
        >
          ← Volver al inicio
        </Link>
      </header>

      {/* ── Tenant badge ── */}
      {tenant && (
        <div className="bg-white border-b border-gray-200 py-3 px-[clamp(20px,5vw,70px)]">
          <p className="text-sm text-[#52604e] max-w-[900px] mx-auto">
            Esta política de privacidad aplica a todos los servicios de{' '}
            <strong>{tenant.nombre_municipio} te cuida</strong>, una iniciativa
            del {tenant.nombre_ayuntamiento} gestionada a través de la
            plataforma TE CUIDA.
          </p>
        </div>
      )}

      {/* ── Contenido ── */}
      <main className="max-w-[900px] mx-auto py-12 px-[clamp(20px,5vw,70px)]">
        {/* ── Encabezado ── */}
        <div className="mb-12">
          <p className="text-[#38633e] text-[13px] font-black tracking-[.18em] uppercase mb-2">
            {LEGAL.ultimaActualizacion}
          </p>
          <h1 className="font-bold text-[clamp(36px,6vw,56px)] leading-[1.05] mb-5 text-[#1a2e1d]">
            Política de Privacidad
          </h1>
          <p className="text-lg text-[#52604e] max-w-[650px] leading-relaxed">
            En <strong>TE CUIDA</strong> tratamos tus datos con el máximo
            respeto. Esta política explica —en lenguaje claro— qué datos
            recogemos, por qué los necesitamos, cuánto tiempo los conservamos y
            qué derechos tienes. Todo conforme al Reglamento General de
            Protección de Datos (RGPD) y la LOPDGDD.
          </p>
        </div>

        {/* ── 1. Responsable ── */}
        <Section title="1. ¿Quién es el responsable?" icon="🏛️">
          <InfoCard variant="default">
            <dl className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-6 gap-y-3 text-[15px]">
              <dt className="font-semibold text-[#38633e]">Responsable:</dt>
              <dd>{LEGAL.responsable}</dd>

              <dt className="font-semibold text-[#38633e]">Domicilio:</dt>
              <dd>{LEGAL.domicilio}</dd>

              <dt className="font-semibold text-[#38633e]">Email privacidad:</dt>
              <dd>
                <a
                  href={`mailto:${LEGAL.email}`}
                  className="text-[#38633e] underline hover:text-[#264d2c]"
                >
                  {LEGAL.email}
                </a>
              </dd>

              <dt className="font-semibold text-[#38633e]">DPO (Delegado):</dt>
              <dd>
                <a
                  href={`mailto:${LEGAL.dpoEmail}`}
                  className="text-[#38633e] underline hover:text-[#264d2c]"
                >
                  {LEGAL.dpoEmail}
                </a>
              </dd>
            </dl>
          </InfoCard>
          <p className="mt-4 text-sm text-[#64705e]">
            Normativa aplicable:{' '}
            {SELLO_RGPD.map((s, i) => (
              <span key={s.label}>
                {s.value}
                {i < SELLO_RGPD.length - 1 ? ' · ' : ''}
              </span>
            ))}
          </p>
        </Section>

        {/* ── 2. Datos que recogemos ── */}
        <Section title="2. ¿Qué datos recogemos y por qué?" icon="📋">
          <p className="text-[#52604e] mb-6 leading-relaxed">
            Solo recogemos los datos estrictamente necesarios para prestarte el
            servicio. A continuación, el desglose completo:
          </p>

          <div className="space-y-4">
            {DATOS_RECOGIDOS.map((item) => (
              <InfoCard key={item.dato}>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <h3 className="font-bold text-[#1a2e1d] text-lg">
                    {item.dato}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge>
                      {item.obligatorio ? '🔴 Obligatorio' : '🟢 Opcional'}
                    </Badge>
                  </div>
                </div>
                <dl className="space-y-2.5 text-[15px]">
                  <div>
                    <dt className="font-semibold text-[#38633e] text-sm">
                      🎯 Finalidad
                    </dt>
                    <dd className="text-[#52604e] mt-0.5">{item.finalidad}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#38633e] text-sm">
                      ⚖️ Base legal
                    </dt>
                    <dd className="text-[#52604e] mt-0.5">{item.baseLegal}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#38633e] text-sm">
                      🕐 Retención
                    </dt>
                    <dd className="text-[#52604e] mt-0.5">{item.retencion}</dd>
                  </div>
                </dl>
              </InfoCard>
            ))}
          </div>

          <InfoCard variant="amber">
            <p className="text-sm">
              <strong>💡 Importante:</strong> Nunca recogemos datos sensibles
              como DNI, dirección postal, número de teléfono, datos bancarios,
              geolocalización precisa, ni historial médico. Tampoco tomamos
              decisiones automatizadas que produzcan efectos jurídicos sobre ti
              (no hacemos perfiles).
            </p>
          </InfoCard>
        </Section>

        {/* ── 3. Cómo anonimizamos las métricas ── */}
        <Section title="3. ¿Cómo se anonimizan las métricas de impacto?" icon="📊">
          <p className="text-[#52604e] mb-6 leading-relaxed">
            Para medir el impacto de los programas necesitamos datos
            demográficos (género, edad), pero <strong>nunca se muestran de forma individual</strong>. Este
            es nuestro proceso de anonimización:
          </p>

          <div className="space-y-4">
            {ANONIMIZACION.map((item) => (
              <InfoCard key={item.paso} variant="green">
                <h3 className="font-bold text-[#1a2e1d] mb-1.5">
                  {item.paso}
                </h3>
                <p className="text-[#52604e] text-[15px]">{item.descripcion}</p>
              </InfoCard>
            ))}
          </div>

          <InfoCard variant="blue">
            <p className="text-sm">
              <strong>🔍 Ejemplo concreto:</strong> Si entras al panel de
              administración y ves &ldquo;Cobertura demográfica: 142 usuarios
              (38% del total)&rdquo; y un gráfico con &ldquo;Mujeres: 52%,
              Hombres: 45%, No binario: 3%&rdquo;, no hay forma de saber qué
              género tiene un usuario concreto. Son solo números agregados.
            </p>
          </InfoCard>
        </Section>

        {/* ── 4. Tus derechos ── */}
        <Section title="4. Tus derechos (ARSLPO)" icon="🛡️">
          <p className="text-[#52604e] mb-6 leading-relaxed">
            El RGPD te otorga los siguientes derechos. Para ejercer cualquiera
            de ellos, escríbenos a{' '}
            <a
              href={`mailto:${LEGAL.email}`}
              className="text-[#38633e] underline hover:text-[#264d2c]"
            >
              {LEGAL.email}
            </a>{' '}
            indicando el derecho que quieres ejercer. Te responderemos en un
            plazo máximo de <strong>un mes</strong> (ampliable a dos en casos
            complejos, previo aviso).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DERECHOS.map((d) => (
              <InfoCard key={d.derecho}>
                <h3 className="font-bold text-[#1a2e1d] text-lg mb-2 flex items-center gap-2">
                  <span aria-hidden="true">{d.icon}</span>
                  {d.derecho}
                </h3>
                <p className="text-[#52604e] text-[15px] leading-relaxed">
                  {d.descripcion}
                </p>
              </InfoCard>
            ))}
          </div>

          <InfoCard variant="amber">
            <p className="text-sm">
              <strong>⚠️ Reclamación:</strong> Si consideras que no hemos
              atendido correctamente tus derechos, puedes presentar una
              reclamación ante la{' '}
              <a
                href={LEGAL.autoridadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#38633e] underline hover:text-[#264d2c]"
              >
                {LEGAL.autoridadControl}
              </a>
              .
            </p>
          </InfoCard>
        </Section>

        {/* ── 5. Compartición con terceros ── */}
        <Section title="5. ¿Compartimos tus datos con terceros?" icon="🤝">
          <InfoCard variant="default">
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-[#1a2e1d] mb-1.5">
                  Con tu ayuntamiento (datos agregados)
                </h3>
                <p className="text-[#52604e] text-[15px] leading-relaxed">
                  Tu ayuntamiento <strong>solo ve estadísticas agregadas</strong> de
                  sus ciudadanos: cuántos usan cada programa, distribución por
                  género y edad en forma de porcentajes. Nunca ve tu email,
                  alias, género ni año de nacimiento individualmente.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-[#1a2e1d] mb-1.5">
                  Con proveedores de infraestructura
                </h3>
                <p className="text-[#52604e] text-[15px] leading-relaxed">
                  Usamos{' '}
                  <strong>Supabase</strong> (base de datos y autenticación en
                  servidores de la UE) como encargado de tratamiento. Tienen
                  certificación SOC 2 y cumplen con el RGPD mediante cláusulas
                  contractuales tipo.{' '}
                  <a
                    href="https://supabase.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#38633e] underline hover:text-[#264d2c]"
                  >
                    Ver política de Supabase →
                  </a>
                </p>
              </div>

              <div>
                <h3 className="font-bold text-[#1a2e1d] mb-1.5">
                  Sin venta ni cesión
                </h3>
                <p className="text-[#52604e] text-[15px] leading-relaxed">
                  <strong>No vendemos, alquilamos ni cedemos</strong> tus datos
                  personales a terceros con fines comerciales. No hacemos
                  publicidad dirigida ni compartimos datos con redes
                  publicitarias.
                </p>
              </div>
            </div>
          </InfoCard>
        </Section>

        {/* ── 6. Seguridad ── */}
        <Section title="6. Medidas de seguridad" icon="🔐">
          <InfoCard variant="default">
            <ul className="space-y-2.5 text-[15px] text-[#52604e] list-disc list-inside marker:text-[#38633e]">
              <li>
                <strong>Cifrado en tránsito:</strong> todas las comunicaciones
                entre tu navegador y nuestros servidores usan TLS 1.3 (HTTPS).
              </li>
              <li>
                <strong>Cifrado en reposo:</strong> los datos se almacenan
                cifrados en discos gestionados por Supabase con AES-256.
              </li>
              <li>
                <strong>Row Level Security (RLS):</strong> cada municipio solo
                puede acceder a los datos agregados de sus propios ciudadanos.
                Las consultas a la base de datos están protegidas a nivel de
                fila.
              </li>
              <li>
                <strong>Autenticación robusta:</strong> usamos tokens JWT con
                expiración y refresh tokens rotativos. Las contraseñas se
                almacenan con hash bcrypt (nunca en texto plano).
              </li>
              <li>
                <strong>Auditoría:</strong> registramos accesos administrativos
                y modificaciones de configuración para detectar usos indebidos.
              </li>
            </ul>
          </InfoCard>
        </Section>

        {/* ── 7. Cambios en esta política ── */}
        <Section title="7. Cambios en esta política" icon="📝">
          <InfoCard variant="default">
            <p className="text-[#52604e] text-[15px] leading-relaxed">
              Si realizamos cambios sustanciales en esta política, te
              notificaremos por correo electrónico con al menos 15 días de
              antelación. Los cambios menores (correcciones ortográficas,
              mejoras de redacción) se publicarán directamente sin previo aviso.
              La fecha de última actualización siempre está visible al inicio de
              esta página.
            </p>
          </InfoCard>
        </Section>

        {/* ── 8. Contacto rápido ── */}
        <Section title="8. Contacto" icon="📧">
          <InfoCard variant="default">
            <p className="text-[#52604e] text-[15px] leading-relaxed mb-4">
              Para cualquier duda sobre esta política o sobre el tratamiento de
              tus datos, escríbenos:
            </p>
            <div className="space-y-2">
              <p className="text-[15px]">
                📧{' '}
                <a
                  href={`mailto:${LEGAL.email}`}
                  className="text-[#38633e] underline hover:text-[#264d2c] font-semibold"
                >
                  {LEGAL.email}
                </a>
              </p>
              <p className="text-[15px]">
                🛡️ DPO:{' '}
                <a
                  href={`mailto:${LEGAL.dpoEmail}`}
                  className="text-[#38633e] underline hover:text-[#264d2c] font-semibold"
                >
                  {LEGAL.dpoEmail}
                </a>
              </p>
            </div>
          </InfoCard>
        </Section>

        {/* ── Pie de página ── */}
        <footer className="mt-16 pt-8 border-t border-[rgba(35,45,30,.13)] text-center text-sm text-[#64705e]">
          <p>
            © {new Date().getFullYear()} {LEGAL.responsable} — Todos los derechos
            reservados.{' '}
            <Link
              href="/"
              className="text-[#38633e] underline hover:text-[#264d2c]"
            >
              Volver al inicio
            </Link>
          </p>
        </footer>
      </main>
    </div>
  )
}
