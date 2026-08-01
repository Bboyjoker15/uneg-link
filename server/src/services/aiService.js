import prisma from '../lib/prisma.js'
import { cfChatCompletion } from './cfAiService.js'

const SYSTEM_PROMPT = `Eres UnegAI, un asistente académico universitario inteligente para la plataforma Uneg-Link.

CAPACIDADES:
- Respondes preguntas académicas (programación, matemáticas, física, etc.)
- Explicas conceptos con ejemplos claros y didácticos

COMPORTAMIENTO:
- Sé formal, profesional y didáctico
- NO inventes fechas, datos ni nombres
- Si la pregunta no es académica, indica cordialmente que solo ayudas con temas universitarios
- Responde siempre en español`

const MAX_RESPONSE_CHARS = 3000

async function getSubjectContext(sectionSubjectId) {
  try {
    const sectionSubject = await prisma.sectionSubject.findUnique({
      where: { id: sectionSubjectId },
      include: {
        subject: true,
        section: true,
        files: { orderBy: { createdAt: 'desc' }, take: 10 },
        events: { where: { fecha: { gte: new Date() } }, orderBy: { fecha: 'asc' }, take: 10 },
        channels: {
          where: { nombre: 'Anuncios' },
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 5,
              include: { user: { select: { nombre: true } } }
            }
          }
        },
        quizzes: { orderBy: { createdAt: 'desc' }, take: 5 }
      }
    })

    if (!sectionSubject) return ''

    const parts = []
    const subjectName = `${sectionSubject.subject.nombre} - ${sectionSubject.section.codigo}`
    parts.push(`MATERIA: ${subjectName}`)

    if (sectionSubject.files.length > 0) {
      parts.push('\nARCHIVOS:\n' + sectionSubject.files.map(f => `- ${f.nombre} (${f.tipo})`).join('\n'))
    }
    if (sectionSubject.events.length > 0) {
      parts.push('\nEVENTOS:\n' + sectionSubject.events.map(e =>
        `- ${e.titulo}: ${new Date(e.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} (${e.tipo})${e.importante ? ' ⭐IMPORTANTE' : ''}`
      ).join('\n'))
    }
    const announcements = sectionSubject.channels[0]?.messages || []
    if (announcements.length > 0) {
      parts.push('\nANUNCIOS:\n' + announcements.map(a => `- ${a.user?.nombre}: "${a.contenido?.slice(0, 150)}"`).join('\n'))
    }
    if (sectionSubject.quizzes?.length > 0) {
      parts.push('\nQUIZZES:\n' + sectionSubject.quizzes.map(q => `- "${q.titulo}": ${q.descripcion || 'sin descripción'}`).join('\n'))
    }

    return parts.join('\n')
  } catch (e) {
    console.error('getSubjectContext error:', e.message)
    return ''
  }
}

export async function generateAIResponse(messages, sectionSubjectId, question) {
  try {
    const context = await getSubjectContext(sectionSubjectId)

    const contextBlock = context ? `\n\nDATOS REALES DE LA MATERIA:\n${context}\n\nUsa estos datos para responder preguntas sobre la materia. Si la pregunta no está relacionada con estos datos, responde con tu conocimiento académico general.` : ''

    const historyMessages = messages
      .filter(m => m.isRelevant !== false && !m.isAI && m.contenido)
      .slice(-6)
      .map(m => `Usuario: ${m.contenido}`)
      .join('\n')

    const historyBlock = historyMessages ? `\n\nHISTORIAL RECIENTE:\n${historyMessages}` : ''

    const fullUserMessage = `${contextBlock}${historyBlock}\n\n---\nPREGUNTA DEL ESTUDIANTE: ${question || '¿Cuál es el estado actual de la materia?'}`

    const content = await cfChatCompletion({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: fullUserMessage }
      ],
      temperature: 0.7,
      max_tokens: 2048
    })

    if (!content) return 'Lo siento, no pude procesar tu solicitud.'

    if (content.length > MAX_RESPONSE_CHARS) {
      return content.slice(0, content.lastIndexOf(' ', MAX_RESPONSE_CHARS)) + '\n\n*[Respuesta truncada por límite de caracteres]*'
    }
    return content
  } catch (error) {
    console.error('AI service error:', error)
    return 'Error al conectar con la IA. Verifica la configuración de Cloudflare.'
  }
}
