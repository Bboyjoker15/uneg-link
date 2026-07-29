import Groq from 'groq-sdk'
import config from '../config.js'
import prisma from '../lib/prisma.js'

const groq = new Groq({ apiKey: config.groqApiKey })

const SYSTEM_PROMPT = `Eres un asistente académico universitario llamado UnegAI. 
Tu función es ayudar a estudiantes y profesores en el contexto de una materia universitaria.

CAPACIDADES:
- Responder preguntas sobre conceptos académicos usando tu conocimiento general (programación, matemáticas, física, etc.)
- Explicar temas y resolver dudas con ejemplos claros
- Ayudar con tareas, ejercicios y proyectos
- Proveer información de la materia: archivos, eventos, anuncios, fechas de exámenes y entregas
- Responder preguntas sobre materiales y documentos subidos

REGLAS:
- Ignora mensajes de saludo, conversaciones casuales o spam.
- Mantén un tono formal, profesional y didáctico.
- Para preguntas académicas generales ("¿qué es un puntero?", "¿cómo funciona una pila?"), responde usando tu conocimiento sin restringirte al contexto.
- Cuando tengas información de la materia (archivos, eventos, anuncios) úsala como referencia prioritariamente.
- Si la pregunta es sobre un tema muy específico o actual que no conoces, sugiérele al estudiante que consulte con el profesor o busque en los materiales de la materia.
- Si el estudiante pregunta algo fuera del ámbito académico, indícale cordialmente que no puedes ayudar con ese tema.`

const MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-20b']
const MAX_RESPONSE_CHARS = 3000

export async function generateAIResponse(messages, sectionSubjectId, question) {
  try {
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

    const contextParts = []

    if (sectionSubject) {
      const subjectName = `${sectionSubject.subject.nombre} - ${sectionSubject.section.codigo}`
      contextParts.push(`INFORMACIÓN DE LA MATERIA:\nNombre: ${subjectName}\nCódigo: ${sectionSubject.subject.codigo}\nSección: ${sectionSubject.section.codigo}`)

      if (sectionSubject.files.length > 0) {
        contextParts.push('\nDOCUMENTOS Y MATERIALES SUBIDOS:\n' +
          sectionSubject.files.map(f => `- ${f.nombre} (${f.tipo})`).join('\n'))
      }

      if (sectionSubject.events.length > 0) {
        contextParts.push('\nEVENTOS DEL CALENDARIO:\n' +
          sectionSubject.events.map(e =>
            `- ${e.titulo}: ${new Date(e.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} (${e.tipo})${e.descripcion ? ' - ' + e.descripcion : ''}`
          ).join('\n'))
      }

      const announcements = sectionSubject.channels[0]?.messages || []
      if (announcements.length > 0) {
        contextParts.push('\nANUNCIOS RECIENTES:\n' +
          announcements.map(a => `- ${a.user?.nombre}: "${a.contenido}"`).join('\n'))
      }

      if (sectionSubject.quizzes?.length > 0) {
        contextParts.push('\nQUIZZES DISPONIBLES:\n' +
          sectionSubject.quizzes.map(q => `- "${q.titulo}": ${q.descripcion || 'sin descripción'} (${q.maxAttempts} intentos máx)`).join('\n'))
      }
    }

    const relevantMessages = messages
      .filter(m => m.isRelevant !== false && !m.isAI)
      .slice(-25)

    if (relevantMessages.length > 0) {
      contextParts.push('\nHISTORIAL DE LA CONVERSACIÓN:\n' +
        relevantMessages.map(m => `${m.user?.nombre || 'Usuario'}: ${m.contenido}`).join('\n'))
    }

    const fullContext = contextParts.join('\n\n')

    for (const model of MODELS) {
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `${fullContext}\n\n---\nPregunta del estudiante: ${question || '¿Cuál es el estado actual de la materia?'}\n\nResponde la pregunta del estudiante de manera clara y didáctica. Usa la información de la materia como referencia si es relevante, pero también puedes usar tu conocimiento general para explicar conceptos académicos. Si la pregunta no es académica, indícale cordialmente que no puedes ayudar.` }
          ],
          model,
          temperature: 0.7,
          max_tokens: 2048
        })

        let content = completion.choices[0]?.message?.content || 'Lo siento, no pude procesar tu solicitud.'
        if (content.length > MAX_RESPONSE_CHARS) {
          content = content.slice(0, content.lastIndexOf(' ', MAX_RESPONSE_CHARS)) + '\n\n*[Respuesta truncada por límite de caracteres]*'
        }
        return content
      } catch (error) {
        console.error(`Groq API error with model ${model}:`, error.message, error.status)
      }
    }

    return 'Error al conectar con la IA. Verifica tu API key y conexión a internet.'
  } catch (error) {
    console.error('AI service error:', error)
    return 'Error al preparar el contexto para la IA.'
  }
}
