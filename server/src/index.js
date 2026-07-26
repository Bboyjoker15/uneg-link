import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import config from './config.js'
import { setupChatSocket } from './sockets/chatSocket.js'

import authRoutes from './routes/auth.js'
import subjectRoutes from './routes/subjects.js'
import channelRoutes from './routes/channels.js'
import messageRoutes from './routes/messages.js'
import fileRoutes from './routes/files.js'
import quizRoutes from './routes/quizzes.js'
import calendarRoutes from './routes/calendar.js'
import aiRoutes from './routes/ai.js'
import enrollmentRoutes from './routes/enrollments.js'
import profileRoutes from './routes/profile.js'
import notificationRoutes from './routes/notifications.js'
import assignmentRoutes from './routes/assignments.js'
import gradeRoutes from './routes/grades.js'
import forumRoutes from './routes/forum.js'
import directMessageRoutes from './routes/directMessages.js'
import groupRoutes from './routes/groups.js'
import professorPanelRoutes from './routes/professorPanel.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:4173'],
    methods: ['GET', 'POST']
  }
})

app.set('io', io)

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

app.use('/api/auth', authRoutes)
app.use('/api/subjects', subjectRoutes)
app.use('/api/channels', channelRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/files', fileRoutes)
app.use('/api/quizzes', quizRoutes)
app.use('/api/calendar', calendarRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/enrollments', enrollmentRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/assignments', assignmentRoutes)
app.use('/api/grades', gradeRoutes)
app.use('/api/forum', forumRoutes)
app.use('/api/direct-messages', directMessageRoutes)
app.use('/api/groups', groupRoutes)
app.use('/api/professor', professorPanelRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

setupChatSocket(io, app)

httpServer.listen(config.port, () => {
  console.log(`🚀 Servidor Uneg-Link corriendo en http://localhost:${config.port}`)
})
