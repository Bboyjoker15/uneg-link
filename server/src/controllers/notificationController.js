import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function getNotifications(req, res) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    res.json(notifications)
  } catch (error) {
    console.error('Get notifications error:', error)
    res.status(500).json({ error: 'Error al obtener notificaciones' })
  }
}

export async function markAsRead(req, res) {
  try {
    const { id } = req.params
    await prisma.notification.updateMany({
      where: { id, userId: req.user.id },
      data: { read: true }
    })
    res.json({ mensaje: 'Notificación marcada como leída' })
  } catch (error) {
    console.error('Mark as read error:', error)
    res.status(500).json({ error: 'Error al marcar notificación' })
  }
}

export async function markAllAsRead(req, res) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true }
    })
    res.json({ mensaje: 'Todas las notificaciones marcadas como leídas' })
  } catch (error) {
    console.error('Mark all as read error:', error)
    res.status(500).json({ error: 'Error al marcar notificaciones' })
  }
}
