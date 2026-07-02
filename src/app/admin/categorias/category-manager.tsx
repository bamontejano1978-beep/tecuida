/**
 * CategoryManager — Client Component de gestión de categorías
 *
 * Muestra la lista de categorías con opciones inline para:
 *   - Crear nueva categoría (formulario desplegable)
 *   - Editar nombre, descripción, icono, orden
 *   - Eliminar categoría (con confirmación)
 *   - Reordenar con botones ↑ ↓
 */

'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminCategory } from './page'

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function CategoryManager({
  initialCategories,
}: {
  initialCategories: AdminCategory[]
}) {
  const router = useRouter()
  const [categories, setCategories] = useState(initialCategories)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  // ── Formulario inline de nueva categoría ──
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newIcon, setNewIcon] = useState('')
  const [newIconPreview, setNewIconPreview] = useState<string | null>(null)
  const newIconBlobRef = useRef<string | null>(null)
  const [newIconUploading, setNewIconUploading] = useState(false)
  const newIconFileRef = useRef<HTMLInputElement>(null)
  const [creating, setCreating] = useState(false)

  // ── Edición inline ──
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [editIconPreview, setEditIconPreview] = useState<string | null>(null)
  const editIconBlobRef = useRef<string | null>(null)
  const [editIconUploading, setEditIconUploading] = useState(false)
  const editIconFileRef = useRef<HTMLInputElement>(null)
  const [editOrden, setEditOrden] = useState(0)
  const [saving, setSaving] = useState(false)

  // ── Subir icono para categoría nueva ──
  async function handleNewIconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar 5 MB.')
      return
    }
    const allowed = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
    if (!allowed.includes(file.type)) {
      setError('Formato no permitido. Usa JPEG, PNG, SVG o WebP.')
      return
    }

    setError(null)
    setNewIconUploading(true)

    // Revocar blob anterior para evitar memory leak
    if (newIconBlobRef.current) URL.revokeObjectURL(newIconBlobRef.current)
    const previewUrl = URL.createObjectURL(file)
    newIconBlobRef.current = previewUrl
    setNewIconPreview(previewUrl)

    try {
      const body = new FormData()
      body.append('file', file)
      body.append('categoryId', crypto.randomUUID().slice(0, 8))

      const res = await fetch('/api/admin/categories/upload-icon', {
        method: 'POST',
        body,
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: 'Error al subir' }))
        throw new Error(errBody.error || 'Error al subir la imagen')
      }

      const data = await res.json()
      setNewIcon(data.publicUrl)
      setNewIconPreview(data.publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir')
      setNewIconPreview(null)
    } finally {
      setNewIconUploading(false)
    }
  }

  // ── Crear categoría ──
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError(null)
    setOk(null)

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: newName.trim(),
          descripcion: newDesc.trim() || undefined,
          icono_url: newIcon.trim() || undefined,
          orden: categories.length,
        }),
      })

      if (!res.ok) {
        const b = await res.json()
        throw new Error(b.error || 'Error al crear')
      }

      const { data } = await res.json()
      setCategories((prev) => [...prev, data as AdminCategory])
      setNewName('')
      setNewDesc('')
      setNewIcon('')
      setShowNew(false)
      setOk('Categoría creada correctamente')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setCreating(false)
    }
  }

  // ── Subir icono en modo edición ──
  async function handleEditIconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!editingId) return
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar 5 MB.')
      return
    }
    const allowed = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
    if (!allowed.includes(file.type)) {
      setError('Formato no permitido. Usa JPEG, PNG, SVG o WebP.')
      return
    }

    setError(null)
    setEditIconUploading(true)

    // Revocar blob anterior para evitar memory leak
    if (editIconBlobRef.current) URL.revokeObjectURL(editIconBlobRef.current)
    const previewUrl = URL.createObjectURL(file)
    editIconBlobRef.current = previewUrl
    setEditIconPreview(previewUrl)

    try {
      const body = new FormData()
      body.append('file', file)
      body.append('categoryId', editingId!)

      const res = await fetch('/api/admin/categories/upload-icon', {
        method: 'POST',
        body,
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: 'Error al subir' }))
        throw new Error(errBody.error || 'Error al subir la imagen')
      }

      const data = await res.json()
      setEditIcon(data.publicUrl)
      setEditIconPreview(data.publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir')
      setEditIconPreview(null)
    } finally {
      setEditIconUploading(false)
    }
  }

  // ── Iniciar edición ──
  function startEdit(cat: AdminCategory) {
    setEditingId(cat.id)
    setEditName(cat.nombre)
    setEditDesc(cat.descripcion || '')
    setEditIcon(cat.icono_url || '')
    setEditIconPreview(null)
    setEditOrden(cat.orden)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  // ── Guardar edición ──
  async function handleSave(catId: string) {
    if (!editName.trim()) return
    setSaving(true)
    setError(null)
    setOk(null)

    try {
      const res = await fetch(`/api/admin/categories/${catId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: editName.trim(),
          descripcion: editDesc.trim() || null,
          icono_url: editIcon.trim() || null,
          orden: editOrden,
        }),
      })

      if (!res.ok) {
        const b = await res.json()
        throw new Error(b.error || 'Error al actualizar')
      }

      setCategories((prev) =>
        prev.map((c) =>
          c.id === catId
            ? { ...c, nombre: editName.trim(), descripcion: editDesc.trim() || null, icono_url: editIcon.trim() || null, orden: editOrden }
            : c,
        ),
      )
      setEditingId(null)
      setOk('Categoría actualizada')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  // ── Eliminar categoría ──
  async function handleDelete(catId: string, name: string) {
    if (!confirm(`¿Eliminar la categoría "${name}"? Las apps asociadas se quedarán sin categoría (no se borran).`)) return

    setError(null)
    setOk(null)

    try {
      const res = await fetch(`/api/admin/categories/${catId}`, { method: 'DELETE' })
      if (!res.ok) {
        const b = await res.json()
        throw new Error(b.error || 'Error al eliminar')
      }

      setCategories((prev) => prev.filter((c) => c.id !== catId))
      setOk('Categoría eliminada')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  // ── Reordenar (↑ ↓) ──
  async function moveOrder(index: number, direction: -1 | 1) {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= categories.length) return

    const updated = [...categories]
    const [moved] = updated.splice(index, 1)
    updated.splice(newIndex, 0, moved)

    // Actualizar los órdenes y persistir
    const withNewOrder = updated.map((c, i) => ({ ...c, orden: i }))
    setCategories(withNewOrder)

    // Persistir los dos afectados
    const a = direction === -1 ? updated[newIndex] : updated[index]
    const b = direction === -1 ? updated[index + 1] : updated[newIndex]

    try {
      await Promise.all([
        fetch(`/api/admin/categories/${a.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orden: a.orden }),
        }),
        fetch(`/api/admin/categories/${b.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orden: b.orden }),
        }),
      ])
      router.refresh()
    } catch {
      setError('Error al reordenar')
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Mensajes ── */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {ok && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3">
          <p className="text-sm text-emerald-700">{ok}</p>
        </div>
      )}

      {/* ── Botón nueva categoría ── */}
      {!showNew && (
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nueva categoría
        </button>
      )}

      {/* ── Formulario crear ── */}
      {showNew && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-indigo-200 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Nueva categoría</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                placeholder="Ej: Salud mental"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Icono (emoji, URL o imagen)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newIcon}
                  onChange={(e) => { setNewIcon(e.target.value); setNewIconPreview(null) }}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  placeholder="🌿 o https://..."
                />
                <label className="shrink-0 cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  {newIconUploading ? 'Subiendo...' : '📎 Subir'}
                  <input
                    ref={newIconFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/svg+xml,image/webp"
                    onChange={handleNewIconUpload}
                    className="hidden"
                  />
                </label>
              </div>
              {newIconPreview && (
                <div className="mt-2 flex items-center gap-2">
                  <img
                    src={newIconPreview}
                    alt="Vista previa"
                    className="h-10 w-10 rounded-lg object-cover border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => { setNewIcon(''); setNewIconPreview(null); if (newIconFileRef.current) newIconFileRef.current.value = '' }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Quitar
                  </button>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Descripción (opcional)</label>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              placeholder="Breve descripción de la categoría"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {creating ? 'Creando...' : 'Crear'}
            </button>
            <button
              type="button"
              onClick={() => { setShowNew(false); setNewName(''); setNewDesc(''); setNewIcon('') }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* ── Lista de categorías ── */}
      {categories.length === 0 ? (
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">No hay categorías aún. Crea la primera.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              className={`rounded-lg border p-4 transition-colors ${
                editingId === cat.id
                  ? 'border-indigo-300 bg-indigo-50/50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {editingId === cat.id ? (
                /* ── Modo edición ── */
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Nombre</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Orden</label>
                      <input
                        type="number"
                        value={editOrden}
                        onChange={(e) => setEditOrden(parseInt(e.target.value, 10) || 0)}
                        className="block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Icono</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editIcon}
                          onChange={(e) => { setEditIcon(e.target.value); setEditIconPreview(null) }}
                          className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                          placeholder="🌿 o URL"
                        />
                        <label className="shrink-0 cursor-pointer rounded border border-gray-300 px-2 py-1.5 text-[10px] font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                          {editIconUploading ? '...' : '📎'}
                          <input
                            ref={editIconFileRef}
                            type="file"
                            accept="image/jpeg,image/png,image/svg+xml,image/webp"
                            onChange={handleEditIconUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                      {(editIconPreview || (editIcon && editIcon.startsWith('http') && !editIconPreview)) && (
                        <div className="mt-1 flex items-center gap-1.5">
                          <img
                            src={editIconPreview || editIcon}
                            alt="Icono"
                            className="h-8 w-8 rounded object-cover border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => { setEditIcon(''); setEditIconPreview(null); if (editIconFileRef.current) editIconFileRef.current.value = '' }}
                            className="text-[10px] text-red-500 hover:text-red-700"
                          >
                            Quitar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Descripción</label>
                    <input
                      type="text"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSave(cat.id)}
                      disabled={saving}
                      className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Modo vista ── */
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg shrink-0">{cat.icono_url || '📁'}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{cat.nombre}</p>
                      {cat.descripcion && (
                        <p className="text-xs text-gray-500 truncate">{cat.descripcion}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 font-mono shrink-0">#{cat.orden}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Reordenar */}
                    <button
                      type="button"
                      onClick={() => moveOrder(idx, -1)}
                      disabled={idx === 0}
                      className="rounded p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                      title="Subir"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveOrder(idx, 1)}
                      disabled={idx === categories.length - 1}
                      className="rounded p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                      title="Bajar"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    {/* Editar */}
                    <button
                      type="button"
                      onClick={() => startEdit(cat)}
                      className="rounded p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Editar"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </button>
                    {/* Eliminar */}
                    <button
                      type="button"
                      onClick={() => handleDelete(cat.id, cat.nombre)}
                      className="rounded p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Eliminar"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
