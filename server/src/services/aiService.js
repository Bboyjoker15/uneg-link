import prisma from '../lib/prisma.js'
import { cfChatCompletion } from './cfAiService.js'
import { executeTool } from './aiTools.js'

const SYSTEM_PROMPT = `Eres UnegAI, un asistente académico universitario inteligente. Ayudas a estudiantes y profesores.

CAPACIDADES:
- Explicar conceptos académicos (programación, matemáticas, física, etc.)
- Ayudar con tareas, ejercicios y proyectos
- Consultar información real de la materia que se te proporciona en cada mensaje

COMPORTAMIENTO:
- Los datos entre [DATOS DE LA MATERIA] y [/DATOS] son información real de la base de datos. Úsalos como fuente.
- NUNCA menciones "[DATOS DE LA MATERIA]" ni "[/DATOS]" en tu respuesta. Son marcadores internos invisibles para el usuario.
- Presenta la información como si la hubieras consultado tú mismo.
- Sé formal, profesional y didáctico.
- Si preguntan algo fuera del ámbito académico, indícalo cordialmente.
- No inventes fechas ni datos si no los tienes.`

const MAX_RESPONSE_CHARS = 3000

const TOOL_KEYWORDS = {
  'list_subject_files': ['archivo', 'archivos', 'material', 'materiales', 'pdf', 'documento', 'documentos', 'guía', 'guias', 'subido', 'subidos'],
  'get_upcoming_events': ['próximo', 'próximos', 'evento', 'eventos', 'calendario', 'semana', 'fecha', 'fechas', 'cuándo', 'cuando', 'examen', 'exámenes', 'entrega', 'entregas', 'parcial', 'final'],
  'search_calendar_events': ['examen', 'parcial', 'evaluación', 'evaluacion', 'exposición', 'exposicion', 'taller'],
  'list_assignments': ['tarea', 'tareas', 'asignación', 'asignaciones', 'entregar', 'pendiente', 'pendientes'],
  'get_recent_announcements': ['anuncio', 'anuncios', 'aviso', 'avisos', 'comunicado', 'comunicados', 'novedad', 'novedades'],
  'get_quiz_list': ['quiz', 'quizzes', 'cuestionario', 'cuestionarios', 'evaluación', 'prueba', 'pruebas', 'test'],
  'get_professor_info': ['profesor', 'profesora', 'profe', 'docente', 'enseña', 'dicta', 'correo del prof']
}

function detectTools(question) {
  const q = question.toLowerCase()
  const tools = new Set()

  for (const [tool, keywords] of Object.entries(TOOL_KEYWORDS)) {
    if (keywords.some(kw => q.includes(kw))) {
      tools.add(tool)
    }
  }

  // Always add general info search for context-rich questions
  if (tools.size === 0 || q.length > 30) {
    // Questions that might benefit from context
    const contextHints = ['materia', 'clase', 'curso', 'sección', 'seccion', 'semana', 'horario', 'tema']
    if (contextHints.some(h => q.includes(h)) || q.split(' ').length > 5) {
      tools.add('search_section_subject_info')
    }
  }

  // If asking about files or materials, also get general info
  if (tools.has('list_subject_files')) {
    tools.add('get_upcoming_events')
  }

  return [...tools]
}

function truncateResponse(content) {
  if (!content) return null
  if (content.length > MAX_RESPONSE_CHARS) {
    return content.slice(0, content.lastIndexOf(' ', MAX_RESPONSE_CHARS)) + '\n\n*[Respuesta truncada]*'
  }
  return content
}

export async function generateAIResponse(messages, sectionSubjectId, question) {
  try {
    const sectionSubject = await prisma.sectionSubject.findUnique({
      where: { id: sectionSubjectId },
      include: { subject: true, section: true }
    })

    if (!sectionSubject) return 'Error: Materia no encontrada.'

    const subjectName = `${sectionSubject.subject.nombre} - ${sectionSubject.section.codigo}`

    // Detect and execute tools
    const toolsToRun = detectTools(question)
    let toolResults = []

    if (toolsToRun.length > 0) {
      const results = await Promise.all(
        toolsToRun.map(tool => executeTool(sectionSubjectId, tool, { query: question }))
      )
      toolResults = results.map((r, i) => `--- ${toolsToRun[i].replace(/_/g, ' ').toUpperCase()} ---\n${r}`)
    }

    // Build conversation
    const contextBlock = toolResults.length > 0
      ? `\n\n[DATOS DE LA MATERIA — ${subjectName} — consultados en tiempo real]\n${toolResults.join('\n\n')}\n[/DATOS]`
      : ''

    const conversationMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages
        .filter(m => m.isRelevant !== false && !m.isAI)
        .slice(-10)
        .map(m => ({ role: 'user', content: m.contenido })),
      { role: 'user', content: `${question}${contextBlock}` }
    ]

    const result = await cfChatCompletion({
      messages: conversationMessages,
      temperature: 0.7,
      max_tokens: 2048
    })

    const content = result?.response || result?.choices?.[0]?.message?.content || null

    return truncateResponse(content) || 'Lo siento, no pude procesar tu solicitud.'
  } catch (error) {
    console.error('AI service error:', error)
    return 'Error al conectar con la IA. Intenta de nuevo más tarde.'
  }
}
