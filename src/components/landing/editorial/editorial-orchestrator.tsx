/**
 * EditorialOrchestrator — Componente raíz de la landing editorial
 *
 * Renderiza la landing completa para municipios con layout_variant='editorial'.
 * Compone: EditorialTopbar → EditorialHero → opcionalmente actividades
 * destacadas → EditorialProgramsGrid → EditorialOds → EditorialFooter.
 *
 * Equivalente al `TenantPage` del sistema clásico, sin CategoryBanners ni
 * StatsBar flotante. Mantiene la firma de props limpia para branch directo
 * desde `src/app/page.tsx`.
 *
 * Server Component puro. Estilos: editorial.module.css (skin aislado).
 */

import type { MunicipalityConfig } from '@/types'
import EditorialTopbar from './editorial-topbar'
import EditorialHero from './editorial-hero'
import EditorialProgramsGrid from './editorial-programs-grid'
import EditorialOds from './editorial-ods'
import EditorialFooter from './editorial-footer'
import styles from './editorial.module.css'

// ─────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────

export interface EditorialApp {
  id: string
  categoria_id: string
  nombre: string
  descripcion: string
  thumbnail_url: string
  tipo: 'programa' | 'herramienta' | 'encuesta' | 'recurso'
  activa: boolean
  created_at: string | null
  app_slug: string | null
  url_acceso: string | null
}

export interface EditorialOrchestratorProps {
  tenant: MunicipalityConfig
  validApps: EditorialApp[]
}

// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────

export default function EditorialOrchestrator({
  tenant,
  validApps,
}: EditorialOrchestratorProps) {
  // MunicipalityConfig.colores_corporativos ya está tipado como CorporateColors,
  // no hace falta cast. Si en algún futuro se añade un campo opcional como
  // fallback al render editorial, basta con encadenar `|| '#16452f'`.
  const accent = tenant.colores_corporativos.accent || '#16452f'
  const texts = tenant.textos_institucionales
  const sectionOrder = texts.editorial_sections?.length
    ? texts.editorial_sections
    : (['programas', 'ods'] as const)

  const programsSection = (
    <section key="programas-section" aria-label="Programas del municipio">
      <header style={{ textAlign: 'center', margin: '70px 16px 18px' }}>
        <p
          style={{
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: accent,
            fontSize: 13,
            margin: 0,
          }}
        >
          {texts.programas_subtitulo || '¿En qué podemos ayudarte?'}
        </p>
        <h2
          style={{
            fontFamily: 'Georgia, serif',
            color: 'var(--green)',
            fontSize: 'clamp(28px, 4vw, 40px)',
            margin: '8px 0 0',
          }}
        >
          {texts.programas_titulo || 'Nuestros programas'}
        </h2>
      </header>
      <EditorialProgramsGrid apps={validApps} accent={accent} />
    </section>
  )

  const odsSection = (
    <EditorialOds
      key="ods-section"
      nombreMunicipio={tenant.nombre_municipio}
      odsNumbers={texts.editorial_ods}
    />
  )

  return (
    <div className={styles.editorial} data-layout="editorial">
      <EditorialTopbar tenant={tenant} />

      <EditorialHero
        tenant={tenant}
        subtitle={texts.editorial_subtitle}
        intro={texts.editorial_intro}
        body={texts.editorial_body}
        previewTags={texts.editorial_tags}
      />

      {/*
        Nota: featuredActivities se calculan en page.tsx pero NO se
        renderizan acá porque el rediseño editorial prioriza la
        jerarquía de Programas > ODS > Footer, sin sección extra de
        marketplace. Si en el futuro el Ayuntamiento quiere reactivar
        esa sección, basta con reintroducir <ActivityCard /> y volver
        a aceptar featuredActivities en props.
       */}

      {sectionOrder.map((section) => {
        if (section === 'programas' && texts.seccion_programas_visible !== false) return programsSection
        if (section === 'ods' && texts.seccion_ods_visible !== false) return odsSection
        return null
      })}

      <EditorialFooter tenant={tenant} />
    </div>
  )
}
