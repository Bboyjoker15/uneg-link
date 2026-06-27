import { FiCheck, FiX, FiArrowLeft } from 'react-icons/fi'

const TYPE_LABELS = {
  'multiple-choice': 'Opción múltiple',
  'true-false': 'Verdadero/Falso',
  'short-answer': 'Respuesta corta',
  'essay': 'Ensayo/Análisis',
  'calculation': 'Cálculo'
}

export default function QuizResults({ result, questions, onBack, quizTitle }) {
  const score = result.score
  const results = result.results || []

  const getScoreColor = (s) => {
    if (s >= 80) return 'text-green-600 dark:text-green-400'
    if (s >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBg = (s) => {
    if (s >= 80) return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    if (s >= 60) return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
    return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-4">
        <FiArrowLeft size={16} />
        Volver a quizzes
      </button>

      <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">{quizTitle || 'Resultados'}</h2>

      <div className={`p-6 rounded-xl border ${getScoreBg(score)} text-center mb-6`}>
        <p className={`text-4xl font-bold ${getScoreColor(score)}`}>{Math.round(score)}%</p>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          {score >= 80 ? 'Excelente trabajo' : score >= 60 ? 'Buen trabajo, puedes mejorar' : 'Necesitas repasar más'}
        </p>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => {
          const r = results.find(r => r.questionId === q.id) || {}
          const isCorrect = r.correct
          return (
            <div key={q.id} className="p-4 rounded-xl border border-[var(--color-border-default)]">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isCorrect ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                  {isCorrect
                    ? <FiCheck size={14} className="text-green-600 dark:text-green-400" />
                    : <FiX size={14} className="text-red-600 dark:text-red-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-[var(--color-text-secondary)]">Pregunta {i + 1}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
                      {TYPE_LABELS[q.type] || q.type}
                    </span>
                    {r.score !== undefined && (
                      <span className={`text-xs font-medium ml-auto ${getScoreColor(r.score)}`}>{Math.round(r.score)}%</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)] mb-2">{q.question}</p>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] text-[var(--color-text-secondary)] mb-0.5">Tu respuesta:</p>
                      <p className={`px-2 py-1 rounded ${isCorrect ? 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400'}`}>
                        {(r.questionId ? result.answers?.find(a => String(a.questionId) === String(q.id))?.answer : null) || '(sin respuesta)'}
                      </p>
                    </div>
                    {!isCorrect && (q.correctAnswer || q.modelAnswer) && (
                      <div>
                        <p className="text-[10px] text-[var(--color-text-secondary)] mb-0.5">Respuesta correcta:</p>
                        <p className="px-2 py-1 rounded bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400">
                          {q.correctAnswer || q.modelAnswer}
                        </p>
                      </div>
                    )}
                  </div>

                  {r.feedback && (
                    <p className="text-xs text-[var(--color-text-secondary)] mt-2 italic">{r.feedback}</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button onClick={onBack} className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
        Volver a quizzes
      </button>
    </div>
  )
}
