import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()

function esc(val) {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`
  if (val instanceof Date) return `'${val.toISOString()}'`
  return val
}

function qcols(cols) {
  return cols.map(c => `"${c}"`)
}

async function main() {
  const lines = []
  lines.push('-- SQL generado para poblar Supabase')
  lines.push('-- Ejecutar en: Supabase SQL Editor o con: supabase db query --linked --file seed_supabase.sql')
  lines.push('')

  // 1. Users
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } })
  if (users.length) {
    lines.push('-- Usuarios')
    const cols = ['id', 'nombre', 'cedula', 'password', 'role', 'createdAt']
    for (const u of users) {
      const vals = cols.map(c => esc(u[c]))
      lines.push(`INSERT INTO "User" (${qcols(cols).join(', ')}) VALUES (${vals.join(', ')});`)
    }
    lines.push('')
  }

  // 2. Subjects
  const subjects = await prisma.subject.findMany({ orderBy: { createdAt: 'asc' } })
  if (subjects.length) {
    lines.push('-- Materias')
    const cols = ['id', 'nombre', 'codigo', 'createdAt']
    for (const s of subjects) {
      const vals = cols.map(c => esc(s[c]))
      lines.push(`INSERT INTO "Subject" (${qcols(cols).join(', ')}) VALUES (${vals.join(', ')});`)
    }
    lines.push('')
  }

  // 3. Sections
  const sections = await prisma.section.findMany({ orderBy: { createdAt: 'asc' } })
  if (sections.length) {
    lines.push('-- Secciones')
    const cols = ['id', 'nombre', 'codigo', 'year', 'semester', 'createdAt']
    for (const s of sections) {
      const vals = cols.map(c => esc(s[c]))
      lines.push(`INSERT INTO "Section" (${qcols(cols).join(', ')}) VALUES (${vals.join(', ')});`)
    }
    lines.push('')
  }

  // 4. SectionSubjects
  const sxs = await prisma.sectionSubject.findMany()
  if (sxs.length) {
    lines.push('-- Sección-Materias')
    const cols = ['id', 'sectionId', 'subjectId', 'profesorId', 'createdAt']
    for (const s of sxs) {
      const vals = cols.map(c => esc(s[c]))
      lines.push(`INSERT INTO "SectionSubject" (${qcols(cols).join(', ')}) VALUES (${vals.join(', ')});`)
    }
    lines.push('')
  }

  // 5. Enrollments
  const enrollments = await prisma.enrollment.findMany()
  if (enrollments.length) {
    lines.push('-- Inscripciones')
    const cols = ['id', 'userId', 'sectionSubjectId', 'createdAt']
    for (const e of enrollments) {
      const vals = cols.map(c => esc(e[c]))
      lines.push(`INSERT INTO "Enrollment" (${qcols(cols).join(', ')}) VALUES (${vals.join(', ')});`)
    }
    lines.push('')
  }

  // 6. Channels
  const channels = await prisma.channel.findMany()
  if (channels.length) {
    lines.push('-- Canales')
    const cols = ['id', 'nombre', 'tipo', 'sectionSubjectId', 'createdAt']
    for (const c of channels) {
      const vals = cols.map(c2 => esc(c[c2]))
      lines.push(`INSERT INTO "Channel" (${qcols(cols).join(', ')}) VALUES (${vals.join(', ')});`)
    }
    lines.push('')
  }

  // 7. CalendarEvents
  const events = await prisma.calendarEvent.findMany()
  if (events.length) {
    lines.push('-- Eventos de calendario')
    const cols = ['id', 'titulo', 'descripcion', 'fecha', 'tipo', 'importante', 'sectionSubjectId', 'createdAt']
    for (const e of events) {
      const vals = cols.map(c => esc(e[c]))
      lines.push(`INSERT INTO "CalendarEvent" (${qcols(cols).join(', ')}) VALUES (${vals.join(', ')});`)
    }
    lines.push('')
  }

  // 8. Files
  const files = await prisma.file.findMany()
  if (files.length) {
    lines.push('-- Archivos')
    const cols = ['id', 'nombre', 'url', 'tipo', 'sectionSubjectId', 'uploadedBy', 'createdAt']
    for (const f of files) {
      const vals = cols.map(c => esc(f[c]))
      lines.push(`INSERT INTO "File" (${qcols(cols).join(', ')}) VALUES (${vals.join(', ')});`)
    }
    lines.push('')
  }

  // 9. Quizzes
  const quizzes = await prisma.quiz.findMany()
  if (quizzes.length) {
    lines.push('-- Quizzes')
    const cols = ['id', 'titulo', 'descripcion', 'maxAttempts', 'timeLimit', 'sectionSubjectId', 'createdBy', 'questions', 'createdAt']
    for (const q of quizzes) {
      const vals = cols.map(c => esc(q[c]))
      lines.push(`INSERT INTO "Quiz" (${qcols(cols).join(', ')}) VALUES (${vals.join(', ')});`)
    }
    lines.push('')
  }

  // 10. QuizAttempts
  const attempts = await prisma.quizAttempt.findMany()
  if (attempts.length) {
    lines.push('-- Intentos de quiz')
    const cols = ['id', 'quizId', 'userId', 'answers', 'results', 'score', 'startedAt', 'submittedAt']
    for (const a of attempts) {
      const vals = cols.map(c => esc(a[c]))
      lines.push(`INSERT INTO "QuizAttempt" (${qcols(cols).join(', ')}) VALUES (${vals.join(', ')});`)
    }
    lines.push('')
  }

  // 11. Messages
  const messages = await prisma.message.findMany()
  if (messages.length) {
    lines.push('-- Mensajes')
    const cols = ['id', 'contenido', 'userId', 'channelId', 'fileUrl', 'fileType', 'fileName', 'isRelevant', 'isAI', 'createdAt']
    for (const m of messages) {
      const vals = cols.map(c => esc(m[c]))
      lines.push(`INSERT INTO "Message" (${qcols(cols).join(', ')}) VALUES (${vals.join(', ')});`)
    }
    lines.push('')
  }

  const output = lines.join('\n')
  const filePath = 'prisma/seed_supabase.sql'
  fs.writeFileSync(filePath, output, 'utf-8')
  console.log(`✅ SQL generado: ${filePath} (${output.length} bytes, ${lines.length - 2} líneas SQL)`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
