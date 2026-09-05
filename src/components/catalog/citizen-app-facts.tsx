import { getCitizenFacts } from '@/lib/applications/citizen-facts'

export default function CitizenAppFacts({ slug }: { slug?: string | null }) {
  const facts = getCitizenFacts(slug)
  return <dl className="my-3 space-y-2 text-xs leading-5 text-gray-600">
    <div><dt className="font-semibold text-gray-800">Para quién</dt><dd>{facts.audience}</dd></div>
    <div><dt className="font-semibold text-gray-800">Dedicación</dt><dd>{facts.duration}</dd></div>
    <div><dt className="font-semibold text-gray-800">Qué guarda</dt><dd>{facts.storage}</dd></div>
  </dl>
}
