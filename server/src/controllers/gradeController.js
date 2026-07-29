
import prisma from '../lib/prisma.js'

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

export async function exportGrades(req, res) {
  try {
    const { sectionSubjectId } = req.params

    const sectionSubject = await prisma.sectionSubject.findUnique({
      where: { id: sectionSubjectId },
      include: { subject: true, section: true }
    })
    if (!sectionSubject) return res.status(404).json({ error: 'Materia no encontrada' })
    if (sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede exportar' })
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { sectionSubjectId },
      include: { user: { select: { id: true, nombre: true, cedula: true } } }
    })

    const quizzes = await prisma.quiz.findMany({
      where: { sectionSubjectId },
      select: { id: true, titulo: true }
    })

    const assignments = await prisma.assignment.findMany({
      where: { sectionSubjectId },
      select: { id: true, titulo: true }
    })

    const header = ['Cédula', 'Nombre']
    for (const q of quizzes) header.push(`Quiz: ${q.titulo}`)
    for (const a of assignments) header.push(`Tarea: ${a.titulo}`)
    header.push('Promedio')

    const rows = []

    for (const enrollment of enrollments) {
      const userQuizAttempts = await prisma.quizAttempt.findMany({
        where: { userId: enrollment.user.id, quiz: { sectionSubjectId }, submittedAt: { not: null } },
        select: { quizId: true, score: true }
      })

      const userSubmissions = await prisma.assignmentSubmission.findMany({
        where: { userId: enrollment.user.id, assignment: { sectionSubjectId } },
        select: { assignmentId: true, nota: true }
      })

      const row = [enrollment.user.cedula, enrollment.user.nombre]

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

      for (const s of quizScores) row.push(s !== null ? Math.round(s) : '')
      for (const s of assignmentScores) row.push(s !== null ? Math.round(s) : '')
      row.push(promedio !== null ? `${promedio}%` : '')

      rows.push(row)
    }

    const csvContent = [header.join(','), ...rows.map(r => r.map(c => `"${c ?? ''}"`).join(','))].join('\n')

    const subjectName = `${sectionSubject.subject.nombre}-${sectionSubject.section.codigo}`
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=notas-${subjectName}.csv`)
    res.send('\uFEFF' + csvContent)
  } catch (error) {
    console.error('Export grades error:', error)
    res.status(500).json({ error: 'Error al exportar' })
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
