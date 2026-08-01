import prisma from '../lib/prisma.js'
import { cfChatWithTools } from './cfAiService.js'
import { AI_TOOLS, executeTool } from './aiToolDefinitions.js'

const SYSTEM_PROMPT = `Eres UnegAI, un asistente académico universitario inteligente para la plataforma Uneg-Link.

CAPACIDADES:
- Respondes preguntas académicas (programación, matemáticas, física, etc.)
- Puedes consultar datos REALES de la materia usando herramientas: eventos, archivos, anuncios, tareas, quizzes, profesor
- Explicas conceptos con ejemplos claros y didácticos

COMPORTAMIENTO:
- SIEMPRE usa las herramientas disponibles para consultar datos de la materia antes de responder sobre eventos, archivos, tareas o anuncios
- Para preguntas académicas generales (conceptos, teoría), responde con tu conocimiento sin necesidad de herramientas
- Sé formal, profesional y didáctico
- NO inventes fechas, datos ni nombres. Si una herramienta no devuelve datos, dilo claramente
- Si la pregunta no es académica, indica cordialmente que solo ayudas con temas universitarios
- Responde siempre en español`

const MAX_RESPONSE_CHARS = 3000

export async function generateAIResponse(messages, sectionSubjectId, question) {
  try {
    const sectionSubject = await prisma.sectionSubject.findUnique({
      where: { id: sectionSubjectId },
      include: {
        subject: true,
        section: true
      }
    })

    const subjectName = sectionSubject
      ? `${sectionSubject.subject.nombre} - ${sectionSubject.section.codigo}`
      : ''

    const contextPrompt = sectionSubject
      ? `\n\nCONTEXTO ACTUAL: El estudiante está en la materia "${subjectName}" (ID: ${sectionSubjectId}). Usa las herramientas para consultar datos reales de esta materia cuando sea necesario.`
      : ''

    const historyMessages = messages
      .filter(m => m.isRelevant !== false && !m.isAI && m.contenido)
      .slice(-10)
      .map(m => ({ role: 'user', content: String(m.contenido) }))

    const systemMessage = {
      role: 'system',
      content: String(SYSTEM_PROMPT + contextPrompt)
    }

    const userMessage = {
      role: 'user',
      content: String(question || '¿Cuál es el estado actual de la materia?')
    }

    const allMessages = [systemMessage]
    for (const m of historyMessages) {
      const text = String(m.contenido || '')
      if (text.trim()) {
        allMessages.push({ role: 'user', content: text })
      }
    }
    allMessages.push(userMessage)

    const content = await cfChatWithTools({
      messages: allMessages,
      tools: AI_TOOLS.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters
      })),
      executeToolFn: async (name, args) => {
        return executeTool(name, args)
      },
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
