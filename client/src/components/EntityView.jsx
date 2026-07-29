import { useState, useEffect, useCallback } from 'react'
import { FiPlus } from 'react-icons/fi'
import api from '../services/api'
import GenericDataTable from './GenericDataTable'
import GenericFormModal from './GenericFormModal'

export default function EntityView({ entity, columns, fields, dataTransform, searchPlaceholder }) {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async (p = 1, q = '') => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/${entity}`, { params: { page: p, limit: 20, search: q } })
      setItems(dataTransform ? dataTransform(res.data.items) : res.data.items)
      setTotal(res.data.total)
      setPage(res.data.page)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [entity, dataTransform])

  useEffect(() => { load(1, search) }, [entity])

  const handleSearch = (q) => { setSearch(q); load(1, q) }
  const handlePageChange = (p) => load(p, search)

  const handleCreate = () => setModal({ mode: 'create' })
  const handleEdit = (item) => setModal({ mode: 'edit', data: item })

  const handleDelete = async (item) => {
    if (!confirm(`¿Eliminar este registro?`)) return
    setError('')
    try {
      await api.delete(`/admin/${entity}/${item.id}`)
      load(page, search)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar')
    }
  }

  const handleSave = async (formData) => {
    setSaving(true)
    setError('')
    try {
      if (modal.mode === 'create') {
        await api.post(`/admin/${entity}`, formData)
      } else {
        await api.put(`/admin/${entity}/${modal.data.id}`, formData)
      }
      setModal(null)
      load(page, search)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 py-3.5 border-b border-[var(--color-border-default)] flex items-center justify-between bg-[var(--color-bg-secondary)]/50">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{entity.charAt(0).toUpperCase() + entity.slice(1).replace('-', ' ')}</h2>
        <button onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm shadow-blue-900/20">
          <FiPlus size={15} /> Crear
        </button>
      </div>

      {error && (
        <div className="mx-6 mt-3 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 text-xs rounded-xl border border-red-200 dark:border-red-800 flex items-center gap-2">
          <span className="font-medium">⚠</span> {error}
        </div>
      )}

      {loading && !items.length ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-blue-600 border-t-transparent" />
            <p className="text-sm text-[var(--color-text-secondary)]">Cargando...</p>
          </div>
        </div>
      ) : (
        <GenericDataTable
          entity={entity}
          columns={columns}
          items={items}
          total={total}
          page={page}
          totalPages={Math.ceil(total / 20)}
          onPageChange={handlePageChange}
          onSearch={searchPlaceholder ? handleSearch : null}
          searchPlaceholder={searchPlaceholder}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {modal && (
        <GenericFormModal
          title={modal.mode === 'create' ? `Crear ${entity}` : `Editar ${entity}`}
          fields={fields}
          initialData={modal.data}
          onSave={handleSave}
          onClose={() => { setModal(null); setError('') }}
          saving={saving}
        />
      )}
    </div>
  )
}
