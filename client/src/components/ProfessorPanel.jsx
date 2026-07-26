import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { FiUsers, FiFileText, FiCheckSquare, FiUpload, FiActivity, FiBarChart2 } from 'react-icons/fi'

export default function ProfessorPanel({ sectionSubjectId }) {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sectionSubjectId || user?.role !== 'PROFESOR') return
    loadStats()
  }, [sectionSubjectId])

  const loadStats = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/professor/${sectionSubjectId}/stats`)
      setStats(res.data)
    } catch (err) {
      console.error('Error loading stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (user?.role !== 'PROFESOR') {
    return <div className="flex-1 flex items-center justify-center text-[var(--color-text-secondary)]">Solo disponible para profesores</div>
  }

  const cards = [
    { label: 'Estudiantes', value: stats?.totalStudents ?? '—', icon: FiUsers, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Tareas', value: stats?.assignmentCount ?? '—', icon: FiFileText, color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' },
    { label: 'Quizzes', value: stats?.quizCount ?? '—', icon: FiCheckSquare, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' },
    { label: 'Entregas', value: stats?.totalSubmissions ?? '—', icon: FiUpload, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Intentos Quiz', value: stats?.totalAttempts ?? '—', icon: FiActivity, color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' },
  ]

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <FiBarChart2 size={20} className="text-blue-500" />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Panel del Profesor</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {cards.map(card => (
              <div key={card.label} className="p-4 rounded-xl border border-[var(--color-border-default)]">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
                  <card.icon size={20} />
                </div>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{card.value}</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">{card.label}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-[var(--color-text-secondary)] py-12">Error al cargar estadísticas</p>
        )}
      </div>
    </div>
  )
}
