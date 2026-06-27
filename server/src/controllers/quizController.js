import { PrismaClient } from '@prisma/client'
import Groq from 'groq-sdk'
import config from '../config.js'

const prisma = new PrismaClient()
const groq = new Groq({ apiKey: config.groqApiKey })

const GRADING_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-20b']

export async function createQuiz(req, res) {
  try {
    const { sectionSubjectId, titulo, descripcion, questions, maxAttempts, timeLimit } = req.body

    if (!sectionSubjectId || !titulo || !questions) {
      return res.status(400).json({ error: 'Título, materia y preguntas requeridos' })
    }

    const sectionSubject = await prisma.sectionSubject.findUnique({
      where: { id: sectionSubjectId }
    })
    if (!sectionSubject || sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede crear quizzes' })
    }

    const quiz = await prisma.quiz.create({
      data: {
        titulo,
        descripcion,
        sectionSubjectId,
        questions: JSON.stringify(questions),
        maxAttempts: maxAttempts || 1,
        timeLimit: timeLimit || null,
        createdBy: req.user.id
      }
    })

    res.status(201).json(quiz)
  } catch (error) {
    console.error('Create quiz error:', error)
    res.status(500).json({ error: 'Error al crear quiz' })
  }
}

export async function getQuizzes(req, res) {
  try {
    const { sectionSubjectId } = req.params

    const quizzes = await prisma.quiz.findMany({
      where: { sectionSubjectId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { attempts: true } },
        attempts: {
          where: { userId: req.user.id, submittedAt: { not: null } },
          select: { score: true, id: true, submittedAt: true }
        }
      }
    })

    const mapped = quizzes.map(q => {
      const isProfessor = q.createdBy === req.user.id
      const rawQuestions = JSON.parse(q.questions)
      const safeQuestions = isProfessor
        ? rawQuestions
        : rawQuestions.map(q => {
            const { correctAnswer, modelAnswer, ...rest } = q
            return rest
          })

      return {
        id: q.id,
        titulo: q.titulo,
        descripcion: q.descripcion,
        maxAttempts: q.maxAttempts,
        timeLimit: q.timeLimit,
        questions: safeQuestions,
        createdAt: q.createdAt,
        totalAttempts: q._count.attempts,
        myAttempts: q.attempts.length,
        myAttemptsDetail: q.attempts,
        myBestScore: q.attempts.length > 0 ? Math.max(...q.attempts.map(a => a.score || 0)) : null
      }
    })

    res.json(mapped)
  } catch (error) {
    console.error('Get quizzes error:', error)
    res.status(500).json({ error: 'Error al obtener quizzes' })
  }
}

export async function getQuizDetail(req, res) {
  try {
    const { id } = req.params

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { sectionSubject: { select: { profesorId: true } } }
    })
    if (!quiz) return res.status(404).json({ error: 'Quiz no encontrado' })

    const isProfessor = quiz.sectionSubject.profesorId === req.user.id
    const questions = JSON.parse(quiz.questions)

    const attemptsCount = await prisma.quizAttempt.count({
      where: { quizId: id, userId: req.user.id, submittedAt: { not: null } }
    })

    const hasAttemptsLeft = attemptsCount < quiz.maxAttempts

    const safeQuestions = isProfessor || !hasAttemptsLeft
      ? questions
      : questions.map(q => {
          const { correctAnswer, modelAnswer, ...rest } = q
          return rest
        })

    res.json({
      id: quiz.id,
      titulo: quiz.titulo,
      descripcion: quiz.descripcion,
      maxAttempts: quiz.maxAttempts,
      timeLimit: quiz.timeLimit,
      questions: safeQuestions,
      myAttempts: attemptsCount,
      createdAt: quiz.createdAt
    })
  } catch (error) {
    console.error('Get quiz detail error:', error)
    res.status(500).json({ error: 'Error al obtener quiz' })
  }
}

