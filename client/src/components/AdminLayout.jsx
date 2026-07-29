import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { FiArrowLeft, FiHome, FiUsers, FiBookOpen, FiLayout, FiLink, FiClipboard, FiFileText, FiShield, FiSun, FiMoon, FiLogOut } from 'react-icons/fi'
import AdminOverview from './AdminOverview'
import UsersView from './UsersView'
import EntityView from './EntityView'
import SectionSubjectsView from './SectionSubjectsView'
import EnrollmentsView from './EnrollmentsView'

const ENTITIES = [
  { key: 'overview', label: 'Panel General', icon: FiHome, color: 'text-blue-500' },
  { key: 'users', label: 'Usuarios', icon: FiUsers, color: 'text-violet-500' },
  { key: 'subjects', label: 'Materias', icon: FiBookOpen, color: 'text-emerald-500' },
  { key: 'sections', label: 'Secciones', icon: FiLayout, color: 'text-amber-500' },
  { key: 'section-subjects', label: 'Materia-Sección', icon: FiLink, color: 'text-rose-500' },
  { key: 'enrollments', label: 'Inscripciones', icon: FiClipboard, color: 'text-cyan-500' },
  { key: 'assignments', label: 'Tareas', icon: FiFileText, color: 'text-orange-500' }
]

const subjectsCols = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'codigo', label: 'Código' }
]
const subjectsFields = [
  { key: 'nombre', label: 'Nombre', placeholder: 'Ej: Matemáticas I' },
  { key: 'codigo', label: 'Código', placeholder: 'MAT-101' }
]

const sectionsCols = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'codigo', label: 'Código' },
  { key: 'year', label: 'Año' },
  { key: 'semester', label: 'Semestre' }
]
const sectionsFields = [
  { key: 'nombre', label: 'Nombre', placeholder: 'Ej: Sección A' },
  { key: 'codigo', label: 'Código', placeholder: 'SEC-A' },
  { key: 'year', label: 'Año', placeholder: '2026' },
  { key: 'semester', label: 'Semestre', placeholder: '1' }
]

const assignmentsCols = [
  { key: 'titulo', label: 'Título', render: (item) => <span className="truncate block max-w-52">{item.titulo}</span> },
  { key: 'sectionSubject', label: 'Materia', render: (item) => `${item.sectionSubject?.subject?.nombre} - ${item.sectionSubject?.section?.codigo}` },
  { key: 'submissions', label: 'Entregas', render: (item) => item._count?.submissions || 0 }
]
const assignmentsFields = [
  { key: 'titulo', label: 'Título', placeholder: 'Título de la tarea' },
  { key: 'descripcion', label: 'Descripción', placeholder: 'Descripción (opcional)', required: false },
  { key: 'sectionSubjectId', label: 'ID Materia-Sección', placeholder: 'UUID' },
  { key: 'fechaLimite', label: 'Fecha límite', type: 'datetime-local', required: false }
]

export default function AdminLayout() {
  const [active, setActive] = useState('overview')
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg)]">
      <header className="flex items-center justify-between px-5 py-2.5 border-b border-[var(--color-border-default)] bg-gradient-to-r from-red-600/5 to-transparent">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] transition-colors">
            <FiArrowLeft size={18} />
          </button>
          <div className="w-9 h-9 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center shadow-sm shadow-red-900/20">
            <FiShield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[var(--color-text-primary)]">Panel Administrativo</h1>
            <p className="text-[10px] text-[var(--color-text-secondary)] -mt-0.5">Uneg-Link</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggle} className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] transition-colors">
            {theme === 'light' ? <FiMoon size={17} /> : <FiSun size={17} />}
          </button>
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border-default)] text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors">
            <FiLogOut size={14} /> Salir
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-h-0">
        <aside className="w-60 border-r border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] flex-shrink-0 flex flex-col gap-px">
          <div className="px-3 pt-4 pb-2">
            <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)] font-semibold px-2 mb-2 opacity-60">Navegación</p>
            {ENTITIES.map(e => (
              <button
                key={e.key}
                onClick={() => setActive(e.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-all duration-150 group ${
                  active === e.key
                    ? 'bg-white dark:bg-gray-800 shadow-sm border border-[var(--color-border-default)] font-medium'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/60 dark:hover:bg-gray-800/40 border border-transparent'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  active === e.key
                    ? `${e.color} bg-current/10`
                    : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] group-hover:text-current'
                }`}>
                  <e.icon size={16} />
                </div>
                <span className="flex-1">{e.label}</span>
                {active === e.key && (
                  <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                )}
              </button>
            ))}
          </div>
          <div className="mt-auto px-4 py-3 border-t border-[var(--color-border-default)]">
            <div className="flex items-center gap-2 px-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-[var(--color-text-secondary)]">Conectado a Turso</span>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex overflow-hidden min-h-0 bg-[var(--color-bg)]">
          {active === 'overview' && <AdminOverview onNavigate={setActive} />}
          {active === 'users' && <UsersView />}
          {active === 'subjects' && (
            <EntityView entity="subjects" columns={subjectsCols} fields={subjectsFields} searchPlaceholder="Buscar materia..." />
          )}
          {active === 'sections' && (
            <EntityView entity="sections" columns={sectionsCols} fields={sectionsFields} searchPlaceholder="Buscar sección..." />
          )}
          {active === 'section-subjects' && <SectionSubjectsView />}
          {active === 'enrollments' && <EnrollmentsView />}
          {active === 'assignments' && (
            <EntityView entity="assignments" columns={assignmentsCols} fields={assignmentsFields} />
          )}
        </main>
      </div>
    </div>
  )
}
