/**
 * Catálogo de dossieres PDF publicados para los gestores municipales.
 *
 * Los ficheros viven en `public/dossiers/` (assets estáticos) y se
 * regeneran con los scripts del monorepo:
 *   - node scripts/generate-app-dossiers.mjs   (8 apps + plataforma)
 *   - node scripts/generate-ods-dossier.mjs    (programa ODS)
 *   - node scripts/capture-app-screenshots.mjs / capture-ods-screens.mjs
 *     (capturas reales que incrustan los dossieres)
 *
 * Al añadir o renombrar un PDF, actualizar también el script generador.
 */

export interface DossierEntry {
  file: string
  title: string
  description: string
  kind: 'app' | 'platform' | 'program'
  /** Color de marca para el icono (apps) o teal corporativo */
  color: string
}

export const DOSSIERS: DossierEntry[] = [
  {
    file: 'Dossier_Programa_ODS_Villafranca.pdf',
    title: 'Programa ODS — Villafranca te cuida 2030',
    description:
      'El ciclo de participación semanal, los códigos de acceso y las garantías del programa. Ideal para presentar el programa a ciudadanía y medios.',
    kind: 'program',
    color: '#14b8a6',
  },
  {
    file: 'Dossier_Plataforma_TE_CUIDA.pdf',
    title: 'Plataforma VCA TE CUIDA',
    description:
      'Catálogo completo de aplicaciones y modelo de acceso municipal (códigos, acumulación semanal, control y privacidad).',
    kind: 'platform',
    color: '#0f172a',
  },
  {
    file: 'Dossier_Reto30.pdf',
    title: 'Reto30',
    description: 'Programa de 30 días: reflexión, actividad y relaciones a diario.',
    kind: 'app',
    color: '#14b8a6',
  },
  {
    file: 'Dossier_Mindful30_Adolescentes.pdf',
    title: 'Mindful30 Adolescentes',
    description: 'Calma y foco para chavales de 12 a 17 años.',
    kind: 'app',
    color: '#7c3aed',
  },
  {
    file: 'Dossier_Mindful30_Cuidadores.pdf',
    title: 'Mindful30 Cuidadores',
    description: 'Autocuidado real para quienes cuidan.',
    kind: 'app',
    color: '#7c3aed',
  },
  {
    file: 'Dossier_Mindful30_Infancia.pdf',
    title: 'Mindful30 Infancia',
    description: 'Calma, vínculo y juego consciente para familias.',
    kind: 'app',
    color: '#0090ff',
  },
  {
    file: 'Dossier_Economia_Familiar.pdf',
    title: 'Economía Familiar',
    description: 'Misiones, monedas y recompensas para organizar el hogar.',
    kind: 'app',
    color: '#8b5cf6',
  },
  {
    file: 'Dossier_Focus_Family.pdf',
    title: 'Focus Family',
    description: 'Organización, estudio y pactos para adolescentes y familias.',
    kind: 'app',
    color: '#7c3aed',
  },
  {
    file: 'Dossier_Salud_Adolescente.pdf',
    title: 'Salud Adolescente',
    description: 'Retos de hábitos saludables y bienestar digital.',
    kind: 'app',
    color: '#0ea5e9',
  },
  {
    file: 'Dossier_Level_Up_Juntos.pdf',
    title: 'Level Up Juntos',
    description: 'Reto de 30 días para la igualdad y las relaciones saludables.',
    kind: 'app',
    color: '#7c3aed',
  },
]
