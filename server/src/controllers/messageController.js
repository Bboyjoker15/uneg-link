
import prisma from '../lib/prisma.js'

export async function getMessages(req, res) {
  try {
    const { channelId } = req.params
    const { limit = 50, offset = 0 } = req.query

    const messages = await prisma.message.findMany({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        user: { select: { id: true, nombre: true, role: true } }
      }
    })

    res.json(messages.reverse())
  } catch (error) {
    console.error('Get messages error:', error)
    res.status(500).json({ error: 'Error al obtener mensajes' })
  }
}

export async function sendMessage(req, res) {
  try {
    const { channelId } = req.params
    const { contenido } = req.body

    if (!contenido && !req.file) {
      return res.status(400).json({ error: 'Contenido o archivo requerido' })
    }

    const message = await prisma.message.create({
      data: {
        contenido: contenido || '',
        userId: req.user.id,
        channelId,
        fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
        fileType: req.file ? req.file.mimetype : null,
        fileName: req.file ? req.file.originalname : null
      },
      include: {
        user: { select: { id: true, nombre: true, role: true } }
      }
    })

    req.app.get('io').to(`channel-${channelId}`).emit('new-message', message)

    res.status(201).json(message)
  } catch (error) {
    console.error('Send message error:', error)
    res.status(500).json({ error: 'Error al enviar mensaje' })
  }
}

export async function updateMessageRelevance(req, res) {
  try {
    const { id } = req.params
    const { isRelevant } = req.body

    const message = await prisma.message.update({
      where: { id },
      data: { isRelevant }
    })

    res.json(message)
  } catch (error) {
    console.error('Update relevance error:', error)
    res.status(500).json({ error: 'Error al actualizar relevancia' })
  }
}
