import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { generateAIResponse } from '../services/aiService.js'
import { cfChatCompletion } from '../services/cfAiService.js'
import { extractTextFromFile } from '../services/fileExtractor.js'
import prisma from '../lib/prisma.js'

const router = Router()

router.post('/announcement', authenticate, requireRole('PROFESOR'), async (req, res) => {
  try {
    const { sectionSubjectId, prompt } = req.body

    if (!sectionSubjectId || !prompt?.trim()) {
      return res.status(400).json({ error: 'Materia y prompt requeridos' })
    }

    const sectionSubject = await prisma.sectionSubject.findUnique({
      where: { id: sectionSubjectId },
      include: {
        subject: true,
        section: true,
        files: { orderBy: { createdAt: 'desc' }, take: 15 },
        events: { where: { fecha: { gte: new Date('2024-01-01') } }, orderBy: { fecha: 'asc' }, take: 15 },
        quizzes: { orderBy: { createdAt: 'desc' }, take: 10 },
        channels: {
          where: { nombre: 'Anuncios' },
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 15,
              include: { user: { select: { nombre: true } } }
            }
          }
        }
      }
    })
    if (!sectionSubject) return res.status(404).json({ error: 'Materia no encontrada' })
    if (sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede generar anuncios con IA' })
    }

    const channel = sectionSubject.channels[0]
    if (!channel) return res.status(404).json({ error: 'Canal de Anuncios no encontrado' })

    const subjectName = `${sectionSubject.subject.nombre} - ${sectionSubject.section.codigo}`
    const contextParts = [`INFORMACIÓN DE LA MATERIA:\nNombre: ${subjectName}\nCódigo: ${sectionSubject.subject.codigo}`]

    if (sectionSubject.files.length > 0) {
      const fileParts = []
      for (const f of sectionSubject.files) {
        fileParts.push(`- ${f.nombre} (${f.tipo})`)
        const extracted = await extractTextFromFile(f.url, f.tipo)
        if (extracted) {
          fileParts.push(`  Contenido: ${extracted.slice(0, 1500)}`)
        }
      }
      contextParts.push('\nMATERIALES Y CONTENIDOS DISPONIBLES:\n' + fileParts.join('\n'))
    }

    if (sectionSubject.events.length > 0) {
      contextParts.push('\nEVENTOS DEL CALENDARIO:\n' +
        sectionSubject.events.map(e =>
          `- ${e.titulo}: ${new Date(e.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} (${e.tipo})${e.importante ? ' [IMPORTANTE]' : ''}${e.descripcion ? ' - ' + e.descripcion : ''}`
        ).join('\n'))
    }

    const announcements = channel.messages || []
    if (announcements.length > 0) {
      contextParts.push('\nANUNCIOS RECIENTES:\n' +
        announcements.map(a => `- ${a.user?.nombre}: "${a.contenido}"`).join('\n'))
    }

    if (sectionSubject.quizzes?.length > 0) {
      contextParts.push('\nQUIZZES DISPONIBLES:\n' +
        sectionSubject.quizzes.map(q => `- "${q.titulo}": ${q.descripcion || 'sin descripción'} (${q.maxAttempts} intentos máx)`).join('\n'))
    }

    const fullContext = contextParts.join('\n\n')
    const name = req.user.nombre

    let aiContent = null
    try {
      aiContent = await cfChatCompletion({
        messages: [
          {
            role: 'system',
            content: `Eres un asistente que redacta anuncios académicos formales para la materia "${subjectName}" en una plataforma universitaria.
El profesor ${name} te dará una indicación y tú debes convertirla en un anuncio profesional y claro dirigido a los estudiantes.
Tienes acceso al contexto completo de la materia (materiales, eventos y anuncios) para que el anuncio sea informado y relevante.
El anuncio debe ser en español, formal pero cercano, bien estructurado y listo para publicar. No agregues meta-instrucciones ni saludos iniciales como "Claro, aquí tienes..." — ve directo al anuncio.`
          },
          {
            role: 'user',
            content: `CONTEXTO DE LA MATERIA:\n${fullContext}\n\n---\n\nIndicación del profesor: ${prompt}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    } catch (error) {
      console.error('CF AI announcement error:', error.message)
    }

    if (!aiContent) {
      return res.status(500).json({ error: 'Error al generar el anuncio con la IA' })
    }

    res.json({ content: aiContent })
  } catch (error) {
    console.error('AI announcement error:', error)
    res.status(500).json({ error: 'Error al generar anuncio' })
  }
})

router.post('/generate-quiz', authenticate, requireRole('PROFESOR'), async (req, res) => {
  try {
    const { sectionSubjectId, topic, numQuestions, types } = req.body

    if (!sectionSubjectId || !topic?.trim()) {
      return res.status(400).json({ error: 'Materia y tema requeridos' })
    }

    const sectionSubject = await prisma.sectionSubject.findUnique({
      where: { id: sectionSubjectId },
      include: {
        subject: true,
        section: true,
        files: { orderBy: { createdAt: 'desc' }, take: 50 },
        events: { where: { fecha: { gte: new Date('2024-01-01') } }, orderBy: { fecha: 'asc' }, take: 100 },
        quizzes: { orderBy: { createdAt: 'desc' }, take: 20 }
      }
    })
    if (!sectionSubject) return res.status(404).json({ error: 'Materia no encontrada' })
    if (sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede generar quizzes' })
    }

    const subjectName = `${sectionSubject.subject.nombre} - ${sectionSubject.section.codigo}`
    const contextParts = [`MATERIA: ${subjectName} (${sectionSubject.subject.codigo})`]
    if (sectionSubject.files.length > 0) {
      const fileParts = []
      for (const f of sectionSubject.files) {
        fileParts.push(`- ${f.nombre}`)
        const extracted = await extractTextFromFile(f.url, f.tipo)
        if (extracted) {
          fileParts.push(`  Contenido: ${extracted.slice(0, 1500)}`)
        }
      }
      contextParts.push('\nMATERIALES DE LA MATERIA:\n' + fileParts.join('\n'))
    }
    if (sectionSubject.events.length > 0) {
      contextParts.push('\nEVENTOS:\n' + sectionSubject.events.map(e => `- ${e.titulo} (${e.tipo})`).join('\n'))
    }
    if (sectionSubject.quizzes?.length > 0) {
      contextParts.push('\nQUIZZES EXISTENTES:\n' + sectionSubject.quizzes.map(q => `- "${q.titulo}"`).join('\n'))
    }
    const fullContext = contextParts.join('\n\n')

    const count = Math.min(Math.max(numQuestions || 5, 1), 20)
    const allowedTypes = types || ['multiple-choice', 'true-false', 'short-answer']
    const typesStr = allowedTypes.map(t => {
      const map = { 'multiple-choice': 'Opción múltiple (4 opciones, una correcta)', 'true-false': 'Verdadero/Falso', 'short-answer': 'Respuesta corta', 'essay': 'Ensayo/Análisis', 'calculation': 'Cálculo' }
      return map[t] || t
    }).join(', ')

    let quizContent = null
    try {
      const text = await cfChatCompletion({
        messages: [
          {
            role: 'system',
            content: `Eres un profesor universitario creando preguntas de evaluación para la materia "${subjectName}".
Genera exactamente ${count} preguntas en formato JSON array. Sin markdown, solo JSON.

Formato de cada pregunta:
{
  "id": "q1",
  "type": "multiple-choice" | "true-false" | "short-answer" | "essay" | "calculation",
  "question": "texto de la pregunta",
  "options": ["op1", "op2", "op3", "op4"], // solo para multiple-choice
  "correctAnswer": "respuesta correcta", // para multiple-choice, true-false, short-answer, calculation
  "modelAnswer": "respuesta modelo detallada" // solo para essay
}

Tipos de pregunta permitidos: ${typesStr}
Las preguntas deben estar basadas en el contexto de la materia proporcionado.
Las preguntas de cálculo deben tener valores numéricos exactos como respuesta.
Las preguntas de opción múltiple deben tener 4 opciones con una claramente correcta.
Las respuestas deben ser precisas y correctas.`
          },
          { role: 'user', content: `Basado en el siguiente contexto de la materia, genera ${count} preguntas sobre el tema: "${topic}"\n\n${fullContext}` }
        ],
        temperature: 0.7,
        max_tokens: 4096
      })

      if (text) {
        const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
        quizContent = JSON.parse(cleaned)
      }
    } catch (error) {
      console.error('CF AI quiz gen error:', error.message)
    }

    if (!quizContent) {
      return res.status(500).json({ error: 'Error al generar preguntas con la IA' })
    }

    res.json({ questions: quizContent })
  } catch (error) {
    console.error('AI generate quiz error:', error)
    res.status(500).json({ error: 'Error al generar quiz' })
  }
})

router.post('/announcement/confirm', authenticate, requireRole('PROFESOR'), async (req, res) => {
  try {
    const { sectionSubjectId, content } = req.body

    if (!sectionSubjectId || !content?.trim()) {
      return res.status(400).json({ error: 'Materia y contenido requeridos' })
    }

    const sectionSubject = await prisma.sectionSubject.findUnique({
      where: { id: sectionSubjectId },
      include: {
        channels: { where: { nombre: 'Anuncios' } }
      }
    })
    if (!sectionSubject) return res.status(404).json({ error: 'Materia no encontrada' })
    if (sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede publicar anuncios' })
    }

    const channel = sectionSubject.channels[0]
    if (!channel) return res.status(404).json({ error: 'Canal de Anuncios no encontrado' })

    const message = await prisma.message.create({
      data: {
        contenido: content,
        userId: req.user.id,
        channelId: channel.id,
        isAI: true,
        isRelevant: true
      },
      include: {
        user: { select: { id: true, nombre: true, role: true } }
      }
    })

    req.app.get('io').to(`channel-${channel.id}`).emit('new-message', message)

    res.status(201).json(message)
  } catch (error) {
    console.error('AI confirm announcement error:', error)
    res.status(500).json({ error: 'Error al publicar anuncio' })
  }
})

router.post('/ask', authenticate, async (req, res) => {
  try {
    const { channelId, question } = req.body

    if (!channelId) {
      return res.status(400).json({ error: 'Canal requerido' })
    }

    if (!question?.trim()) {
      return res.status(400).json({ error: 'Pregunta requerida' })
    }
    if (question.length > 500) {
      return res.status(400).json({ error: 'La pregunta no puede superar los 500 caracteres' })
    }

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { sectionSubjectId: true }
    })

    if (!channel) {
      return res.status(404).json({ error: 'Canal no encontrado' })
    }

    const messages = await prisma.message.findMany({
      where: { channelId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, nombre: true, role: true } }
      }
    })

    const userMessage = await prisma.message.create({
      data: {
        contenido: String(question),
        userId: req.user.id,
        channelId,
        isRelevant: true
      },
      include: {
        user: { select: { id: true, nombre: true, role: true } }
      }
    })

    req.app.get('io').to(`channel-${channelId}`).emit('new-message', userMessage)

    const respuesta = await generateAIResponse(messages, channel.sectionSubjectId, question)

    const aiMessage = await prisma.message.create({
      data: {
        contenido: respuesta,
        userId: req.user.id,
        channelId,
        isAI: true,
        isRelevant: true
      },
      include: {
        user: { select: { id: true, nombre: true, role: true } }
      }
    })

    req.app.get('io').to(`channel-${channelId}`).emit('ai-response', aiMessage)

    res.json({ userMessage, aiMessage })
  } catch (error) {
    console.error('AI error:', error)
    res.status(500).json({ error: 'Error al procesar solicitud de IA' })
  }
})

export default router
