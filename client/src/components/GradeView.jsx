import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { FiStar, FiCheckSquare, FiPaperclip, FiTrendingUp } from 'react-icons/fi'

export default function GradeView({ sectionSubjectId, onViewProfile }) {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isProfesor = user?.role === 'PROFESOR'

  useEffect(() => { loadGrades() }, [sectionSubjectId])

  const loadGrades = async () => {
    if (!sectionSubjectId) return
    setLoading(true)
    try {
      const endpoint = isProfesor
        ? `/grades/${sectionSubjectId}/all`
        : `/grades/${sectionSubjectId}`
      const res = await api.get(endpoint)
      setData(res.data)
    } catch (err) {
      setError('Error al cargar notas')
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score) => {
    if (score === null || score === undefined) return ''
    if (score >= 70) return 'text-green-600 dark:text-green-400'
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
  }

  if (error) {
    return <div className="flex-1 flex items-center justify-center text-red-500">{error}</div>
  }

  if (isProfesor && data) {
    return (
      <div className="flex-1 p-6 overflow-y-auto">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-6">
          <FiTrendingUp className="inline mr-2" /> Notas — General
        </h2>

        {data.students?.length === 0 ? (
          <p className="text-center text-[var(--color-text-secondary)] py-12">No hay estudiantes inscritos</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-default)]">
                  <th className="text-left px-3 py-2 text-[var(--color-text-secondary)] font-medium">Estudiante</th>
                  {data.quizzes?.map(q => <th key={q.id} className="text-center px-2 py-2 text-[var(--color-text-secondary)] font-medium text-xs">{q.titulo}</th>)}
                  {data.assignments?.map(a => <th key={a.id} className="text-center px-2 py-2 text-[var(--color-text-secondary)] font-medium text-xs">{a.titulo}</th>)}
                  <th className="text-center px-3 py-2 text-[var(--color-text-secondary)] font-medium">Promedio</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map(s => (
                  <tr key={s.user.id} className="border-b border-[var(--color-border-default)] hover:bg-[var(--color-bg-secondary)]">
                    <td className="px-3 py-2">
                      <button onClick={() => onViewProfile?.(s.user.id)} className="flex items-center gap-2 hover:underline text-left">
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-medium overflow-hidden flex-shrink-0">
                          {s.user.avatar ? <img src={s.user.avatar} alt="" className="w-full h-full object-cover" /> : s.user.nombre?.[0]}
                        </div>
                        <span className="text-[var(--color-text-primary)] truncate">{s.user.nombre}</span>
                      </button>
                    </td>
                    {data.quizzes?.map((q, i) => (
                      <td key={q.id} className={`text-center px-2 py-2 ${getScoreColor(s.quizzes[i])}`}>
                        {s.quizzes[i] !== null ? `${Math.round(s.quizzes[i])}%` : '-'}
                      </td>
                    ))}
                    {data.assignments?.map((a, i) => (
                      <td key={a.id} className={`text-center px-2 py-2 ${getScoreColor(s.assignments[i])}`}>
                        {s.assignments[i] !== null ? `${Math.round(s.assignments[i])}%` : '-'}
                      </td>
                    ))}
                    <td className={`text-center px-3 py-2 font-bold ${s.promedio !== null ? getScoreColor(s.promedio) : ''}`}>
                      {s.promedio !== null ? `${Math.round(s.promedio)}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          <FiTrendingUp className="inline mr-2" /> Mis Notas
        </h2>
        {data?.promedio !== null && (
          <div className={`text-lg font-bold ${getScoreColor(data.promedio)}`}>
            Promedio: {Math.round(data.promedio)}%
          </div>
        )}
      </div>

      {data?.grades.length === 0 ? (
        <p className="text-center text-[var(--color-text-secondary)] py-12">No hay notas aún</p>
      ) : (
        <div className="space-y-2">
          {data?.grades.map((g, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-[var(--color-border-default)]">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm ${
                g.tipo === 'QUIZ' ? 'bg-emerald-500' : 'bg-blue-500'
              }`}>
                {g.tipo === 'QUIZ' ? <FiCheckSquare size={18} /> : <FiPaperclip size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-[var(--color-text-primary)]">{g.titulo}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {g.tipo === 'QUIZ' ? 'Quiz' : 'Tarea'} · {new Date(g.fecha).toLocaleDateString('es-ES')}
                </p>
              </div>
              <div className="text-right">
                {g.nota !== null && g.nota !== undefined ? (
                  <p className={`text-lg font-bold ${getScoreColor(g.nota)}`}>
                    {Math.round(g.nota)}%
                  </p>
                ) : (
                  <p className="text-sm text-[var(--color-text-secondary)]">Pendiente</p>
                )}
                {g.feedback && <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">{g.feedback}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {data?.promedio !== null && (
        <div className={`mt-6 p-4 rounded-xl border text-center ${
          data.promedio >= 70
            ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
            : data.promedio >= 50
              ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10'
              : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
        }`}>
          <p className="text-sm text-[var(--color-text-secondary)]">Promedio general</p>
          <p className={`text-3xl font-bold mt-1 ${getScoreColor(data.promedio)}`}>
            {Math.round(data.promedio)}%
          </p>
        </div>
      )}
    </div>
  )
}
