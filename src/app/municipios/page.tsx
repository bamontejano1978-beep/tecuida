import MunicipalDirectory from '@/components/landing/municipal-directory'
export default function MunicipalitiesPage({ searchParams }: { searchParams: { q?: string } }) {
  return <MunicipalDirectory query={typeof searchParams.q === 'string' ? searchParams.q.slice(0, 100) : ''} />
}
