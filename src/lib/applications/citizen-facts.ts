export interface CitizenFacts { audience: string; duration: string; storage: string }

// Only facts verified against the shipped implementations. Unknown details remain explicit.
const facts: Record<string, CitizenFacts> = {
  reto30: { audience: 'Personas adultas', duration: '30 días, a tu ritmo', storage: 'Avances y notas en este navegador' },
  'mindful30-cuidadores': { audience: 'Personas cuidadoras', duration: '30 días, a tu ritmo', storage: 'Avances y notas en este navegador' },
  'mindful30-adolescentes': { audience: 'Adolescentes', duration: '30 días, a tu ritmo', storage: 'Avances y notas en este navegador' },
  'mindful30-infancia': { audience: 'Infancia y acompañantes', duration: 'Por sesiones', storage: 'Consulta de contenidos, sin guardado de avances' },
  'family-gamification': { audience: 'Familias', duration: 'Uso libre', storage: 'Perfiles, tareas y recompensas en este navegador' },
  organizatron: { audience: 'Estudiantes y familias', duration: 'Uso libre', storage: 'Planificación y avances en este navegador' },
  'salud-adolescentes': { audience: 'Adolescentes y familias', duration: '30 días, a tu ritmo', storage: 'Avances y notas en este navegador' },
}
export function getCitizenFacts(slug?: string | null): CitizenFacts {
  return facts[slug === 'mindful30' ? 'reto30' : slug || ''] || {
    audience: 'Ciudadanía', duration: 'Consultar en la aplicación', storage: 'Consulta el guardado al iniciar la actividad',
  }
}
