import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function getGrades(req, res) {
  try {
    const { sectionSubjectId } = req.params
    const userId = req.query.userId || req.user.id

    const isProfesor = req.user.role === 'PROFESOR'
    const sectionSubject = await prisma.sectionSubject.findUnique({ where: { id: sectionSubjectId } })
    if (!sectionSubject) return res.status(404).json({ error: 'Materia no encontrada' })

    if (!isProfesor && userId !== req.user.id) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    const quizzes = await prisma.quiz.findMany({
      where: { sectionSubjectId },
      select: {
        id: true, titulo: true, createdAt: true,
        attempts: {
          where: { userId, submittedAt: { not: null } },
          select: { score: true }
        }
      }
    })

    const assignments = await prisma.assignment.findMany({
      where: { sectionSubjectId },
      select: {
        id: true, titulo: true, createdAt: true,
        submissions: {
          where: { userId },
          select: { nota: true, submittedAt: true, feedback: true }
        }
      }
    })

    const quizGrades = quizzes
      .filter(q => q.attempts.length > 0)
      .map(q => ({
        id: q.id,
        titulo: q.titulo,
        tipo: 'QUIZ',
        nota: Math.max(...q.attempts.map(a => a.score)),
        fecha: q.createdAt
      }))

    const assignmentGrades = assignments
      .filter(a => a.submissions.length > 0)
      .map(a => ({
        id: a.id,
        titulo: a.titulo,
        tipo: 'TAREA',
        nota: a.submissions[0].nota,
        feedback: a.submissions[0].feedback,
        fecha: a.submissions[0].submittedAt
      }))

    const allGrades = [...quizGrades, ...assignmentGrades]
    const gradedItems = allGrades.filter(g => g.nota !== null && g.nota !== undefined)
    const promedio = gradedItems.length > 0
      ? Math.round(gradedItems.reduce((sum, g) => sum + g.nota, 0) / gradedItems.length)
      : null

    res.json({ grades: allGrades, promedio, totalItems: allGrades.length, gradedItems: gradedItems.length })
  } catch (error) {
    console.error('Get grades error:', error)
    res.status(500).json({ error: 'Error al obtener notas' })
  }
}

export async function getAllStudentGrades(req, res) {
  try {
    const { sectionSubjectId } = req.params

    const sectionSubject = await prisma.sectionSubject.findUnique({ where: { id: sectionSubjectId } })
    if (!sectionSubject) return res.status(404).json({ error: 'Materia no encontrada' })
    if (sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede ver todas las notas' })
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { sectionSubjectId },
      include: { user: { select: { id: true, nombre: true, cedula: true, avatar: true } } }
    })

    const quizzes = await prisma.quiz.findMany({
      where: { sectionSubjectId },
      select: { id: true, titulo: true }
    })

    const assignments = await prisma.assignment.findMany({
      where: { sectionSubjectId },
      select: { id: true, titulo: true }
    })

    const students = []

    for (const enrollment of enrollments) {
      const userQuizAttempts = await prisma.quizAttempt.findMany({
        where: { userId: enrollment.user.id, quiz: { sectionSubjectId }, submittedAt: { not: null } },
        select: { quizId: true, score: true }
      })

      const userSubmissions = await prisma.assignmentSubmission.findMany({
        where: { userId: enrollment.user.id, assignment: { sectionSubjectId } },
        select: { assignmentId: true, nota: true }
      })

      const quizScores = quizzes.map(q => {
        const attempts = userQuizAttempts.filter(a => a.quizId === q.id)
        return attempts.length > 0 ? Math.max(...attempts.map(a => a.score)) : null
      })

      const assignmentScores = assignments.map(a => {
        const sub = userSubmissions.find(s => s.assignmentId === a.id)
        return sub ? sub.nota : null
      })

      const allScores = [...quizScores, ...assignmentScores].filter(s => s !== null)
      const promedio = allScores.length > 0
        ? Math.round(allScores.reduce((sum, s) => sum + s, 0) / allScores.length)
        : null

      students.push({
        user: enrollment.user,
        quizzes: quizScores,
        assignments: assignmentScores,
        promedio
      })
    }

    res.json({ quizzes, assignments, students })
  } catch (error) {
    console.error('Get all grades error:', error)
    res.status(500).json({ error: 'Error al obtener notas' })
  }
}
