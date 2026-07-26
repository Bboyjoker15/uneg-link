import { useState, useEffect } from 'react'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { FiUsers, FiPlus, FiX, FiTrash2, FiUserPlus } from 'react-icons/fi'

export default function GroupView({ sectionSubjectId, members }) {
  const { user } = useAuth()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [nombre, setNombre] = useState('')
  const [selectedMembers, setSelectedMembers] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const isProfessor = user?.role === 'PROFESOR'

  useEffect(() => {
    loadGroups()
  }, [sectionSubjectId])

  const loadGroups = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/groups/${sectionSubjectId}`)
      setGroups(res.data)
    } catch (err) {
      console.error('Error loading groups:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) return
    setSubmitting(true)
    try {
      const res = await api.post(`/groups/${sectionSubjectId}`, {
        nombre,
        memberIds: selectedMembers
      })
      setGroups(prev => [...prev, res.data])
      setNombre('')
      setSelectedMembers([])
      setShowCreate(false)
    } catch (err) {
      console.error('Error creating group:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (groupId) => {
    if (!confirm('¿Eliminar este grupo?')) return
    try {
      await api.delete(`/groups/group/${groupId}`)
      setGroups(prev => prev.filter(g => g.id !== groupId))
    } catch (err) {
      console.error('Error deleting group:', err)
    }
  }

  const handleRemoveMember = async (groupId, userId) => {
    try {
      await api.delete(`/groups/group/${groupId}/members/${userId}`)
      loadGroups()
    } catch (err) {
      console.error('Error removing member:', err)
    }
  }

  const handleAddMember = async (groupId, userId) => {
    try {
      await api.post(`/groups/group/${groupId}/members/${userId}`)
      loadGroups()
    } catch (err) {
      console.error('Error adding member:', err)
    }
  }

  const availableStudents = (members || []).filter(m =>
    !groups.some(g => g.members.some(gm => gm.userId === m.id))
  )

  const myGroup = groups.find(g => g.members.some(m => m.userId === user?.id))

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Grupos de Trabajo</h2>
          {isProfessor && (
            <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 text-sm font-medium">
              <FiPlus size={16} /> Nuevo grupo
            </button>
          )}
        </div>

        {!isProfessor && !myGroup && (
          <div className="text-center py-12">
            <FiUsers size={40} className="mx-auto mb-3 text-[var(--color-text-secondary)] opacity-30" />
            <p className="text-[var(--color-text-secondary)]">No estás asignado a ningún grupo aún</p>
          </div>
        )}

        {showCreate && (
          <form onSubmit={handleCreate} className="mb-6 p-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] space-y-3">
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Nombre del grupo"
              className="w-full px-4 py-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div>
              <p className="text-xs text-[var(--color-text-secondary)] mb-2">Seleccionar miembros:</p>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {availableStudents.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMembers(prev =>
                      prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                    )}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedMembers.includes(m.id)
                        ? 'bg-blue-500 text-white'
                        : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    {m.nombre}
                  </button>
                ))}
                {availableStudents.length === 0 && (
                  <p className="text-xs text-[var(--color-text-secondary)]">Todos los estudiantes ya están en un grupo</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border border-[var(--color-border-default)] text-sm text-[var(--color-text-secondary)]">Cancelar</button>
              <button type="submit" disabled={!nombre.trim() || submitting} className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium disabled:opacity-50">
                {submitting ? 'Creando...' : 'Crear grupo'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : groups.length === 0 && isProfessor ? (
          <div className="text-center py-12">
            <FiUsers size={40} className="mx-auto mb-3 text-[var(--color-text-secondary)] opacity-30" />
            <p className="text-[var(--color-text-secondary)]">No hay grupos creados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map(group => {
              const isMyGroup = group.members.some(m => m.userId === user?.id)
              const groupNotIn = availableStudents.filter(m => !group.members.some(gm => gm.userId === m.id))
              return (
                <div key={group.id} className={`p-4 rounded-xl border ${
                  isMyGroup ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10' : 'border-[var(--color-border-default)]'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FiUsers size={16} className="text-blue-500" />
                      <h3 className="font-semibold text-[var(--color-text-primary)]">{group.nombre}</h3>
                      <span className="text-xs text-[var(--color-text-secondary)]">{group.members.length} miembro{group.members.length !== 1 ? 's' : ''}</span>
                    </div>
                    {isProfessor && (
                      <button onClick={() => handleDelete(group.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-[var(--color-text-secondary)] hover:text-red-600">
                        <FiTrash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.members.map(m => (
                      <div key={m.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-bg-tertiary)]">
                        <span className="text-[var(--color-text-primary)]">{m.user.nombre}</span>
                        {isProfessor && (
                          <button onClick={() => handleRemoveMember(group.id, m.userId)} className="text-[var(--color-text-secondary)] hover:text-red-500">
                            <FiX size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {isProfessor && groupNotIn.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[var(--color-border-default)]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-[var(--color-text-secondary)]">Añadir:</span>
                        {groupNotIn.map(m => (
                          <button
                            key={m.id}
                            onClick={() => handleAddMember(group.id, m.id)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-0.5"
                          >
                            <FiUserPlus size={10} /> {m.nombre}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
