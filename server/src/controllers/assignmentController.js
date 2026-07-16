import { PrismaClient } from '@prisma/client'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = path.join(__dirname, '../../uploads/assignments')
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const prisma = new PrismaClient()

export async function getAssignments(req, res) {
  try {
    const { sectionSubjectId } = req.params
    const assignments = await prisma.assignment.findMany({
      where: { sectionSubjectId },
      include: {
        submissions: {
          where: { userId: req.user.id },
          select: { id: true, nota: true, submittedAt: true, feedback: true }
        },
        _count: { select: { submissions: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(assignments)
  } catch (error) {
    console.error('Get assignments error:', error)
    res.status(500).json({ error: 'Error al obtener tareas' })
  }
}

export async function createAssignment(req, res) {
  try {
    const { sectionSubjectId } = req.params
    const { titulo, descripcion, fechaLimite } = req.body

    const sectionSubject = await prisma.sectionSubject.findUnique({ where: { id: sectionSubjectId } })
    if (!sectionSubject) return res.status(404).json({ error: 'Materia no encontrada' })
    if (sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede crear tareas' })
    }

    let archivoUrl = null
    if (req.file) {
      archivoUrl = `/uploads/assignments/${req.file.filename}`
    }

    const assignment = await prisma.assignment.create({
      data: { sectionSubjectId, titulo, descripcion, fechaLimite: fechaLimite ? new Date(fechaLimite) : null, archivoUrl }
    })

    const enrollments = await prisma.enrollment.findMany({
      where: { sectionSubjectId },
      select: { userId: true }
    })

    for (const enrollment of enrollments) {
      await prisma.notification.create({
        data: {
          userId: enrollment.userId,
          type: 'TAREA',
          title: `Nueva tarea: ${titulo}`,
          body: descripcion?.substring(0, 100) || null,
          link: `/assignments/${assignment.id}`
        }
      })
    }

    const io = req.app.get('io')
    const userSockets = req.app.get('userSockets')
    for (const enrollment of enrollments) {
      const sockets = userSockets?.get(enrollment.userId)
      if (sockets) {
        for (const socketId of sockets) {
          io.to(socketId).emit('new-notification', {
            type: 'TAREA',
            title: `Nueva tarea: ${titulo}`,
            body: descripcion?.substring(0, 100) || null,
            link: `/assignments/${assignment.id}`
          })
        }
      }
    }

    res.status(201).json(assignment)
  } catch (error) {
    console.error('Create assignment error:', error)
    res.status(500).json({ error: 'Error al crear tarea' })
  }
}

export async function updateAssignment(req, res) {
  try {
    const { id } = req.params
    const { titulo, descripcion, fechaLimite } = req.body

    const assignment = await prisma.assignment.findUnique({ where: { id } })
    if (!assignment) return res.status(404).json({ error: 'Tarea no encontrada' })

    const sectionSubject = await prisma.sectionSubject.findUnique({ where: { id: assignment.sectionSubjectId } })
    if (sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede editar tareas' })
    }

    const data = {}
    if (titulo !== undefined) data.titulo = titulo
    if (descripcion !== undefined) data.descripcion = descripcion
    if (fechaLimite !== undefined) data.fechaLimite = fechaLimite ? new Date(fechaLimite) : null
    if (req.file) data.archivoUrl = `/uploads/assignments/${req.file.filename}`

    const updated = await prisma.assignment.update({ where: { id }, data })
    res.json(updated)
  } catch (error) {
    console.error('Update assignment error:', error)
    res.status(500).json({ error: 'Error al actualizar tarea' })
  }
}

export async function deleteAssignment(req, res) {
  try {
    const { id } = req.params
    const assignment = await prisma.assignment.findUnique({ where: { id } })
    if (!assignment) return res.status(404).json({ error: 'Tarea no encontrada' })

    const sectionSubject = await prisma.sectionSubject.findUnique({ where: { id: assignment.sectionSubjectId } })
    if (sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede eliminar tareas' })
    }

    await prisma.assignment.delete({ where: { id } })
    res.json({ message: 'Tarea eliminada' })
  } catch (error) {
    console.error('Delete assignment error:', error)
    res.status(500).json({ error: 'Error al eliminar tarea' })
  }
}

export async function submitAssignment(req, res) {
  try {
    const { id } = req.params
    const { comentario } = req.body

    if (!req.file) return res.status(400).json({ error: 'Archivo requerido' })

    const assignment = await prisma.assignment.findUnique({ where: { id } })
    if (!assignment) return res.status(404).json({ error: 'Tarea no encontrada' })

    if (assignment.fechaLimite && new Date(assignment.fechaLimite) < new Date()) {
      return res.status(400).json({ error: 'La fecha límite ha pasado' })
    }

    const existing = await prisma.assignmentSubmission.findUnique({
      where: { assignmentId_userId: { assignmentId: id, userId: req.user.id } }
    })

    const archivoUrl = `/uploads/assignments/${req.file.filename}`

    let submission
    if (existing) {
      submission = await prisma.assignmentSubmission.update({
        where: { id: existing.id },
        data: { archivoUrl, comentario, submittedAt: new Date() }
      })
    } else {
      submission = await prisma.assignmentSubmission.create({
        data: { assignmentId: id, userId: req.user.id, archivoUrl, comentario }
      })
    }

    res.json(submission)
  } catch (error) {
    console.error('Submit assignment error:', error)
    res.status(500).json({ error: 'Error al entregar tarea' })
  }
}

export async function getSubmissions(req, res) {
  try {
    const { id } = req.params
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: { sectionSubject: { select: { profesorId: true } } }
    })
    if (!assignment) return res.status(404).json({ error: 'Tarea no encontrada' })
    if (assignment.sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede ver entregas' })
    }

    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId: id },
      include: { user: { select: { id: true, nombre: true, cedula: true, avatar: true } } },
      orderBy: { submittedAt: 'desc' }
    })
    res.json(submissions)
  } catch (error) {
    console.error('Get submissions error:', error)
    res.status(500).json({ error: 'Error al obtener entregas' })
  }
}

export async function gradeSubmission(req, res) {
  try {
    const { id, userId } = req.params
    const { nota, feedback } = req.body

    if (nota !== undefined && (typeof nota !== 'number' || nota < 0 || nota > 100)) {
      return res.status(400).json({ error: 'La nota debe ser un número entre 0 y 100' })
    }

    const submission = await prisma.assignmentSubmission.findUnique({
      where: { assignmentId_userId: { assignmentId: id, userId } },
      include: { assignment: { include: { sectionSubject: { select: { profesorId: true } } } } }
    })
    if (!submission) return res.status(404).json({ error: 'Entrega no encontrada' })
    if (submission.assignment.sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede calificar' })
    }

    const updated = await prisma.assignmentSubmission.update({
      where: { id: submission.id },
      data: { nota, feedback, gradedAt: new Date() }
    })
    res.json(updated)
  } catch (error) {
    console.error('Grade submission error:', error)
    res.status(500).json({ error: 'Error al calificar' })
  }
}

export async function getAssignmentSection(req, res) {
  try {
    const { id } = req.params
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      select: { sectionSubjectId: true }
    })
    if (!assignment) return res.status(404).json({ error: 'Tarea no encontrada' })
    res.json({ sectionSubjectId: assignment.sectionSubjectId })
  } catch (error) {
    console.error('Get assignment section error:', error)
    res.status(500).json({ error: 'Error al obtener materia' })
  }
}
