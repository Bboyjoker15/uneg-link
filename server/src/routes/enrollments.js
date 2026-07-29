import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'

const router = Router()
import prisma from '../lib/prisma.js'

router.post('/', authenticate, async (req, res) => {
  try {
    const { sectionSubjectId } = req.body

    if (!sectionSubjectId) {
      return res.status(400).json({ error: 'Materia requerida' })
    }

    const existing = await prisma.enrollment.findUnique({
      where: { userId_sectionSubjectId: { userId: req.user.id, sectionSubjectId } }
    })
    if (existing) {
      return res.status(400).json({ error: 'Ya estás inscrito en esta materia' })
    }

    const enrollment = await prisma.enrollment.create({
      data: { userId: req.user.id, sectionSubjectId },
      include: {
        sectionSubject: {
          include: {
            subject: true,
            section: true
          }
        }
      }
    })

    res.status(201).json(enrollment)
  } catch (error) {
    console.error('Enroll error:', error)
    res.status(500).json({ error: 'Error al inscribir' })
  }
})

router.delete('/:sectionSubjectId', authenticate, async (req, res) => {
  try {
    const { sectionSubjectId } = req.params

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_sectionSubjectId: { userId: req.user.id, sectionSubjectId } }
    })
    if (!enrollment) {
      return res.status(404).json({ error: 'No estás inscrito en esta materia' })
    }

    await prisma.enrollment.delete({ where: { id: enrollment.id } })

    res.json({ message: 'Inscripción eliminada' })
  } catch (error) {
    console.error('Unenroll error:', error)
    res.status(500).json({ error: 'Error al desinscribir' })
  }
})

router.get('/:sectionSubjectId/members', authenticate, async (req, res) => {
  try {
    const { sectionSubjectId } = req.params

    const sectionSubject = await prisma.sectionSubject.findUnique({
      where: { id: sectionSubjectId },
      include: { profesor: { select: { id: true, nombre: true, avatar: true, role: true, carrera: true, semestre: true, bio: true } } }
    })
    if (!sectionSubject) return res.status(404).json({ error: 'Materia no encontrada' })

    const enrollments = await prisma.enrollment.findMany({
      where: { sectionSubjectId },
      include: {
        user: {
          select: { id: true, nombre: true, cedula: true, avatar: true, role: true, carrera: true, semestre: true, bio: true, email: true, telefono: true }
        }
      }
    })

    const isProfesor = req.user.role === 'PROFESOR' && sectionSubject.profesorId === req.user.id

    const members = enrollments.map(e => {
      const u = e.user
      const base = { id: u.id, nombre: u.nombre, avatar: u.avatar, role: u.role, subRole: e.subRole, carrera: u.carrera, semestre: u.semestre, bio: u.bio }
      if (isProfesor) {
        return { ...base, cedula: u.cedula, email: u.email, telefono: u.telefono }
      }
      return base
    })

    res.json({
      profesor: sectionSubject.profesor,
      students: members,
      total: members.length + 1
    })
  } catch (error) {
    console.error('Get members error:', error)
    res.status(500).json({ error: 'Error al obtener miembros' })
  }
})

router.delete('/:sectionSubjectId/remove/:userId', authenticate, async (req, res) => {
  try {
    const { sectionSubjectId, userId } = req.params

    const sectionSubject = await prisma.sectionSubject.findUnique({
      where: { id: sectionSubjectId }
    })
    if (!sectionSubject) return res.status(404).json({ error: 'Materia no encontrada' })

    if (sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede eliminar estudiantes' })
    }

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' })
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_sectionSubjectId: { userId, sectionSubjectId } }
    })
    if (!enrollment) {
      return res.status(404).json({ error: 'El estudiante no está inscrito' })
    }

    await prisma.enrollment.delete({ where: { id: enrollment.id } })

    res.json({ message: 'Estudiante eliminado de la materia' })
  } catch (error) {
    console.error('Remove member error:', error)
    res.status(500).json({ error: 'Error al eliminar estudiante' })
  }
})

router.get('/:sectionSubjectId/search', authenticate, async (req, res) => {
  try {
    const { sectionSubjectId } = req.params
    const { q } = req.query

    if (!q?.trim()) return res.json([])

    const sectionSubject = await prisma.sectionSubject.findUnique({
      where: { id: sectionSubjectId },
      select: { profesorId: true }
    })
    if (!sectionSubject) return res.status(404).json({ error: 'Materia no encontrada' })
    if (sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede buscar' })
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        sectionSubjectId,
        user: {
          OR: [
            { nombre: { contains: q } },
            { cedula: { contains: q } }
          ]
        }
      },
      include: {
        user: {
          select: { id: true, nombre: true, cedula: true, avatar: true, role: true, carrera: true, semestre: true, bio: true, email: true, telefono: true }
        }
      }
    })

    res.json(enrollments.map(e => ({ ...e.user, subRole: e.subRole })))
  } catch (error) {
    console.error('Search students error:', error)
    res.status(500).json({ error: 'Error al buscar' })
  }
})

router.put('/:sectionSubjectId/role/:userId', authenticate, async (req, res) => {
  try {
    const { sectionSubjectId, userId } = req.params
    const { subRole } = req.body

    const validRoles = ['DELEGADO', 'PREPARADOR', 'VOCERO', null]
    if (!validRoles.includes(subRole)) {
      return res.status(400).json({ error: 'Rol inválido. Valores: DELEGADO, PREPARADOR, VOCERO' })
    }

    const sectionSubject = await prisma.sectionSubject.findUnique({
      where: { id: sectionSubjectId }
    })
    if (!sectionSubject) return res.status(404).json({ error: 'Materia no encontrada' })
    if (sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede asignar roles' })
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_sectionSubjectId: { userId, sectionSubjectId } }
    })
    if (!enrollment) {
      return res.status(404).json({ error: 'El estudiante no está inscrito' })
    }

    const updated = await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { subRole },
      include: { user: { select: { id: true, nombre: true, avatar: true } } }
    })

    res.json(updated)
  } catch (error) {
    console.error('Set role error:', error)
    res.status(500).json({ error: 'Error al asignar rol' })
  }
})

export default router
