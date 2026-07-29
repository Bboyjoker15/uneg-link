import { useState, useEffect } from 'react'
import api from '../services/api'
import { FiUsers, FiBookOpen, FiLayout, FiLink, FiClipboard, FiFileText, FiTrendingUp, FiActivity } from 'react-icons/fi'

const STATS = [
  { key: 'users', label: 'Usuarios', icon: FiUsers, color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800', entity: 'users' },
  { key: 'subjects', label: 'Materias', icon: FiBookOpen, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', entity: 'subjects' },
  { key: 'sections', label: 'Secciones', icon: FiLayout, color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', entity: 'sections' },
  { key: 'sectionSubjects', label: 'Materia-Sección', icon: FiLink, color: 'from-rose-500 to-pink-600', bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800', entity: 'section-subjects' },
  { key: 'enrollments', label: 'Inscripciones', icon: FiClipboard, color: 'from-cyan-500 to-blue-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800', entity: 'enrollments' },
  { key: 'assignments', label: 'Tareas', icon: FiFileText, color: 'from-orange-500 to-red-600', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800', entity: 'assignments' }
]

export default function AdminOverview({ onNavigate }) {
  const [stats, setStats] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    api.get('/admin/stats/overview').then(r => { setStats(r.data); setLoaded(true) }).catch(console.error)
  }, [])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-sm shadow-red-900/20">
            <FiTrendingUp size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Panel General</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">Resumen de todas las entidades del sistema</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          {STATS.map(s => (
            <button
              key={s.key}
              onClick={() => onNavigate?.(s.entity)}
              className={`p-5 rounded-2xl border ${s.border} ${s.bg} text-left hover:shadow-md transition-all duration-200 group cursor-pointer`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                  <s.icon size={22} className="text-white" />
                </div>
                {loaded && (
                  <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    <FiActivity size={12} />
                    <span className="text-[10px] font-medium">Ver</span>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <p className={`text-3xl font-bold ${s.text}`}>
                  {loaded ? (stats?.[s.key] ?? '—') : (
                    <span className="inline-block w-12 h-8 bg-current/10 rounded animate-pulse" />
                  )}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1 font-medium">{s.label}</p>
              </div>
            </button>
          ))}
        </div>

        {loaded && (
          <div className="rounded-2xl border border-[var(--color-border-default)] p-5 bg-[var(--color-bg-secondary)]">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.sectionSubjects - stats.subjects}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">Secciones por materia</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.enrollments ? Math.round(stats.enrollments / (stats.users || 1)) : '—'}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">Inscripciones por usuario</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.users} en total</p>
                <p className="text-xs text-[var(--color-text-secondary)]">Registros en el sistema</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
