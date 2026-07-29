
import prisma from '../lib/prisma.js'

export async function getStats(req, res) {
  try {
    const { sectionSubjectId } = req.params

    const ss = await prisma.sectionSubject.findUnique({
      where: { id: sectionSubjectId },
      include: { subject: true, section: true }
    })
    if (!ss) return res.status(404).json({ error: 'Materia no encontrada' })
    if (ss.profesorId !== req.user.id) return res.status(403).json({ error: 'No autorizado' })

    const [totalStudents, assignments, quizzes] = await Promise.all([
      prisma.enrollment.count({ where: { sectionSubjectId } }),
      prisma.assignment.findMany({
        where: { sectionSubjectId },
        include: { _count: { select: { submissions: true } } }
      }),
      prisma.quiz.findMany({
        where: { sectionSubjectId },
        include: { _count: { select: { attempts: true } } }
      })
    ])

    const quizCount = quizzes.length
    const assignmentCount = assignments.length
    const totalSubmissions = assignments.reduce((sum, a) => sum + a._count.submissions, 0)
    const totalAttempts = quizzes.reduce((sum, q) => sum + q._count.attempts, 0)

    res.json({
      totalStudents,
      quizCount,
      assignmentCount,
      totalSubmissions,
      totalAttempts,
      subjectName: `${ss.subject.nombre} - ${ss.section.codigo}`
    })
  } catch (error) {
    console.error('Professor panel error:', error)
    res.status(500).json({ error: 'Error al cargar panel' })
  }
}
