import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import QuizResults from './QuizResults'
import { FiSend, FiClock } from 'react-icons/fi'

const TYPE_COLORS = {
  'multiple-choice': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  'true-false': { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800' },
  'short-answer': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  'essay': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  'calculation': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' }
}

const TYPE_LABELS = {
  'multiple-choice': 'Opción múltiple',
  'true-false': 'Verdadero/Falso',
  'short-answer': 'Respuesta corta',
  'essay': 'Ensayo/Análisis',
  'calculation': 'Cálculo'
}

export default function QuizTaker({ quiz, onBack }) {
  const [attempt, setAttempt] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    startQuiz()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const startQuiz = async () => {
    try {
      const res = await api.post(`/quizzes/${quiz.id}/start`)
      setAttempt(res.data)
      if (res.data.timeLimit) {
        setTimeLeft(res.data.timeLimit * 60)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar quiz')
    }
  }

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [timeLeft])

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleSubmit = async () => {
    if (!attempt) return
    setSubmitting(true)
    setError('')
    try {
      const answersArray = quiz.questions.map(q => ({
        questionId: q.id,
        answer: answers[q.id] || ''
      }))
      const res = await api.post(`/quizzes/attempts/${attempt.id}/submit`, { answers: answersArray })
      setResult(res.data)
      if (timerRef.current) clearInterval(timerRef.current)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar respuestas')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return <QuizResults result={result} questions={quiz.questions} onBack={onBack} />
  }

  if (error && !attempt) {
    return (
      <div className="flex-1 p-6">
        <p className="text-red-500 text-sm">{error}</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Volver</button>
      </div>
    )
  }

  if (!attempt) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="animate-pulse text-[var(--color-text-secondary)]">Preparando quiz...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {timeLeft !== null && (
        <div className={`px-6 py-2 border-b flex items-center gap-2 text-sm font-medium ${
          timeLeft < 60 ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' :
          timeLeft < 300 ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' :
          'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-border-default)]'
        }`}>
          <FiClock size={16} />
          <span>Tiempo restante: {formatTime(timeLeft)}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-6">{quiz.titulo}</h2>
        {quiz.descripcion && <p className="text-sm text-[var(--color-text-secondary)] mb-6">{quiz.descripcion}</p>}

        <div className="space-y-6">
          {quiz.questions.map((q, i) => {
            const tc = TYPE_COLORS[q.type] || TYPE_COLORS['multiple-choice']
            return (
              <div key={q.id} className={`p-4 rounded-xl border ${tc.border} ${tc.bg}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium text-[var(--color-text-secondary)]">Pregunta {i + 1}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${tc.text} ${tc.bg}`}>
                    {TYPE_LABELS[q.type] || q.type}
                  </span>
                </div>
                <p className="text-sm font-medium text-[var(--color-text-primary)] mb-3">{q.question}</p>

                {q.type === 'multiple-choice' && q.options && (
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <label key={oi} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        answers[q.id] === opt
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-[var(--color-border-default)] bg-[var(--color-bg)] hover:border-[var(--color-text-secondary)]'
                      }`}>
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                          className="text-blue-600"
                        />
                        <span className="text-sm text-[var(--color-text-primary)]">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.type === 'true-false' && (
                  <div className="flex gap-3">
                    {['true', 'false'].map(val => (
                      <label key={val} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        answers[q.id] === val
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                          : 'border-[var(--color-border-default)] bg-[var(--color-bg)] hover:border-[var(--color-text-secondary)]'
                      }`}>
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={val}
                          checked={answers[q.id] === val}
                          onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                          className="text-teal-600"
                        />
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          {val === 'true' ? 'Verdadero' : 'Falso'}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {(q.type === 'short-answer' || q.type === 'calculation') && (
                  <input
                    type="text"
                    value={answers[q.id] || ''}
                    onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder={q.type === 'calculation' ? 'Escribe tu respuesta numérica...' : 'Escribe tu respuesta...'}
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}

                {q.type === 'essay' && (
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder="Escribe tu respuesta detallada..."
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="px-6 py-4 border-t border-[var(--color-border-default)] bg-[var(--color-bg)]">
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <FiSend size={16} />
          {submitting ? 'Enviando...' : 'Enviar respuestas'}
        </button>
      </div>
    </div>
  )
}
