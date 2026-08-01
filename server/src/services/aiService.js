import prisma from '../lib/prisma.js'
import { cfChatCompletion } from './cfAiService.js'
import { extractTextFromFile } from './fileExtractor.js'

const TOOLS = [
  { name: 'get_events', desc: 'Próximos eventos del calendario (exámenes, entregas)', params: { sectionSubjectId: 'string' } },
  { name: 'get_files', desc: 'Archivos y materiales disponibles', params: { sectionSubjectId: 'string' } },
  { name: 'get_announcements', desc: 'Anuncios recientes del profesor', params: { sectionSubjectId: 'string' } },
  { name: 'get_assignments', desc: 'Tareas pendientes de la materia', params: { sectionSubjectId: 'string' } },
  { name: 'get_quizzes', desc: 'Quizzes y evaluaciones disponibles', params: { sectionSubjectId: 'string' } },
  { name: 'get_professor', desc: 'Nombre y correo del profesor', params: { sectionSubjectId: 'string' } }
]

const TOOLS_PROMPT = TOOLS.map(t =>
  `- ${t.name}(${Object.keys(t.params).join(', ')}): ${t.desc}`
).join('\n')

const SYSTEM_PROMPT = `Eres UnegAI, asistente académico de Uneg-Link. Responde en español, formal y didáctico.

Para consultar datos reales de la materia, debes devolver EXACTAMENTE un JSON con este formato (sin texto adicional):
{"tool":"nombre_de_la_herramienta","args":{"sectionSubjectId":"ID_DE_LA_MATERIA"}}

Herramientas disponibles:
${TOOLS_PROMPT}

Reglas:
- Usa herramientas PARA CUALQUIER pregunta sobre eventos, archivos, tareas, anuncios, quizzes o profesor
- Para preguntas académicas generales (teoría, conceptos), responde directamente SIN JSON
- NO inventes datos. Si una herramienta no devuelve nada, dilo
- Solo responde preguntas académicas`

const MAX_RESPONSE_CHARS = 3000

async function executeTool(name, args) {
  const ssId = args.sectionSubjectId
  if (!ssId) return 'Error: sectionSubjectId requerido'

  switch (name) {
    case 'get_events': {
      const events = await prisma.calendarEvent.findMany({
        where: { sectionSubjectId: ssId, fecha: { gte: new Date() } },
        orderBy: { fecha: 'asc' }
      })
      if (!events.length) return 'No hay eventos próximos.'
      return events.map(e =>
        `- ${e.titulo}: ${new Date(e.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} (${e.tipo})${e.importante ? ' ⭐IMPORTANTE' : ''}${e.descripcion ? ' - ' + e.descripcion : ''}`
      ).join('\n')
    }
    case 'get_files': {
      const files = await prisma.file.findMany({
        where: { sectionSubjectId: ssId }, orderBy: { createdAt: 'desc' }
      })
      if (!files.length) return 'No hay archivos subidos.'

      const parts = ['ARCHIVOS DISPONIBLES:']
      for (const f of files) {
        parts.push(`- ${f.nombre} (${f.tipo}) — ${new Date(f.createdAt).toLocaleDateString('es-ES')}`)
        const extracted = await extractTextFromFile(f.url, f.tipo)
        if (extracted) {
          parts.push(`  CONTENIDO: ${extracted}`)
        }
      }
      return parts.join('\n')
    }
    case 'get_announcements': {
      const channel = await prisma.channel.findFirst({
        where: { sectionSubjectId: ssId, nombre: 'Anuncios' }
      })
      if (!channel) return 'No hay canal de anuncios.'
      const msgs = await prisma.message.findMany({
        where: { channelId: channel.id }, orderBy: { createdAt: 'desc' }, take: 10,
        include: { user: { select: { nombre: true } } }
      })
      if (!msgs.length) return 'No hay anuncios.'
      return msgs.map(m => `- ${m.user?.nombre || 'Prof'}: "${m.contenido?.slice(0, 200)}"`).join('\n')
    }
    case 'get_assignments': {
      const assignments = await prisma.assignment.findMany({
        where: { sectionSubjectId: ssId }, orderBy: { fechaLimite: 'asc' }
      })
      if (!assignments.length) return 'No hay tareas.'
      return assignments.map(a =>
        `- ${a.titulo}${a.descripcion ? ': ' + a.descripcion : ''}${a.fechaLimite ? ' - Entrega: ' + new Date(a.fechaLimite).toLocaleDateString('es-ES') : ''}`
      ).join('\n')
    }
    case 'get_quizzes': {
      const quizzes = await prisma.quiz.findMany({
        where: { sectionSubjectId: ssId }, orderBy: { createdAt: 'desc' }
      })
      if (!quizzes.length) return 'No hay quizzes.'
      return quizzes.map(q => `- ${q.titulo}${q.descripcion ? ': ' + q.descripcion : ''} (${q.maxAttempts} intentos)`).join('\n')
    }
    case 'get_professor': {
      const ss = await prisma.sectionSubject.findUnique({
        where: { id: ssId },
        include: { profesor: { select: { nombre: true, email: true } }, subject: { select: { nombre: true } }, section: { select: { codigo: true } } }
      })
      if (!ss?.profesor) return 'Profesor no encontrado.'
      return `Prof. ${ss.profesor.nombre} - ${ss.subject.nombre} (${ss.section.codigo})${ss.profesor.email ? ' - ' + ss.profesor.email : ''}`
    }
    default:
      return `Herramienta "${name}" no encontrada`
  }
}

