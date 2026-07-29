import { useState, useEffect, useCallback } from 'react'
import { FiPlus, FiSearch } from 'react-icons/fi'
import api from '../services/api'
import GenericDataTable from './GenericDataTable'
import GenericFormModal from './GenericFormModal'

const SUB_ROLES = [
  { value: '', label: 'Sin rol' },
  { value: 'DELEGADO', label: 'Delegado' },
  { value: 'PREPARADOR', label: 'Preparador' },
  { value: 'VOCERO', label: 'Vocero' }
]

const columns = [
  {
    key: 'user', label: 'Estudiante',
    render: (item) => (
      <div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{item.user?.nombre}</p>
        <p className="text-[10px] text-[var(--color-text-secondary)]">{item.user?.cedula}</p>
      </div>
    )
  },
  {
    key: 'sectionSubject', label: 'Materia',
    render: (item) => (
      <div>
        <p className="text-sm text-[var(--color-text-primary)]">{item.sectionSubject?.subject?.nombre}</p>
        <p className="text-[10px] text-[var(--color-text-secondary)]">{item.sectionSubject?.section?.codigo} &middot; {item.sectionSubject?.profesor?.nombre}</p>
      </div>
    )
  },
  {
    key: 'subRole', label: 'Rol',
    render: (item) => item.subRole ? (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
        item.subRole === 'DELEGADO' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
        item.subRole === 'PREPARADOR' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' :
        'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400'
      }`}>{item.subRole}</span>
    ) : <span className="text-sm text-[var(--color-text-secondary)]">—</span>
  }
]

export default function EnrollmentsView() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState(null)
  const [error, setError] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [sectionSubjects, setSectionSubjects] = useState([])
  const [searching, setSearching] = useState(false)

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await api.get('/admin/enrollments', { params: { page: p, limit: 20 } })
      setItems(res.data.items)
      setTotal(res.data.total)
      setPage(res.data.page)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])
  useEffect(() => {
    api.get('/admin/section-subjects?limit=100').then(r => setSectionSubjects(r.data.items)).catch(console.error)
  }, [])

  const handleStudentSearch = async (q) => {
    setStudentSearch(q)
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await api.get('/admin/users', { params: { search: q, limit: 10 } })
      setSearchResults(res.data.items.filter(u => u.role !== 'PROFESOR' && u.role !== 'ADMIN'))
    } catch (err) { console.error(err) }
    finally { setSearching(false) }
  }

  const handleDelete = async (item) => {
    if (!confirm('¿Eliminar esta inscripción?')) return
    try { await api.delete(`/admin/enrollments/${item.id}`); load(page) }
    catch (err) { setError(err.response?.data?.error || 'Error') }
  }

  const handleEdit = (item) => {
    setModal({ mode: 'edit', data: { ...item, userId: item.user?.id, sectionSubjectId: item.sectionSubjectId, subRole: item.subRole || '' } })
  }

  const handleCreate = () => setModal({ mode: 'create' })

  const handleSave = async (form) => {
    setSaving(true)
    setError('')
    try {
      if (modal.mode === 'create') {
        await api.post('/admin/enrollments', form)
      } else {
        await api.put(`/admin/enrollments/${modal.data.id}`, form)
      }
      setModal(null)
      load(page)
    } catch (err) { setError(err.response?.data?.error || 'Error al guardar') }
    finally { setSaving(false) }
  }

  const fields = modal?.mode === 'create' ? [
    {
      key: 'userId', label: 'Estudiante',
      render: (form, handleChange) => (
        <div>
          {form.userId ? (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">{studentSearch}</span>
              <button type="button" onClick={() => { setStudentSearch(''); handleChange('userId', ''); setSearchResults([]) }}
                className="text-xs text-red-500 hover:text-red-700">Cambiar</button>
            </div>
          ) : (
            <>
              <div className="relative">
                <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
                <input type="text" placeholder="Buscar estudiante por nombre o cédula..."
                  value={studentSearch} onChange={e => handleStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              </div>
              {searching && <p className="text-xs text-[var(--color-text-secondary)] mt-2">Buscando...</p>}
              {searchResults.length > 0 && (
                <div className="max-h-36 overflow-y-auto border border-[var(--color-border-default)] rounded-xl mt-2 divide-y divide-[var(--color-border-default)]">
                  {searchResults.map(u => (
                    <button key={u.id} type="button" onClick={() => {
                      setStudentSearch(u.nombre)
                      handleChange('userId', u.id)
                      setSearchResults([])
                    }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] transition-colors">
                      <span className="font-medium">{u.nombre}</span>
                      <span className="text-xs text-[var(--color-text-secondary)] ml-2">{u.cedula}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )
    },
    {
      key: 'sectionSubjectId', label: 'Materia-Sección', type: 'select',
      options: sectionSubjects.map(ss => ({
        value: ss.id,
        label: `${ss.subject?.nombre} — ${ss.section?.codigo} (${ss.profesor?.nombre})`
      }))
    },
    { key: 'subRole', label: 'Sub-rol', type: 'select', options: SUB_ROLES, required: false }
  ] : [
    { key: 'subRole', label: 'Sub-rol', type: 'select', options: SUB_ROLES, required: false }
  ]

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 py-3.5 border-b border-[var(--color-border-default)] flex items-center justify-between bg-[var(--color-bg-secondary)]/50">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Inscripciones</h2>
        <button onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm shadow-blue-900/20">
          <FiPlus size={15} /> Inscribir estudiante
        </button>
      </div>
      {error && (
        <div className="mx-6 mt-3 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 text-xs rounded-xl border border-red-200 dark:border-red-800 flex items-center gap-2">
          <span className="font-medium">⚠</span> {error}
        </div>
      )}
      <GenericDataTable
        entity="Inscripciones"
        columns={columns}
        items={items}
        total={total}
        page={page}
        totalPages={Math.ceil(total / 20)}
        onPageChange={setPage}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      {modal && (<GenericFormModal
        title={modal.mode === 'create' ? 'Inscribir estudiante' : 'Editar inscripción'}
        fields={fields}
        initialData={modal.data}
        onSave={handleSave}
        onClose={() => { setModal(null); setError('') }}
        saving={saving}
      />)}
    </div>
  )
}
