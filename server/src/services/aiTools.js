import prisma from '../lib/prisma.js'

export const AI_TOOLS = [
  {
    name: 'search_calendar_events',
    description: 'Busca eventos del calendario por palabra clave en el título o descripción',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Palabra clave para buscar en eventos' }
      },
      required: ['query']
    }
  },
  {
    name: 'get_upcoming_events',
    description: 'Obtiene los próximos eventos (default 90 días, si no hay expande a todos los futuros)',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Número de días hacia adelante (default 7)' }
      }
    }
  },
  {
    name: 'list_subject_files',
    description: 'Lista todos los archivos y materiales disponibles de la materia',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_file_details',
    description: 'Obtiene detalles de un archivo específico incluyendo tipo y fecha de subida',
    parameters: {
      type: 'object',
      properties: {
        fileId: { type: 'string', description: 'ID del archivo a consultar' }
      },
      required: ['fileId']
    }
  },
  {
    name: 'list_assignments',
    description: 'Lista todas las tareas de la materia con su estado',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_assignment_details',
    description: 'Obtiene detalles completos de una tarea incluyendo cantidad de entregas',
    parameters: {
      type: 'object',
      properties: {
        assignmentId: { type: 'string', description: 'ID de la tarea' }
      },
      required: ['assignmentId']
    }
  },
  {
    name: 'get_recent_announcements',
    description: 'Obtiene los anuncios más recientes de la materia',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Cantidad máxima de anuncios (default 10)' }
      }
    }
  },
  {
    name: 'get_quiz_list',
    description: 'Lista los quizzes disponibles de la materia con sus detalles',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_professor_info',
    description: 'Obtiene información del profesor de la materia',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'search_section_subject_info',
    description: 'Busca información general de la materia, sección, fechas importantes y contenido',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Tema o consulta sobre la materia' }
      }
    }
  }
]

