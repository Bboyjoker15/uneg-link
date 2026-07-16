import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { FiPlus, FiPaperclip, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiTrash2, FiEdit3, FiStar, FiDownload, FiSend } from 'react-icons/fi'

const STATUS_STYLES = {
  PENDIENTE: { label: 'Pendiente', color: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20' },
  ENTREGADA: { label: 'Entregada', color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20' },
  CALIFICADA: { label: 'Calificada', color: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20' },
  VENCIDA: { label: 'Vencida', color: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20' }
}

export default function AssignmentView({ sectionSubjectId, connected, onViewProfile }) {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState(null)
  const [submitForId, setSubmitForId] = useState(null)
  const [submissionsView, setSubmissionsView] = useState(null)
  const [formData, setFormData] = useState({ titulo: '', descripcion: '', fechaLimite: '' })
  const [submitData, setSubmitData] = useState({ archivo: null, comentario: '' })

  const isProfesor = user?.role === 'PROFESOR'

  useEffect(() => { loadAssignments() }, [sectionSubjectId])

  const loadAssignments = async () => {
    if (!sectionSubjectId) return
    setLoading(true)
    try {
      const res = await api.get(`/assignments/${sectionSubjectId}`)
      setAssignments(res.data)
    } catch (err) {
      setError('Error al cargar tareas')
    } finally {
      setLoading(false)
    }
  }

  const getStatus = (a) => {
    if (isProfesor) return null
    const sub = a.submissions?.[0]
    if (sub?.nota !== null && sub?.nota !== undefined) return 'CALIFICADA'
    if (sub) return 'ENTREGADA'
    if (a.fechaLimite && new Date(a.fechaLimite) < new Date()) return 'VENCIDA'
    return 'PENDIENTE'
  }

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-600 dark:text-green-400'
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    const form = new FormData()
    form.append('titulo', formData.titulo)
    form.append('descripcion', formData.descripcion)
    if (formData.fechaLimite) form.append('fechaLimite', formData.fechaLimite)
    if (formData.archivo) form.append('archivo', formData.archivo)
    try {
      await api.post(`/assignments/${sectionSubjectId}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setFormData({ titulo: '', descripcion: '', fechaLimite: '' })
      setShowCreate(false)
      loadAssignments()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear tarea')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta tarea?')) return
    try {
      await api.delete(`/assignments/${id}`)
      loadAssignments()
    } catch (err) {
      setError('Error al eliminar tarea')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!submitData.archivo) return
    setError('')
    const form = new FormData()
    form.append('archivo', submitData.archivo)
    if (submitData.comentario) form.append('comentario', submitData.comentario)
    try {
      await api.post(`/assignments/${submitForId}/submit`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setSubmitForId(null)
      setSubmitData({ archivo: null, comentario: '' })
      loadAssignments()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al entregar')
    }
  }

  const loadSubmissions = async (assignmentId) => {
    try {
      const res = await api.get(`/assignments/${assignmentId}/submissions`)
      setSubmissionsView({ assignmentId, submissions: res.data })
    } catch (err) {
      setError('Error al cargar entregas')
    }
  }

  const handleGrade = async (assignmentId, userId, nota, feedback) => {
    try {
      await api.put(`/assignments/${assignmentId}/grade/${userId}`, { nota, feedback })
      loadSubmissions(assignmentId)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al calificar')
    }
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          <FiPaperclip className="inline mr-2" />
          Tareas
        </h2>
        {isProfesor && connected && (
          <button onClick={() => { setShowCreate(!showCreate); setError('') }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center gap-2">
            <FiPlus size={16} /> Nueva Tarea
          </button>
        )}
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 p-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] space-y-3">
          <input type="text" value={formData.titulo} onChange={e => setFormData({ ...formData, titulo: e.target.value })} placeholder="Título de la tarea" className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500" required />
          <textarea value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} placeholder="Descripción (opcional)" rows={3} className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Fecha límite (opcional)</label>
              <input type="datetime-local" value={formData.fechaLimite} onChange={e => setFormData({ ...formData, fechaLimite: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Archivo adjunto (opcional)</label>
              <input type="file" onChange={e => setFormData({ ...formData, archivo: e.target.files[0] })} className="w-full text-sm text-[var(--color-text-secondary)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-blue-600 file:text-white hover:file:bg-blue-700" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">Crear Tarea</button>
            <button type="button" onClick={() => { setShowCreate(false); setFormData({ titulo: '', descripcion: '', fechaLimite: '' }); setError('') }} className="px-4 py-2 border border-[var(--color-border-default)] rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors">Cancelar</button>
          </div>
        </form>
      )}

      {submissionsView ? (
        <div>
          <button onClick={() => setSubmissionsView(null)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mb-4">
            ← Volver a tareas
          </button>
          <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">
            Entregas — {assignments.find(a => a.id === submissionsView.assignmentId)?.titulo}
          </h3>
          <div className="space-y-2">
            {submissionsView.submissions.length === 0 ? (
              <p className="text-center text-[var(--color-text-secondary)] py-8">Sin entregas aún</p>
            ) : submissionsView.submissions.map(s => (
              <div key={s.id} className="p-4 rounded-xl border border-[var(--color-border-default)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => onViewProfile?.(s.user.id)} className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium overflow-hidden flex-shrink-0 hover:opacity-80">
                      {s.user.avatar ? <img src={s.user.avatar} alt="" className="w-full h-full object-cover" /> : s.user.nombre?.[0]}
                    </button>
                    <div className="min-w-0">
                      <button onClick={() => onViewProfile?.(s.user.id)} className="font-medium text-sm text-[var(--color-text-primary)] hover:underline truncate block">{s.user.nombre}</button>
                      <p className="text-xs text-[var(--color-text-secondary)]">{s.user.cedula}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{new Date(s.submittedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <a href={s.archivoUrl} target="_blank" className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-1 flex-shrink-0">
                    <FiDownload size={12} /> Ver archivo
                  </a>
                </div>
                {s.comentario && <p className="text-sm text-[var(--color-text-secondary)] mt-2 ml-11">{s.comentario}</p>}
                <div className="mt-3 ml-11 flex items-start gap-3">
                  <div>
                    <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Nota (0-100)</label>
                    <input
                      type="number" min="0" max="100"
                      defaultValue={s.nota ?? ''}
                      onBlur={e => {
                        const val = e.target.value === '' ? null : parseFloat(e.target.value)
                        if (val !== s.nota) handleGrade(submissionsView.assignmentId, s.user.id, val, s.feedback)
                      }}
                      className="w-20 px-2 py-1 text-sm rounded border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Feedback</label>
                    <input
                      type="text"
                      defaultValue={s.feedback || ''}
                      onBlur={e => {
                        if (e.target.value !== (s.feedback || '')) handleGrade(submissionsView.assignmentId, s.user.id, s.nota, e.target.value || null)
                      }}
                      placeholder="Comentario..."
                      className="w-full px-2 py-1 text-sm rounded border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.length === 0 ? (
            <p className="text-center text-[var(--color-text-secondary)] py-12">
              {isProfesor ? 'No hay tareas. ¡Crea la primera!' : 'No hay tareas aún'}
            </p>
          ) : assignments.map(a => {
            const status = getStatus(a)
            const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.PENDIENTE
            return (
              <div key={a.id} className="p-4 rounded-xl border border-[var(--color-border-default)] hover:border-[var(--color-border-hover)] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-[var(--color-text-primary)]">{a.titulo}</h3>
                      {status && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusStyle.color}`}>{statusStyle.label}</span>}
                    </div>
                    {a.descripcion && <p className="text-sm text-[var(--color-text-secondary)] mt-1">{a.descripcion}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-[var(--color-text-secondary)]">
                      <span className="flex items-center gap-1"><FiClock size={12} /> Creada {new Date(a.createdAt).toLocaleDateString('es-ES')}</span>
                      {a.fechaLimite && <span className="flex items-center gap-1"><FiAlertCircle size={12} /> Límite: {new Date(a.fechaLimite).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                      {!isProfesor && a.submissions?.[0]?.nota !== null && a.submissions?.[0]?.nota !== undefined && (
                        <span className={`font-semibold ${getScoreColor(a.submissions[0].nota)}`}>
                          <FiStar className="inline mr-0.5" size={12} /> {Math.round(a.submissions[0].nota)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {a.archivoUrl && (
                      <a href={a.archivoUrl} target="_blank" className="p-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]" title="Ver adjunto">
                        <FiPaperclip size={14} />
                      </a>
                    )}
                    {isProfesor ? (
                      <>
                        <button onClick={() => loadSubmissions(a.id)} className="px-3 py-1.5 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border-default)] rounded-lg text-xs hover:bg-[var(--color-bg-tertiary)] transition-colors whitespace-nowrap">
                          {a._count?.submissions || 0} entregas
                        </button>
                        <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-[var(--color-text-secondary)] hover:text-red-600 transition-colors">
                          <FiTrash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        {status === 'VENCIDA' ? (
                          <span className="text-xs text-red-500 font-medium">Vencida</span>
                        ) : (
                          <button onClick={() => setSubmitForId(a.id)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors flex items-center gap-1" disabled={!connected}>
                            <FiSend size={12} />
                            {status === 'ENTREGADA' ? 'Reentregar' : 'Entregar'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {!isProfesor && a.submissions?.[0]?.feedback && (
                  <div className="mt-3 p-3 rounded-lg bg-[var(--color-bg-secondary)] text-sm">
                    <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1">Feedback del profesor:</p>
                    <p className="text-[var(--color-text-primary)]">{a.submissions[0].feedback}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {submitForId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setSubmitForId(null); setSubmitData({ archivo: null, comentario: '' }) }}>
          <div className="bg-[var(--color-bg)] rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Entregar tarea</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Archivo</label>
                <input type="file" onChange={e => setSubmitData({ ...submitData, archivo: e.target.files[0] })} className="w-full text-sm text-[var(--color-text-secondary)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-blue-600 file:text-white hover:file:bg-blue-700" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Comentario (opcional)</label>
                <textarea value={submitData.comentario} onChange={e => setSubmitData({ ...submitData, comentario: e.target.value })} rows={3} className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setSubmitForId(null); setSubmitData({ archivo: null, comentario: '' }) }} className="px-4 py-2 border border-[var(--color-border-default)] rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">Entregar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
