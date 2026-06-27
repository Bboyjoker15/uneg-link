import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function getMySubjects(req, res) {
  try {
    const userId = req.user.id
    const isProfessor = req.user.role === 'PROFESOR'

    let sectionSubjects

    if (isProfessor) {
      sectionSubjects = await prisma.sectionSubject.findMany({
        where: { profesorId: userId },
        include: {
          subject: true,
          section: true,
          channels: { orderBy: { createdAt: 'asc' } },
          _count: { select: { enrollments: true } }
        }
      })
    } else {
      const enrollments = await prisma.enrollment.findMany({
        where: { userId },
        include: {
          sectionSubject: {
            include: {
              subject: true,
              section: true,
              channels: { orderBy: { createdAt: 'asc' } },
              profesor: { select: { id: true, nombre: true } },
              _count: { select: { enrollments: true } }
            }
          }
        }
      })
      sectionSubjects = enrollments.map(e => e.sectionSubject)
    }

    const result = sectionSubjects.map(ss => ({
      id: ss.id,
      sectionSubjectId: ss.id,
      subjectId: ss.subject.id,
      nombre: ss.subject.nombre,
      codigo: ss.subject.codigo,
      sectionNombre: ss.section.nombre,
      sectionCodigo: ss.section.codigo,
      sectionId: ss.section.id,
      channels: ss.channels,
      profesor: ss.profesor || null,
      _count: ss._count
    }))

    res.json(result)
  } catch (error) {
    console.error('Get subjects error:', error)
    res.status(500).json({ error: 'Error al obtener materias' })
  }
}

export async function getSubjectDetail(req, res) {
  try {
    const { id } = req.params

    const sectionSubject = await prisma.sectionSubject.findUnique({
      where: { id },
      include: {
        subject: true,
        section: true,
        channels: { orderBy: { createdAt: 'asc' } },
        profesor: { select: { id: true, nombre: true } },
        files: { orderBy: { createdAt: 'desc' }, take: 20 },
        events: { orderBy: { fecha: 'asc' } },
        _count: { select: { enrollments: true } }
      }
    })

    if (!sectionSubject) {
      return res.status(404).json({ error: 'Materia no encontrada' })
    }

    const isProfessor = sectionSubject.profesorId === req.user.id
    const isEnrolled = await prisma.enrollment.findUnique({
      where: { userId_sectionSubjectId: { userId: req.user.id, sectionSubjectId: id } }
    })

    if (!isProfessor && !isEnrolled) {
      return res.status(403).json({ error: 'No tienes acceso a esta materia' })
    }

    res.json({
      id: sectionSubject.id,
      sectionSubjectId: sectionSubject.id,
      subjectId: sectionSubject.subject.id,
      nombre: sectionSubject.subject.nombre,
      codigo: sectionSubject.subject.codigo,
      sectionNombre: sectionSubject.section.nombre,
      sectionCodigo: sectionSubject.section.codigo,
      sectionId: sectionSubject.section.id,
      channels: sectionSubject.channels,
      files: sectionSubject.files,
      events: sectionSubject.events,
      profesor: sectionSubject.profesor,
      _count: sectionSubject._count
    })
  } catch (error) {
    console.error('Get subject error:', error)
    res.status(500).json({ error: 'Error al obtener materia' })
  }
}

export async function getOverview(req, res) {
  try {
    const userId = req.user.id
    const isProfessor = req.user.role === 'PROFESOR'

    let sectionSubjectIds = []

    if (isProfessor) {
      const ss = await prisma.sectionSubject.findMany({
        where: { profesorId: userId },
        select: { id: true }
      })
      sectionSubjectIds = ss.map(s => s.id)
    } else {
      const enrollments = await prisma.enrollment.findMany({
        where: { userId },
        select: { sectionSubjectId: true }
      })
      sectionSubjectIds = enrollments.map(e => e.sectionSubjectId)
    }

    const sectionSubjects = await prisma.sectionSubject.findMany({
      where: { id: { in: sectionSubjectIds } },
      include: {
        subject: true,
        section: true,
        channels: {
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 5,
              include: { user: { select: { id: true, nombre: true, role: true } } }
            }
          }
        },
        events: {
          where: { fecha: { gte: new Date() } },
          orderBy: { fecha: 'asc' },
          take: 10
        },
        _count: { select: { enrollments: true } }
      }
    })

    const announcements = sectionSubjects.flatMap(ss =>
      ss.channels
        .filter(c => c.nombre === 'Anuncios')
        .flatMap(c => c.messages.map(m => ({
          ...m,
          subjectName: ss.subject.nombre,
          subjectId: ss.id,
          sectionCodigo: ss.section.codigo
        })))
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10)

    const upcomingEvents = sectionSubjects.flatMap(ss =>
      ss.events.map(e => ({
        ...e,
        subjectName: ss.subject.nombre,
        sectionCodigo: ss.section.codigo
      }))
    ).sort((a, b) => new Date(a.fecha) - new Date(b.fecha))

    const subjectsSummary = sectionSubjects.map(ss => ({
      id: ss.id,
      sectionSubjectId: ss.id,
      subjectId: ss.subject.id,
      nombre: ss.subject.nombre,
      codigo: ss.subject.codigo,
      sectionNombre: ss.section.nombre,
      sectionCodigo: ss.section.codigo,
      _count: ss._count
    }))

    res.json({ announcements, upcomingEvents, subjects: subjectsSummary })
  } catch (error) {
    console.error('Get overview error:', error)
    res.status(500).json({ error: 'Error al obtener vista general' })
  }
}

export async function createAnnouncement(req, res) {
  try {
    const { id } = req.params
    const { contenido } = req.body

    if (!contenido?.trim()) {
      return res.status(400).json({ error: 'Contenido requerido' })
    }

    const sectionSubject = await prisma.sectionSubject.findUnique({
      where: { id },
      include: { subject: true, section: true }
    })
    if (!sectionSubject) return res.status(404).json({ error: 'Materia no encontrada' })
    if (sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede crear anuncios' })
    }

    const channel = await prisma.channel.findFirst({
      where: { sectionSubjectId: id, nombre: 'Anuncios' }
    })
    if (!channel) return res.status(404).json({ error: 'Canal de Anuncios no encontrado' })

    const message = await prisma.message.create({
      data: {
        contenido,
        userId: req.user.id,
        channelId: channel.id,
        isAI: false,
        isRelevant: true
      },
      include: {
        user: { select: { id: true, nombre: true, role: true } }
      }
    })

    req.app.get('io').to(`channel-${channel.id}`).emit('new-message', message)

    res.status(201).json(message)
  } catch (error) {
    console.error('Create announcement error:', error)
    res.status(500).json({ error: 'Error al crear anuncio' })
  }
}

export async function getSections(req, res) {
  try {
    const sections = await prisma.section.findMany({
      orderBy: { codigo: 'asc' }
    })
    res.json(sections)
  } catch (error) {
    console.error('Get sections error:', error)
    res.status(500).json({ error: 'Error al obtener secciones' })
  }
}

export async function getSectionSubjectsBySection(req, res) {
  try {
    const { sectionId } = req.params
    const sectionSubjects = await prisma.sectionSubject.findMany({
      where: { sectionId },
      include: {
        subject: true,
        profesor: { select: { id: true, nombre: true } },
        _count: { select: { enrollments: true } }
      }
    })
    res.json(sectionSubjects)
  } catch (error) {
    console.error('Get section subjects error:', error)
    res.status(500).json({ error: 'Error al obtener materias de la sección' })
  }
}