export async function startAttempt(req, res) {
  try {
    const { id } = req.params

    const quiz = await prisma.quiz.findUnique({ where: { id } })
    if (!quiz) return res.status(404).json({ error: 'Quiz no encontrado' })

    const attemptsCount = await prisma.quizAttempt.count({
      where: { quizId: id, userId: req.user.id, submittedAt: { not: null } }
    })

    if (attemptsCount >= quiz.maxAttempts) {
      return res.status(403).json({ error: `Has alcanzado el máximo de ${quiz.maxAttempts} intentos` })
    }

    const attempt = await prisma.quizAttempt.create({
      data: { quizId: id, userId: req.user.id, answers: '[]' }
    })

    res.json({
      id: attempt.id,
      startedAt: attempt.startedAt,
      timeLimit: quiz.timeLimit
    })
  } catch (error) {
    console.error('Start attempt error:', error)
    res.status(500).json({ error: 'Error al iniciar intento' })
  }
}

export async function submitAttempt(req, res) {
  try {
    const { id } = req.params
    const { answers } = req.body

    if (!answers) return res.status(400).json({ error: 'Respuestas requeridas' })

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id },
      include: { quiz: true }
    })
    if (!attempt) return res.status(404).json({ error: 'Intento no encontrado' })
    if (attempt.userId !== req.user.id) return res.status(403).json({ error: 'No es tu intento' })
    if (attempt.submittedAt) return res.status(400).json({ error: 'Intento ya enviado' })

    if (attempt.quiz.timeLimit) {
      const elapsed = (Date.now() - new Date(attempt.startedAt).getTime()) / 60000
      if (elapsed > attempt.quiz.timeLimit + 1) {
        return res.status(400).json({ error: 'Tiempo excedido' })
      }
    }

    const questions = JSON.parse(attempt.quiz.questions)

    let results
    try {
      const gradingPrompt = `Eres un calificador académico estricto y justo.
Evalúa cada respuesta del estudiante contra la respuesta correcta/modelo.
Devuelve SOLO un JSON array sin markdown ni explicaciones adicionales.

Formato requerido:
[{ "questionId": "q1", "correct": true, "score": 100, "feedback": "breve explicación" }]

Reglas según tipo:
- multiple-choice / true-false: coincidencia exacta con la respuesta correcta
- short-answer: admite variaciones ortográficas menores, sinónimos, pero el concepto debe ser correcto
- essay: evalúa contra modelAnswer, sé exigente pero valora comprensión del concepto
- calculation: estrictamente correcto, permite diferentes representaciones numéricas (3.14 ≈ 3,14)

PREGUNTAS Y RESPUESTAS:
${JSON.stringify(questions.map(q => ({
  id: q.id,
  type: q.type,
  question: q.question,
  correctAnswer: q.correctAnswer || q.modelAnswer || null,
  modelAnswer: q.modelAnswer || null,
  options: q.options || null
})))}

RESPUESTAS DEL ESTUDIANTE:
${JSON.stringify(answers)}`

      for (const model of GRADING_MODELS) {
        try {
          const completion = await groq.chat.completions.create({
            messages: [
              { role: 'system', content: 'Eres un calificador académico. Devuelve solo JSON válido.' },
              { role: 'user', content: gradingPrompt }
            ],
            model,
            temperature: 0.3,
            max_tokens: 2048
          })
          const text = completion.choices[0]?.message?.content
          if (text) {
            const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
            const parsed = JSON.parse(cleaned)
            results = Array.isArray(parsed) ? parsed : parsed.results || parsed.grades || []
            break
          }
        } catch (e) {
          console.error(`Grading error with model ${model}:`, e.message)
        }
      }
    } catch (e) {
      console.error('AI grading failed:', e)
    }

    if (!results) {
      results = questions.map(q => {
        const studentAnswer = answers.find(a => a.questionId === q.id)?.answer || ''
        const normalizedStudent = String(studentAnswer).trim().toLowerCase().replace(/\s+/g, ' ')
        const normalizedCorrect = String(q.correctAnswer || '').trim().toLowerCase().replace(/\s+/g, ' ')
        let correct = false
        let score = 0
        let feedback = 'Incorrecto'

        if (q.type === 'multiple-choice' || q.type === 'true-false') {
          correct = normalizedStudent === normalizedCorrect
          score = correct ? 100 : 0
          feedback = correct ? 'Correcto' : 'Incorrecto'
        } else if (q.type === 'short-answer') {
          correct = normalizedStudent === normalizedCorrect
          score = correct ? 100 : 0
          feedback = correct ? 'Correcto' : 'La respuesta no coincide exactamente'
        } else if (q.type === 'calculation') {
          const numStudent = parseFloat(studentAnswer.replace(',', '.'))
          const numCorrect = parseFloat((q.correctAnswer || '').replace(',', '.'))
          if (!isNaN(numStudent) && !isNaN(numCorrect)) {
            correct = Math.abs(numStudent - numCorrect) < 0.01
            score = correct ? 100 : 0
            feedback = correct ? 'Correcto' : `Esperado: ${q.correctAnswer}`
          } else {
            correct = normalizedStudent === normalizedCorrect
            score = correct ? 100 : 0
            feedback = correct ? 'Correcto' : `Esperado: ${q.correctAnswer}`
          }
        } else if (q.type === 'essay') {
          correct = false
          score = 0
          feedback = 'Requiere revisión del profesor'
        }

        return { questionId: q.id, correct, score, feedback }
      })
    }

    const totalScore = results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length

    const updated = await prisma.quizAttempt.update({
      where: { id },
      data: {
        answers: JSON.stringify(answers),
        results: JSON.stringify(results),
        score: Math.round(totalScore),
        submittedAt: new Date()
      },
      include: {
        quiz: { select: { timeLimit: true } }
      }
    })

    res.json({
      score: updated.score,
      results,
      answers: JSON.parse(updated.answers),
      attemptId: updated.id
    })
  } catch (error) {
    console.error('Submit attempt error:', error)
    res.status(500).json({ error: 'Error al enviar respuestas' })
  }
}

