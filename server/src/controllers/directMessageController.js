import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function getConversations(req, res) {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { participants: { some: { userId: req.user.id } } },
      include: {
        participants: {
          include: { user: { select: { id: true, nombre: true, avatar: true, role: true } } }
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    })

    const result = await Promise.all(conversations.map(async c => {
      const other = c.participants.find(p => p.userId !== req.user.id)
      const unread = await prisma.directMessage.count({
        where: { conversationId: c.id, senderId: { not: req.user.id }, read: false }
      })
      return {
        id: c.id,
        otherUser: other?.user || null,
        lastMessage: c.messages[0] || null,
        unread,
        createdAt: c.createdAt
      }
    }))

    result.sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime()
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime()
      return bTime - aTime
    })

    res.json(result)
  } catch (error) {
    console.error('Get conversations error:', error)
    res.status(500).json({ error: 'Error al obtener conversaciones' })
  }
}

export async function getOrCreateConversation(req, res) {
  try {
    const { userId } = req.params
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'No puedes chatear contigo mismo' })
    }

    const other = await prisma.user.findUnique({ where: { id: userId } })
    if (!other) return res.status(404).json({ error: 'Usuario no encontrado' })

    const existing = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: req.user.id } } },
          { participants: { some: { userId } } }
        ]
      },
      include: {
        participants: {
          include: { user: { select: { id: true, nombre: true, avatar: true, role: true } } }
        }
      }
    })

    if (existing) return res.json(existing)

    const conversation = await prisma.conversation.create({
      data: {
        participants: {
          create: [
            { userId: req.user.id },
            { userId }
          ]
        }
      },
      include: {
        participants: {
          include: { user: { select: { id: true, nombre: true, avatar: true, role: true } } }
        }
      }
    })

    res.status(201).json(conversation)
  } catch (error) {
    console.error('Get/create conversation error:', error)
    res.status(500).json({ error: 'Error al crear conversación' })
  }
}

export async function getMessages(req, res) {
  try {
    const { conversationId } = req.params

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.user.id } }
    })
    if (!participant) return res.status(403).json({ error: 'No eres participante de esta conversación' })

    const messages = await prisma.directMessage.findMany({
      where: { conversationId },
      include: { sender: { select: { id: true, nombre: true, avatar: true } } },
      orderBy: { createdAt: 'asc' }
    })

    await prisma.directMessage.updateMany({
      where: { conversationId, senderId: { not: req.user.id }, read: false },
      data: { read: true }
    })

    res.json(messages)
  } catch (error) {
    console.error('Get DM messages error:', error)
    res.status(500).json({ error: 'Error al obtener mensajes' })
  }
}

export async function sendMessage(req, res) {
  try {
    const { conversationId } = req.params
    const { contenido } = req.body

    if (!contenido?.trim()) {
      return res.status(400).json({ error: 'Contenido requerido' })
    }

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.user.id } }
    })
    if (!participant) return res.status(403).json({ error: 'No eres participante de esta conversación' })

    const message = await prisma.directMessage.create({
      data: {
        conversationId,
        senderId: req.user.id,
        contenido: contenido.trim()
      },
      include: { sender: { select: { id: true, nombre: true, avatar: true } } }
    })

    const io = req.app.get('io')
    const userSocketsMap = req.app.get('userSockets') || new Map()

    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true }
    })

    for (const p of participants) {
      const sockets = userSocketsMap.get(p.userId)
      if (sockets) {
        for (const socketId of sockets) {
          io.to(socketId).emit('direct-message', message)
        }
      }
    }

    res.status(201).json(message)
  } catch (error) {
    console.error('Send DM error:', error)
    res.status(500).json({ error: 'Error al enviar mensaje' })
  }
}
