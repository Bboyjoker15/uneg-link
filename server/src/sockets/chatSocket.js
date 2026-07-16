import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import config from '../config.js'
import { generateAIResponse } from '../services/aiService.js'

const prisma = new PrismaClient()

const userSockets = new Map()
let ioInstance = null

function addUserSocket(userId, socketId) {
  if (!userSockets.has(userId)) userSockets.set(userId, new Set())
  userSockets.get(userId).add(socketId)
}

function removeUserSocket(userId, socketId) {
  const sockets = userSockets.get(userId)
  if (sockets) {
    sockets.delete(socketId)
    if (sockets.size === 0) userSockets.delete(userId)
  }
}

function emitToUser(userId, event, data) {
  const sockets = userSockets.get(userId)
  if (sockets && ioInstance) {
    for (const socketId of sockets) {
      ioInstance.to(socketId).emit(event, data)
    }
  }
}

async function createNotification(userId, type, title, body, link) {
  try {
    const notification = await prisma.notification.create({
      data: { userId, type, title, body, link }
    })
    emitToUser(userId, 'new-notification', notification)
  } catch (error) {
    console.error('Create notification error:', error)
  }
}

export function setupChatSocket(io, app) {
  ioInstance = io
  if (app) app.set('userSockets', userSockets)
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) {
      return next(new Error('Token requerido'))
    }
    try {
      const decoded = jwt.verify(token, config.jwtSecret)
      socket.user = decoded
      next()
    } catch {
      next(new Error('Token inválido'))
    }
  })

  io.on('connection', (socket) => {
    console.log(`🔌 Usuario conectado: ${socket.user.nombre}`)
    addUserSocket(socket.user.id, socket.id)

    socket.on('join-channel', (channelId) => {
      socket.join(`channel-${channelId}`)
      console.log(`   -> ${socket.user.nombre} unido a canal ${channelId}`)
    })

    socket.on('leave-channel', (channelId) => {
      socket.leave(`channel-${channelId}`)
    })

    socket.on('new-message', async (data) => {
      try {
        const message = await prisma.message.create({
          data: {
            contenido: data.contenido,
            userId: socket.user.id,
            channelId: data.channelId,
            fileUrl: data.fileUrl || null,
            fileType: data.fileType || null,
            fileName: data.fileName || null
          },
          include: {
            user: { select: { id: true, nombre: true, role: true } }
          }
        })

        io.to(`channel-${data.channelId}`).emit('new-message', message)

        const channel = await prisma.channel.findUnique({
          where: { id: data.channelId },
          select: { sectionSubjectId: true, nombre: true }
        })

        if (channel) {
          const enrollments = await prisma.enrollment.findMany({
            where: { sectionSubjectId: channel.sectionSubjectId },
            select: { userId: true }
          })

          for (const enrollment of enrollments) {
            if (enrollment.userId !== socket.user.id) {
              await createNotification(
                enrollment.userId,
                'MENSAJE',
                `Nuevo mensaje en ${channel.nombre}`,
                message.contenido?.substring(0, 100),
                `/channel/${data.channelId}`
              )
            }
          }
        }

        const text = data.contenido?.toLowerCase() || ''
        if (text.startsWith('/ia')) {
          const question = data.contenido.replace(/^\/ia\s*/i, '').trim()
          if (!question) return

          const channel = await prisma.channel.findUnique({
            where: { id: data.channelId },
            select: { subjectId: true }
          })
          if (!channel) return

          const messages = await prisma.message.findMany({
            where: { channelId: data.channelId },
            orderBy: { createdAt: 'asc' },
            include: {
              user: { select: { id: true, nombre: true, role: true } }
            }
          })

          const respuesta = await generateAIResponse(messages, channel.subjectId, question)

          const aiMessage = await prisma.message.create({
            data: {
              contenido: respuesta,
              userId: socket.user.id,
              channelId: data.channelId,
              isAI: true,
              isRelevant: true
            },
            include: {
              user: { select: { id: true, nombre: true, role: true } }
            }
          })

          io.to(`channel-${data.channelId}`).emit('ai-response', aiMessage)
        }
      } catch (error) {
        console.error('Socket message error:', error)
        socket.emit('error', { message: 'Error al enviar mensaje' })
      }
    })

    socket.on('typing', (data) => {
      socket.to(`channel-${data.channelId}`).emit('typing', {
        userId: socket.user.id,
        nombre: socket.user.nombre,
        channelId: data.channelId
      })
    })

    socket.on('stop-typing', (data) => {
      socket.to(`channel-${data.channelId}`).emit('stop-typing', {
        userId: socket.user.id,
        nombre: socket.user.nombre,
        channelId: data.channelId
      })
    })

    socket.on('disconnect', () => {
      console.log(`🔌 Usuario desconectado: ${socket.user.nombre}`)
      removeUserSocket(socket.user.id, socket.id)
    })
  })
}
