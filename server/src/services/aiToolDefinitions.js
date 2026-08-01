import prisma from '../lib/prisma.js'

export const AI_TOOLS = [
  {
    name: 'get_events',
    description: 'Obtiene los próximos eventos del calendario de la materia (exámenes, entregas, actividades, etc.)',
    parameters: {
      type: 'object',
      properties: {
        sectionSubjectId: { type: 'string' }
      },
      required: ['sectionSubjectId']
    }
  },
  {
    name: 'get_files',
    description: 'Lista los archivos y materiales disponibles en la materia',
    parameters: {
      type: 'object',
      properties: {
        sectionSubjectId: { type: 'string' }
      },
      required: ['sectionSubjectId']
    }
  },
  {
    name: 'get_announcements',
    description: 'Obtiene los anuncios recientes del profesor en la materia',
    parameters: {
      type: 'object',
      properties: {
        sectionSubjectId: { type: 'string' }
      },
      required: ['sectionSubjectId']
    }
  },
  {
    name: 'get_assignments',
    description: 'Lista las tareas y trabajos pendientes de la materia',
    parameters: {
      type: 'object',
      properties: {
        sectionSubjectId: { type: 'string' }
      },
      required: ['sectionSubjectId']
    }
  },
  {
    name: 'get_quizzes',
    description: 'Lista los quizzes y evaluaciones disponibles en la materia',
    parameters: {
      type: 'object',
      properties: {
        sectionSubjectId: { type: 'string' }
      },
      required: ['sectionSubjectId']
    }
  },
  {
    name: 'get_professor',
    description: 'Obtiene el nombre y correo del profesor de la materia',
    parameters: {
      type: 'object',
      properties: {
        sectionSubjectId: { type: 'string' }
      },
      required: ['sectionSubjectId']
    }
  }
]

export async function executeTool(name, args) {
  const ssId = args.sectionSubjectId
  if (!ssId) return 'Error: sectionSubjectId requerido'

  switch (name) {
    case 'get_events': {
      const events = await prisma.calendarEvent.findMany({
        where: { sectionSubjectId: ssId, fecha: { gte: new Date() } },
        orderBy: { fecha: 'asc' }
      })
      if (!events.length) return 'No hay eventos próximos en esta materia.'
      return events.map(e =>
        `• ${e.titulo} — ${new Date(e.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} (${e.tipo})${e.importante ? ' ⭐IMPORTANTE' : ''}${e.descripcion ? ' — ' + e.descripcion : ''}`
      ).join('\n')
    }

    case 'get_files': {
      const files = await prisma.file.findMany({
        where: { sectionSubjectId: ssId },
        orderBy: { createdAt: 'desc' }
      })
      if (!files.length) return 'No hay archivos subidos en esta materia.'
      return files.map(f => `• ${f.nombre} (${f.tipo}) — ${new Date(f.createdAt).toLocaleDateString('es-ES')}`).join('\n')
    }

    case 'get_announcements': {
      const channel = await prisma.channel.findFirst({
        where: { sectionSubjectId: ssId, nombre: 'Anuncios' }
      })
      if (!channel) return 'No hay canal de anuncios en esta materia.'
      const messages = await prisma.message.findMany({
        where: { channelId: channel.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { nombre: true } } }
      })
      if (!messages.length) return 'No hay anuncios en esta materia.'
      return messages.map(m =>
        `• ${m.user?.nombre || 'Profesor'}: "${m.contenido.slice(0, 200)}" — ${new Date(m.createdAt).toLocaleDateString('es-ES')}`
      ).join('\n')
    }

    case 'get_assignments': {
      const assignments = await prisma.assignment.findMany({
        where: { sectionSubjectId: ssId },
        orderBy: { fechaLimite: 'asc' }
      })
      if (!assignments.length) return 'No hay tareas pendientes en esta materia.'
      return assignments.map(a =>
        `• ${a.titulo}${a.descripcion ? ': ' + a.descripcion : ''} — Entrega: ${a.fechaLimite ? new Date(a.fechaLimite).toLocaleDateString('es-ES') : 'Sin fecha límite'}`
      ).join('\n')
    }

    case 'get_quizzes': {
      const quizzes = await prisma.quiz.findMany({
        where: { sectionSubjectId: ssId },
        orderBy: { createdAt: 'desc' }
      })
      if (!quizzes.length) return 'No hay quizzes disponibles en esta materia.'
      return quizzes.map(q =>
        `• ${q.titulo}${q.descripcion ? ': ' + q.descripcion : ''} — ${q.maxAttempts} intento(s)${q.timeLimit ? ', ' + q.timeLimit + ' min' : ''}`
      ).join('\n')
    }

    case 'get_professor': {
      const ss = await prisma.sectionSubject.findUnique({
        where: { id: ssId },
        include: {
          profesor: { select: { nombre: true, email: true } },
          subject: { select: { nombre: true } },
          section: { select: { codigo: true } }
        }
      })
      if (!ss?.profesor) return 'No se encontró información del profesor.'
      return `Prof. ${ss.profesor.nombre} — ${ss.subject.nombre} (${ss.section.codigo})${ss.profesor.email ? ' — ' + ss.profesor.email : ''}`
    }

    default:
      return `Herramienta desconocida: ${name}`
  }
}