export async function getAttempt(req, res) {
  try {
    const { id } = req.params

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id },
      include: {
        quiz: {
          select: { id: true, titulo: true, questions: true, sectionSubjectId: true }
        }
      }
    })
    if (!attempt) return res.status(404).json({ error: 'Intento no encontrado' })
    if (attempt.userId !== req.user.id) {
      const quiz = await prisma.quiz.findUnique({
        where: { id: attempt.quizId },
        include: { sectionSubject: { select: { profesorId: true } } }
      })
      if (quiz?.sectionSubject.profesorId !== req.user.id) {
        return res.status(403).json({ error: 'No autorizado' })
      }
    }

    res.json({
      id: attempt.id,
      quizId: attempt.quizId,
      quizTitle: attempt.quiz.titulo,
      score: attempt.score,
      answers: JSON.parse(attempt.answers),
      results: attempt.results ? JSON.parse(attempt.results) : null,
      questions: JSON.parse(attempt.quiz.questions),
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt
    })
  } catch (error) {
    console.error('Get attempt error:', error)
    res.status(500).json({ error: 'Error al obtener intento' })
  }
}

export async function getQuizAttempts(req, res) {
  try {
    const { id } = req.params

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { sectionSubject: { select: { profesorId: true } } }
    })
    if (!quiz) return res.status(404).json({ error: 'Quiz no encontrado' })
    if (quiz.sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede ver todos los intentos' })
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId: id, submittedAt: { not: null } },
      include: {
        user: { select: { id: true, nombre: true, cedula: true } }
      },
      orderBy: { submittedAt: 'desc' }
    })

    res.json(attempts.map(a => ({
      id: a.id,
      userName: a.user.nombre,
      userId: a.user.id,
      cedula: a.user.cedula,
      score: a.score,
      submittedAt: a.submittedAt,
      answers: JSON.parse(a.answers || '[]'),
      results: a.results ? JSON.parse(a.results) : null
    })))
  } catch (error) {
    console.error('Get quiz attempts error:', error)
    res.status(500).json({ error: 'Error al obtener intentos' })
  }
}

export async function resetAttempt(req, res) {
  try {
    const { id, userId } = req.params

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { sectionSubject: { select: { profesorId: true } } }
    })
    if (!quiz) return res.status(404).json({ error: 'Quiz no encontrado' })
    if (quiz.sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede resetear intentos' })
    }

    const lastAttempt = await prisma.quizAttempt.findFirst({
      where: { quizId: id, userId, submittedAt: { not: null } },
      orderBy: { submittedAt: 'desc' }
    })

    if (!lastAttempt) return res.status(404).json({ error: 'No hay intentos para resetear' })

    await prisma.quizAttempt.delete({ where: { id: lastAttempt.id } })

    res.json({ message: 'Intento reseteado. El estudiante puede volver a intentarlo.' })
  } catch (error) {
    console.error('Reset attempt error:', error)
    res.status(500).json({ error: 'Error al resetear intento' })
  }
}
