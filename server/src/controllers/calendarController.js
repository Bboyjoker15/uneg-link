import { PrismaClient } from '@prisma/client'
import Groq from 'groq-sdk'
import config from '../config.js'

const prisma = new PrismaClient()
const groq = new Groq({ apiKey: config.groqApiKey })

const ANNOUNCEMENT_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-20b']

async function generateAnnouncement(event, sectionSubjectId) {
  const sectionSubject = await prisma.sectionSubject.findUnique({
    where: { id: sectionSubjectId },
    include: {
      subject: true,
      section: true,
      files: { orderBy: { createdAt: 'desc' }, take: 20 },
      events: { where: { fecha: { gte: new Date('2024-01-01') } }, orderBy: { fecha: 'asc' }, take: 10 },
      channels: {
        where: { nombre: 'Anuncios' },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: { user: { select: { nombre: true } } }
          }
        }
      }
    }
  })
  if (!sectionSubject) return null

  const subjectName = `${sectionSubject.subject.nombre} - ${sectionSubject.section.codigo}`
  const contextParts = [`MATERIA: ${subjectName}`]

  if (sectionSubject.files.length > 0) {
    contextParts.push('\nMATERIALES Y CONTENIDOS DISPONIBLES:\n' +
      sectionSubject.files.map(f => `- ${f.nombre} (${f.tipo})`).join('\n'))
  }

  if (sectionSubject.events.length > 0) {
    contextParts.push('\nEVENTOS DEL CALENDARIO:\n' +
      sectionSubject.events.map(e =>
        `- ${e.titulo}: ${new Date(e.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} (${e.tipo})${e.importante ? ' [IMPORTANTE]' : ''}${e.descripcion ? ' - ' + e.descripcion : ''}`
      ).join('\n'))
  }

  const announcements = sectionSubject.channels[0]?.messages || []
  if (announcements.length > 0) {
    contextParts.push('\nANUNCIOS RECIENTES:\n' +
      announcements.map(a => `- ${a.user?.nombre}: "${a.contenido}"`).join('\n'))
  }

  const fullContext = contextParts.join('\n\n')
  const maxTokens = 1024

  const prompt = `Genera un anuncio formal y claro para informar a los estudiantes sobre el siguiente evento académico de la materia "${subjectName}":

Título: ${event.titulo}
Descripción: ${event.descripcion || 'Sin descripción'}
Fecha: ${new Date(event.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
Tipo: ${event.tipo}

CONTEXTO DE LA MATERIA:
${fullContext}

Teniendo en cuenta los materiales, contenido y eventos de la materia, redacta un anuncio que mencione los temas relevantes que los estudiantes deben repasar o preparar según el tipo de evento. El anuncio debe ser profesional, motivador y estar dirigido a los estudiantes. Incluye la fecha y detalles importantes.`
  for (const model of ANNOUNCEMENT_MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'Eres un asistente que redacta anuncios académicos formales para una plataforma universitaria. Los anuncios deben ser claros, profesionales, en español y deben hacer referencia al contenido y materiales de la materia cuando sea relevante.' },
          { role: 'user', content: prompt }
        ],
        model,
        temperature: 0.7,
        max_tokens: maxTokens
      })
      return completion.choices[0]?.message?.content || null
    } catch (error) {
      console.error(`Groq announcement error with model ${model}:`, error.message)
    }
  }
  return null
}

async function postAnnouncementToChannel(io, sectionSubjectId, contenido, userId, isAI = true) {
  const channel = await prisma.channel.findFirst({
    where: { sectionSubjectId, nombre: 'Anuncios' }
  })
  if (!channel) return null

  const message = await prisma.message.create({
    data: {
      contenido,
      userId,
      channelId: channel.id,
      isAI,
      isRelevant: true
    },
    include: {
      user: { select: { id: true, nombre: true, role: true } }
    }
  })

  io.to(`channel-${channel.id}`).emit('new-message', message)
  return message
}

export async function createEvent(req, res) {
  try {
    const { sectionSubjectId, titulo, descripcion, fecha, tipo, importante } = req.body

    if (!sectionSubjectId || !titulo || !fecha || !tipo) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' })
    }

    const sectionSubject = await prisma.sectionSubject.findUnique({
      where: { id: sectionSubjectId }
    })
    if (!sectionSubject || sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede crear eventos' })
    }

    const event = await prisma.calendarEvent.create({
      data: {
        sectionSubjectId,
        titulo,
        descripcion,
        fecha: new Date(fecha),
        tipo,
        importante: importante || false
      }
    })

    if (importante) {
      const announcementText = await generateAnnouncement(event, sectionSubjectId)
      if (announcementText) {
        await postAnnouncementToChannel(req.app.get('io'), sectionSubjectId, announcementText, req.user.id, true)
      }
    }

    res.status(201).json(event)
  } catch (error) {
    console.error('Create event error:', error)
    res.status(500).json({ error: 'Error al crear evento' })
  }
}

export async function getEvents(req, res) {
  try {
    const { sectionSubjectId } = req.params

    const events = await prisma.calendarEvent.findMany({
      where: { sectionSubjectId },
      orderBy: { fecha: 'asc' }
    })

    res.json(events)
  } catch (error) {
    console.error('Get events error:', error)
    res.status(500).json({ error: 'Error al obtener eventos' })
  }
}

export async function updateEvent(req, res) {
  try {
    const { id } = req.params
    const { titulo, descripcion, fecha, tipo, importante } = req.body

    const event = await prisma.calendarEvent.findUnique({
      where: { id },
      include: { sectionSubject: true }
    })
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' })
    if (event.sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede editar eventos' })
    }

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: {
        titulo: titulo ?? event.titulo,
        descripcion: descripcion ?? event.descripcion,
        fecha: fecha ? new Date(fecha) : event.fecha,
        tipo: tipo ?? event.tipo,
        importante: importante ?? event.importante
      }
    })

    res.json(updated)
  } catch (error) {
    console.error('Update event error:', error)
    res.status(500).json({ error: 'Error al actualizar evento' })
  }
}

export async function deleteEvent(req, res) {
  try {
    const { id } = req.params

    const event = await prisma.calendarEvent.findUnique({
      where: { id },
      include: { sectionSubject: true }
    })
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' })
    if (event.sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede eliminar eventos' })
    }

    await prisma.calendarEvent.delete({ where: { id } })

    res.json({ message: 'Evento eliminado' })
  } catch (error) {
    console.error('Delete event error:', error)
    res.status(500).json({ error: 'Error al eliminar evento' })
  }
}
