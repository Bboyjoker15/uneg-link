import { useState } from 'react'
import api from '../services/api'
import { FiPlus, FiTrash2, FiCpu, FiSave, FiArrowUp, FiArrowDown } from 'react-icons/fi'

const QUESTION_TYPES = [
  { value: 'multiple-choice', label: 'Opción múltiple', color: 'blue' },
  { value: 'true-false', label: 'Verdadero/Falso', color: 'teal' },
  { value: 'short-answer', label: 'Respuesta corta', color: 'amber' },
  { value: 'essay', label: 'Ensayo/Análisis', color: 'purple' },
  { value: 'calculation', label: 'Cálculo', color: 'red' }
]

const TYPE_COLORS = {
  'multiple-choice': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  'true-false': { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800' },
  'short-answer': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  'essay': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  'calculation': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' }
}

export default function QuizCreator({ sectionSubjectId, onClose, onSaved }) {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [maxAttempts, setMaxAttempts] = useState(1)
  const [timeLimit, setTimeLimit] = useState('')
  const [questions, setQuestions] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showAIGenerator, setShowAIGenerator] = useState(false)
  const [aiTopic, setAiTopic] = useState('')
  const [aiNumQuestions, setAiNumQuestions] = useState(5)
  const [aiTypes, setAiTypes] = useState(['multiple-choice', 'true-false', 'short-answer'])
  const [aiLoading, setAiLoading] = useState(false)

  const addQuestion = (type = 'multiple-choice') => {
    const base = {
      id: `q${Date.now()}`,
      type,
      question: '',
      correctAnswer: ''
    }
    if (type === 'multiple-choice') base.options = ['', '', '', '']
    if (type === 'essay') {
      base.correctAnswer = ''
      base.modelAnswer = ''
    }
    setQuestions([...questions, base])
  }

  const updateQuestion = (id, field, value) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q))
  }

  const updateOption = (id, index, value) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, options: q.options.map((o, i) => i === index ? value : o) } : q))
  }

  const removeQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id))
  }

  const moveQuestion = (index, direction) => {
    const newQ = [...questions]
    const target = index + direction
    if (target < 0 || target >= newQ.length) return
    ;[newQ[index], newQ[target]] = [newQ[target], newQ[index]]
    setQuestions(newQ)
  }

  const handleGenerateWithAI = async () => {
    if (!aiTopic.trim()) return
    setAiLoading(true)
    setError('')
    try {
      const res = await api.post('/ai/generate-quiz', {
        sectionSubjectId,
        topic: aiTopic,
        numQuestions: aiNumQuestions,
        types: aiTypes
      })
      setQuestions(res.data.questions.map(q => ({
        ...q,
        id: q.id || `q${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        options: q.options || (q.type === 'multiple-choice' ? ['', '', '', ''] : undefined)
      })))
      setShowAIGenerator(false)
      setAiTopic('')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al generar preguntas')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSave = async () => {
    if (!titulo.trim()) { setError('Título requerido'); return }
    if (questions.length === 0) { setError('Agrega al menos una pregunta'); return }
    setSaving(true)
    setError('')
    try {
      await api.post('/quizzes', {
        sectionSubjectId,
        titulo,
        descripcion,
        questions,
        maxAttempts,
        timeLimit: timeLimit ? parseInt(timeLimit) : null
      })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar quiz')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Nuevo Quiz</h3>
        <button onClick={onClose} className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">Cancelar</button>
      </div>

      <input
        type="text"
        value={titulo}
        onChange={e => setTitulo(e.target.value)}
        placeholder="Título del quiz"
        className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <textarea
        value={descripcion}
        onChange={e => setDescripcion(e.target.value)}
        placeholder="Descripción (opcional)"
        rows={2}
        className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Intentos máximos</label>
          <input
            type="number"
            min={1}
            max={99}
            value={maxAttempts}
            onChange={e => setMaxAttempts(parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Tiempo límite (minutos, opcional)</label>
          <input
            type="number"
            min={0}
            value={timeLimit}
            onChange={e => setTimeLimit(e.target.value)}
            placeholder="Sin límite"
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1" />
        <button
          onClick={() => setShowAIGenerator(!showAIGenerator)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
        >
          <FiCpu size={14} />
          Generar con IA
        </button>
      </div>

      {showAIGenerator && (
        <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10 space-y-3">
          <textarea
            value={aiTopic}
            onChange={e => setAiTopic(e.target.value)}
            placeholder="Describe el tema a evaluar (ej: 'Estructuras de control en JavaScript: if, else, switch, for, while')"
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Cantidad de preguntas</label>
              <input
                type="number"
                min={1}
                max={20}
                value={aiNumQuestions}
                onChange={e => setAiNumQuestions(parseInt(e.target.value) || 5)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Tipos de pregunta</label>
              <div className="space-y-1">
                {QUESTION_TYPES.map(t => (
                  <label key={t.value} className="flex items-center gap-1.5 text-xs text-[var(--color-text-primary)]">
                    <input
                      type="checkbox"
                      checked={aiTypes.includes(t.value)}
                      onChange={e => setAiTypes(e.target.checked ? [...aiTypes, t.value] : aiTypes.filter(v => v !== t.value))}
                      className="rounded border-[var(--color-border-default)]"
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={handleGenerateWithAI}
            disabled={!aiTopic.trim() || aiLoading || aiTypes.length === 0}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <FiCpu size={16} />
            {aiLoading ? 'Generando...' : 'Generar preguntas'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {questions.map((q, i) => {
          const tc = TYPE_COLORS[q.type] || TYPE_COLORS['multiple-choice']
          return (
            <div key={q.id} className={`p-4 rounded-xl border ${tc.border} ${tc.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tc.text} ${tc.bg}`}>
                    {QUESTION_TYPES.find(t => t.value === q.type)?.label || q.type}
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">Pregunta {i + 1}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveQuestion(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] disabled:opacity-30"><FiArrowUp size={14} /></button>
                  <button onClick={() => moveQuestion(i, 1)} disabled={i === questions.length - 1} className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] disabled:opacity-30"><FiArrowDown size={14} /></button>
                  <button onClick={() => removeQuestion(q.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"><FiTrash2 size={14} /></button>
                </div>
              </div>

              <div className="space-y-2">
                <select
                  value={q.type}
                  onChange={e => updateQuestion(q.id, 'type', e.target.value)}
                  className="w-full px-2 py-1 text-xs rounded border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>

                <textarea
                  value={q.question}
                  onChange={e => updateQuestion(q.id, 'question', e.target.value)}
                  placeholder="Escribe la pregunta..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />

                {q.type === 'multiple-choice' && (
                  <div className="space-y-1.5">
                    {[0, 1, 2, 3].map(idx => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${q.id}`}
                          checked={q.correctAnswer === q.options?.[idx]}
                          onChange={() => updateQuestion(q.id, 'correctAnswer', q.options?.[idx] || '')}
                          className="text-blue-600"
                        />
                        <input
                          type="text"
                          value={q.options?.[idx] || ''}
                          onChange={e => updateOption(q.id, idx, e.target.value)}
                          placeholder={`Opción ${idx + 1}`}
                          className="flex-1 px-2 py-1 text-sm rounded border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                    <p className="text-[10px] text-[var(--color-text-secondary)] mt-1">Selecciona el radio de la opción correcta</p>
                  </div>
                )}

                {q.type === 'true-false' && (
                  <div className="flex gap-2">
                    {['true', 'false'].map(val => (
                      <label key={val} className="flex items-center gap-1.5 text-sm text-[var(--color-text-primary)]">
                        <input
                          type="radio"
                          name={`tf-${q.id}`}
                          checked={q.correctAnswer === val}
                          onChange={() => updateQuestion(q.id, 'correctAnswer', val)}
                          className="text-blue-600"
                        />
                        {val === 'true' ? 'Verdadero' : 'Falso'}
                      </label>
                    ))}
                  </div>
                )}

                {(q.type === 'short-answer' || q.type === 'calculation') && (
                  <input
                    type="text"
                    value={q.correctAnswer || ''}
                    onChange={e => updateQuestion(q.id, 'correctAnswer', e.target.value)}
                    placeholder="Respuesta correcta"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}

                {q.type === 'essay' && (
                  <textarea
                    value={q.modelAnswer || ''}
                    onChange={e => updateQuestion(q.id, 'modelAnswer', e.target.value)}
                    placeholder="Respuesta modelo para que la IA evalúe..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => addQuestion('multiple-choice')}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-dashed border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-solid transition-colors"
        >
          <FiPlus size={14} /> Opción múltiple
        </button>
        <button
          onClick={() => addQuestion('true-false')}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-dashed border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-solid transition-colors"
        >
          <FiPlus size={14} /> V/F
        </button>
        <button
          onClick={() => addQuestion('short-answer')}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-dashed border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-solid transition-colors"
        >
          <FiPlus size={14} /> Corta
        </button>
        <button
          onClick={() => addQuestion('essay')}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-dashed border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-solid transition-colors"
        >
          <FiPlus size={14} /> Ensayo
        </button>
        <button
          onClick={() => addQuestion('calculation')}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-dashed border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-solid transition-colors"
        >
          <FiPlus size={14} /> Cálculo
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving || !titulo.trim() || questions.length === 0}
        className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <FiSave size={16} />
        {saving ? 'Guardando...' : 'Guardar Quiz'}
      </button>
    </div>
  )
}
