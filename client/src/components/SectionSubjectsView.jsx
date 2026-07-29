import { useState, useEffect } from 'react'
import api from '../services/api'
import EntityView from './EntityView'

const columns = [
  {
    key: 'subject', label: 'Materia',
    render: (item) => (
      <div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{item.subject?.nombre || item.subjectId}</p>
        <p className="text-[10px] text-[var(--color-text-secondary)]">{item.subject?.codigo}</p>
      </div>
    )
  },
  {
    key: 'section', label: 'Sección',
    render: (item) => (
      <div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{item.section?.nombre}</p>
        <p className="text-[10px] text-[var(--color-text-secondary)]">{item.section?.codigo} · {item.section?.year}-{item.section?.semester}</p>
      </div>
    )
  },
  {
    key: 'profesor', label: 'Profesor',
    render: (item) => (
      <span className="text-sm">
        {item.profesor?.nombre ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center text-white text-[10px] font-bold">P</span>
            {item.profesor.nombre}
          </span>
        ) : item.profesorId}
      </span>
    )
  }
]

export default function SectionSubjectsView() {
  const [subjects, setSubjects] = useState([])
  const [sections, setSections] = useState([])
  const [professors, setProfessors] = useState([])

  useEffect(() => {
    Promise.all([
      api.get('/admin/subjects?limit=100').then(r => setSubjects(r.data.items)),
      api.get('/admin/sections?limit=100').then(r => setSections(r.data.items)),
      api.get('/admin/users?limit=200').then(r => setProfessors(r.data.items.filter(u => u.role === 'PROFESOR')))
    ]).catch(console.error)
  }, [])

  const fields = [
    {
      key: 'subjectId', label: 'Materia', type: 'select',
      options: subjects.map(s => ({ value: s.id, label: `${s.nombre} (${s.codigo})` }))
    },
    {
      key: 'sectionId', label: 'Sección', type: 'select',
      options: sections.map(s => ({ value: s.id, label: `${s.nombre} — ${s.codigo} (${s.year}-${s.semester})` }))
    },
    {
      key: 'profesorId', label: 'Profesor', type: 'select',
      options: professors.map(p => ({ value: p.id, label: p.nombre }))
    }
  ]

  return (
    <EntityView
      entity="section-subjects"
      columns={columns}
      fields={fields}
    />
  )
}