export async function executeTool(sectionSubjectId, toolName, args = {}) {
  const ss = await prisma.sectionSubject.findUnique({
    where: { id: sectionSubjectId },
    include: { subject: true, section: true, profesor: { select: { id: true, nombre: true, email: true } } }
  })
  if (!ss) return 'Materia no encontrada'

  switch (toolName) {
    case 'search_calendar_events': {
      const events = await prisma.$queryRawUnsafe(
        "SELECT * FROM CalendarEvent WHERE sectionSubjectId = ? AND (titulo LIKE ? OR descripcion LIKE ?) ORDER BY fecha ASC LIMIT 20",
        sectionSubjectId, `%${args.query}%`, `%${args.query}%`
      )
      if (!events.length) return 'No se encontraron eventos con ese criterio'
      return events.map(e =>
        `${e.titulo} (${e.tipo}): ${new Date(e.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}${e.descripcion ? ' — ' + e.descripcion : ''}${e.importante ? ' [IMPORTANTE]' : ''}`
      ).join('\n')
    }

 case 'get_upcoming_events': {
      const requestedDays = args.days || 90
      const now = Date.now()
      const future = now + (requestedDays * 86400000)

      let events = await prisma.$queryRawUnsafe(
        'SELECT * FROM CalendarEvent WHERE sectionSubjectId = ? AND fecha >= ? AND fecha <= ? ORDER BY fecha ASC',
        sectionSubjectId, now, future
      )

      // If no events and default was used, expand to show all future events
      if (!events.length && !args.days) {
        events = await prisma.$queryRawUnsafe(
          'SELECT * FROM CalendarEvent WHERE sectionSubjectId = ? AND fecha >= ? ORDER BY fecha ASC',
          sectionSubjectId, now
        )
        if (events.length) {
          return 'EVENTOS FUTUROS (todos):\n' + events.map(e =>
            `• ${e.titulo} — ${new Date(e.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} (${e.tipo})${e.importante ? ' ⭐' : ''}${e.descripcion ? ' — ' + e.descripcion : ''}`
          ).join('\n')
        }
        return 'No hay eventos futuros registrados en esta materia'
      }

      if (!events.length) return `No hay eventos en los próximos ${requestedDays} días`
      return events.map(e =>
        `• ${e.titulo} — ${new Date(e.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} (${e.tipo})${e.importante ? ' ⭐' : ''}${e.descripcion ? ' — ' + e.descripcion : ''}`
      ).join('\n')
    }

    case 'list_subject_files': {
      const files = await prisma.file.findMany({
        where: { sectionSubjectId },
        orderBy: { createdAt: 'desc' }
      })
      if (!files.length) return 'No hay archivos disponibles en esta materia'
      return files.map(f =>
        `[${f.id.slice(0, 8)}] ${f.nombre} — ${f.tipo} — subido ${new Date(f.createdAt).toLocaleDateString('es-ES')}`
      ).join('\n')
    }

    case 'get_file_details': {
      const file = await prisma.file.findFirst({
        where: { id: { startsWith: args.fileId?.slice(0, 8) } },
        include: { user: { select: { nombre: true } } }
      })
      if (!file) return 'Archivo no encontrado'
      return `📄 ${file.nombre}\nTipo: ${file.tipo}\nSubido por: ${file.user?.nombre}\nFecha: ${new Date(file.createdAt).toLocaleDateString('es-ES')}\nURL: ${file.url}`
    }

    case 'list_assignments': {
      const assignments = await prisma.assignment.findMany({
        where: { sectionSubjectId },
        include: { _count: { select: { submissions: true } } },
        orderBy: { createdAt: 'desc' }
      })
      if (!assignments.length) return 'No hay tareas asignadas'
      return assignments.map(a => {
        const fecha = a.fechaLimite ? ` — Entrega: ${new Date(a.fechaLimite).toLocaleDateString('es-ES')}` : ''
        const entregas = ` (${a._count.submissions} entregas)`
        return `• ${a.titulo}${fecha}${entregas}${a.descripcion ? '\n  ' + a.descripcion : ''}`
      }).join('\n')
    }

    case 'get_assignment_details': {
      const assignment = await prisma.assignment.findFirst({
        where: { id: { startsWith: args.assignmentId?.slice(0, 8) } },
        include: { _count: { select: { submissions: true } } }
      })
      if (!assignment) return 'Tarea no encontrada'
      return `📋 ${assignment.titulo}\n${assignment.descripcion || 'Sin descripción'}\nEntrega: ${assignment.fechaLimite ? new Date(assignment.fechaLimite).toLocaleDateString('es-ES') : 'Sin fecha límite'}\nEntregas recibidas: ${assignment._count.submissions}`
    }

    case 'get_recent_announcements': {
      const limit = args.limit || 10
      const channel = await prisma.channel.findFirst({
        where: { sectionSubjectId, nombre: 'Anuncios' },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: { user: { select: { nombre: true, role: true } } }
          }
        }
      })
      if (!channel?.messages.length) return 'No hay anuncios aún'
      return channel.messages.map(m =>
        `• ${m.user?.nombre} (${m.user?.role === 'PROFESOR' ? 'Profesor' : 'Estudiante'}): "${m.contenido}" — ${new Date(m.createdAt).toLocaleDateString('es-ES')}`
      ).join('\n')
    }

    case 'get_quiz_list': {
      const quizzes = await prisma.quiz.findMany({
        where: { sectionSubjectId },
        select: { id: true, titulo: true, descripcion: true, maxAttempts: true, timeLimit: true },
        orderBy: { createdAt: 'desc' }
      })
      if (!quizzes.length) return 'No hay quizzes disponibles'
      return quizzes.map(q =>
        `• ${q.titulo}${q.descripcion ? ': ' + q.descripcion : ''} — ${q.maxAttempts} intentos${q.timeLimit ? ', ' + q.timeLimit + ' min' : ''}`
      ).join('\n')
    }

    case 'get_professor_info': {
      return `Profesor: ${ss.profesor?.nombre}${ss.profesor?.email ? ' — ' + ss.profesor.email : ''}`
    }

    case 'search_section_subject_info': {
      const query = args.query?.toLowerCase() || ''
      const results = []

      // Buscar en archivos
      const files = await prisma.file.findMany({
        where: { sectionSubjectId, OR: [{ nombre: { contains: query } }, { tipo: { contains: query } }] },
        take: 5
      })
      if (files.length) {
        results.push('ARCHIVOS RELACIONADOS:')
        files.forEach(f => results.push(`  - ${f.nombre} (${f.tipo})`))
      }

      // Buscar en eventos
      const events = await prisma.calendarEvent.findMany({
        where: { sectionSubjectId, OR: [{ titulo: { contains: query } }, { descripcion: { contains: query } }] },
        take: 5
      })
      if (events.length) {
        results.push('EVENTOS RELACIONADOS:')
        events.forEach(e => results.push(`  - ${e.titulo}: ${new Date(e.fecha).toLocaleDateString('es-ES')}`))
      }

      // Buscar en anuncios
      const channel = await prisma.channel.findFirst({
        where: { sectionSubjectId, nombre: 'Anuncios' },
        include: { messages: { where: { contenido: { contains: query } }, take: 5, orderBy: { createdAt: 'desc' } } }
      })
      if (channel?.messages.length) {
        results.push('ANUNCIOS RELACIONADOS:')
        channel.messages.forEach(m => results.push(`  - "${m.contenido.slice(0, 100)}..."`))
      }

      if (!results.length) return 'No se encontró información relacionada con tu consulta'
      return results.join('\n')
    }

    default:
      return `Herramienta no reconocida: ${toolName}`
  }
}
