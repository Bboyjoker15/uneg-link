import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

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

export default router