function detectToolCall(text) {
  try {
    const trimmed = text.trim()
    const match = trimmed.match(/\{[\s\S]*"tool"[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0])
      if (parsed.tool && TOOLS.some(t => t.name === parsed.tool)) {
        return { tool: parsed.tool, args: parsed.args || {} }
      }
    }
  } catch (_) {}
  return null
}

export async function generateAIResponse(messages, sectionSubjectId, question) {
  try {
    const history = messages
      .filter(m => m.isRelevant !== false && !m.isAI && m.contenido)
      .slice(-6)
      .map(m => ({ role: 'user', content: `[Historial] ${m.contenido}` }))

    const askMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: `ID de la materia: ${sectionSubjectId}\nPregunta: ${question || '¿Cuál es el estado actual de la materia?'}` }
    ]

    // Step 1: ask the model — might return tool call JSON or direct answer
    let response = await cfChatCompletion({
      messages: askMessages,
      temperature: 0.7,
      max_tokens: 2048
    })

    // Step 2: check if the model wants to call a tool
    let iterations = 0
    while (iterations < 3 && response) {
      const toolCall = detectToolCall(response)
      if (!toolCall) break

      iterations++
      const toolResult = await executeTool(toolCall.tool, toolCall.args)

      askMessages.push({ role: 'assistant', content: `Llamé a ${toolCall.tool}(${JSON.stringify(toolCall.args)})` })
      askMessages.push({ role: 'user', content: `Resultado de ${toolCall.tool}:\n${toolResult}\n\nResponde la pregunta original basándote en estos datos.` })

      response = await cfChatCompletion({
        messages: askMessages,
        temperature: 0.7,
        max_tokens: 2048
      })
    }

    // If model still returned a tool call instead of text, handle it
    if (response && detectToolCall(response)) {
      return 'He consultado los datos pero no pude formular una respuesta. Intenta ser más específico en tu pregunta.'
    }

    if (!response) return 'Lo siento, no pude procesar tu solicitud.'
    if (response.length > MAX_RESPONSE_CHARS) {
      return response.slice(0, response.lastIndexOf(' ', MAX_RESPONSE_CHARS)) + '\n\n*[Respuesta truncada]*'
    }
    return response
  } catch (error) {
    console.error('AI service error:', error)
    return 'Error al conectar con la IA.'
  }
}
