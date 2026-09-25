'use client'

import type { DossierEntry } from '@/lib/dossiers/catalog'

export default function DossiersGrid({ items }: { items: DossierEntry[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((d) => (
        <a
          key={d.file}
          href={`/dossiers/${encodeURIComponent(d.file)}`}
          download
          className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white"
              style={{ backgroundColor: d.color }}
              aria-hidden
            >
              PDF
            </div>
            <span className="text-xs font-medium text-gray-400 transition group-hover:text-emerald-600">
              Descargar ↓
            </span>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-gray-900">{d.title}</h3>
          <p className="mt-1 flex-1 text-xs leading-relaxed text-gray-600">
            {d.description}
          </p>
        </a>
      ))}
    </div>
  )
}
