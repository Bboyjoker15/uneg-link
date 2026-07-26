import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function getThreads(req, res) {
  try {
    const { sectionSubjectId } = req.params

    const threads = await prisma.forumThread.findMany({
      where: { sectionSubjectId },
      include: {
        user: { select: { id: true, nombre: true, avatar: true, role: true } },
        _count: { select: { replies: true } }
      },
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }]
    })

    res.json(threads)
  } catch (error) {
    console.error('Get threads error:', error)
    res.status(500).json({ error: 'Error al obtener hilos' })
  }
}

export async function createThread(req, res) {
  try {
    const { sectionSubjectId } = req.params
    const { titulo, contenido } = req.body

    if (!titulo?.trim() || !contenido?.trim()) {
      return res.status(400).json({ error: 'Título y contenido requeridos' })
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_sectionSubjectId: { userId: req.user.id, sectionSubjectId } }
    })
    if (!enrollment) {
      const ss = await prisma.sectionSubject.findUnique({ where: { id: sectionSubjectId } })
      if (!ss || ss.profesorId !== req.user.id) {
        return res.status(403).json({ error: 'No estás inscrito en esta materia' })
      }
    }

    const thread = await prisma.forumThread.create({
      data: {
        sectionSubjectId,
        userId: req.user.id,
        titulo: titulo.trim(),
        contenido: contenido.trim()
      },
      include: {
        user: { select: { id: true, nombre: true, avatar: true, role: true } },
        _count: { select: { replies: true } }
      }
    })

    res.status(201).json(thread)
  } catch (error) {
    console.error('Create thread error:', error)
    res.status(500).json({ error: 'Error al crear hilo' })
  }
}

export async function getThread(req, res) {
  try {
    const { threadId } = req.params

    const thread = await prisma.forumThread.findUnique({
      where: { id: threadId },
      include: {
        user: { select: { id: true, nombre: true, avatar: true, role: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, nombre: true, avatar: true, role: true } },
            replies: {
              orderBy: { createdAt: 'asc' },
              include: {
                user: { select: { id: true, nombre: true, avatar: true, role: true } }
              }
            }
          }
        }
      }
    })
    if (!thread) return res.status(404).json({ error: 'Hilo no encontrado' })

    res.json(thread)
  } catch (error) {
    console.error('Get thread error:', error)
    res.status(500).json({ error: 'Error al obtener hilo' })
  }
}

export async function createReply(req, res) {
  try {
    const { threadId } = req.params
    const { contenido, parentId } = req.body

    if (!contenido?.trim()) {
      return res.status(400).json({ error: 'Contenido requerido' })
    }

    const thread = await prisma.forumThread.findUnique({
      where: { id: threadId },
      include: { sectionSubject: { select: { id: true, profesorId: true } } }
    })
    if (!thread) return res.status(404).json({ error: 'Hilo no encontrado' })
    if (thread.closed) return res.status(400).json({ error: 'El hilo está cerrado' })

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_sectionSubjectId: { userId: req.user.id, sectionSubjectId: thread.sectionSubject.id } }
    })
    if (!enrollment && thread.sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    if (parentId) {
      const parent = await prisma.forumReply.findUnique({ where: { id: parentId } })
      if (!parent || parent.threadId !== threadId) {
        return res.status(400).json({ error: 'Respuesta padre inválida' })
      }
    }

    const reply = await prisma.forumReply.create({
      data: {
        threadId,
        userId: req.user.id,
        contenido: contenido.trim(),
        parentId: parentId || null
      },
      include: {
        user: { select: { id: true, nombre: true, avatar: true, role: true } }
      }
    })

    await prisma.forumThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() }
    })

    res.status(201).json(reply)
  } catch (error) {
    console.error('Create reply error:', error)
    res.status(500).json({ error: 'Error al responder' })
  }
}

export async function togglePinThread(req, res) {
  try {
    const { threadId } = req.params

    const thread = await prisma.forumThread.findUnique({
      where: { id: threadId },
      include: { sectionSubject: { select: { profesorId: true } } }
    })
    if (!thread) return res.status(404).json({ error: 'Hilo no encontrado' })
    if (thread.sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede fijar hilos' })
    }

    const updated = await prisma.forumThread.update({
      where: { id: threadId },
      data: { pinned: !thread.pinned }
    })

    res.json(updated)
  } catch (error) {
    console.error('Toggle pin error:', error)
    res.status(500).json({ error: 'Error al fijar hilo' })
  }
}

export async function toggleCloseThread(req, res) {
  try {
    const { threadId } = req.params

    const thread = await prisma.forumThread.findUnique({
      where: { id: threadId },
      include: { sectionSubject: { select: { profesorId: true } } }
    })
    if (!thread) return res.status(404).json({ error: 'Hilo no encontrado' })
    if (thread.sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede cerrar hilos' })
    }

    const updated = await prisma.forumThread.update({
      where: { id: threadId },
      data: { closed: !thread.closed }
    })

    res.json(updated)
  } catch (error) {
    console.error('Toggle close error:', error)
    res.status(500).json({ error: 'Error al cerrar hilo' })
  }
}
