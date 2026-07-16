import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const CARRERAS = [
  'Ingeniería Informática', 'Ingeniería Civil', 'Ingeniería Eléctrica',
  'Ingeniería Industrial', 'Ingeniería Mecánica', 'Ingeniería Química',
  'Administración de Empresas', 'Contaduría Pública', 'Educación Integral',
  'Medicina', 'Enfermería', 'Arquitectura'
]

const SEMESTRES = ['1er Semestre', '2do Semestre', '3er Semestre', '4to Semestre', '5to Semestre', '6to Semestre', '7mo Semestre', '8vo Semestre']

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

async function main() {
  console.log('🌱 Agregando datos de prueba...\n')

  // 1. Actualizar perfiles de usuarios
  console.log('📝 Actualizando perfiles...')
  const users = await prisma.user.findMany()
  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: `${user.nombre.toLowerCase().replace(/\s+/g, '.')}@uneg.edu.ve`,
        telefono: `0412-${String(Math.floor(1000000 + Math.random() * 9000000))}`,
        carrera: pick(CARRERAS),
        semestre: pick(SEMESTRES),
        bio: `${user.role === 'PROFESOR' ? 'Profesor' : 'Estudiante'} de ${pick(CARRERAS)} en la UNEG.`
      }
    })
  }
  console.log(`   ✓ ${users.length} usuarios actualizados`)

  // 2. Crear asignaciones (tareas) para cada SectionSubject
  console.log('\n📋 Creando tareas...')
  const sectionSubjects = await prisma.sectionSubject.findMany({
    include: { subject: true, section: true, enrollments: { select: { userId: true } } }
  })

  let totalAsignaciones = 0
  const assignmentIds = []

  for (const ss of sectionSubjects) {
    const studentIds = ss.enrollments.map(e => e.userId)
    if (studentIds.length === 0) continue

    const numTareas = 1 + Math.floor(Math.random() * 2)
    for (let i = 0; i < numTareas; i++) {
      const titulos = [
        `Ejercicios ${ss.subject.nombre} - Semana ${i + 1}`,
        `Práctica de ${ss.subject.nombre}`,
        `Proyecto ${ss.subject.nombre} - Módulo ${i + 1}`,
        `Investigación: ${ss.subject.nombre}`,
        `Taller de ${ss.subject.nombre} #${i + 1}`
      ]
      const descripciones = [
        'Resolver los ejercicios del capítulo correspondiente. Entregar en PDF.',
        'Realizar la práctica asignada en clase. Incluir procedimientos.',
        'Desarrollar el proyecto siguiendo las pautas establecidas.',
        'Investigar y redactar un informe sobre el tema asignado.',
        'Completar el taller con los ejercicios propuestos.'
      ]

      const fechaLimite = randomDate(new Date('2026-08-01'), new Date('2026-12-15'))
      const assignment = await prisma.assignment.create({
        data: {
          sectionSubjectId: ss.id,
          titulo: pick(titulos),
          descripcion: pick(descripciones),
          fechaLimite: Math.random() > 0.3 ? fechaLimite : null
        }
      })
      assignmentIds.push({ id: assignment.id, sectionSubjectId: ss.id, studentIds })

      // Crear submissions para algunos estudiantes (30-60%)
      const numSubmissions = Math.floor(studentIds.length * (0.3 + Math.random() * 0.3))
      const shuffled = [...studentIds].sort(() => Math.random() - 0.5)
      const submittingStudents = shuffled.slice(0, numSubmissions)

      for (const userId of submittingStudents) {
        const nota = Math.random() > 0.7 ? Math.floor(Math.random() * 101) : null
        await prisma.assignmentSubmission.create({
          data: {
            assignmentId: assignment.id,
            userId,
            archivoUrl: `/uploads/assignments/sample-${Math.floor(Math.random() * 100)}.pdf`,
            comentario: Math.random() > 0.5 ? 'Aquí está mi entrega, profesor.' : null,
            nota,
            feedback: nota !== null
              ? (nota >= 70 ? 'Buen trabajo.' : nota >= 50 ? 'Puedes mejorar, revisa los errores.' : 'Debes esforzarte más. Repasa los conceptos.')
              : null,
            gradedAt: nota !== null ? new Date() : null
          }
        })
      }
      totalAsignaciones++
    }
  }
  console.log(`   ✓ ${totalAsignaciones} tareas creadas`)

  // 3. Crear notificaciones de ejemplo
  console.log('\n🔔 Creando notificaciones de ejemplo...')
  const sampleUsers = users.slice(0, 20)
  for (const user of sampleUsers) {
    const tipos = ['MENSAJE', 'ANUNCIO', 'TAREA', 'QUIZ', 'EVENTO']
    const numNotifs = 2 + Math.floor(Math.random() * 4)
    for (let i = 0; i < numNotifs; i++) {
      const tipo = pick(tipos)
      const titulos = {
        MENSAJE: 'Nuevo mensaje en General',
        ANUNCIO: 'Nuevo anuncio importante',
        TAREA: 'Nueva tarea disponible',
        QUIZ: 'Nuevo quiz publicado',
        EVENTO: 'Próximo evento académico'
      }
      const bodies = {
        MENSAJE: 'Tienes un nuevo mensaje en uno de tus canales.',
        ANUNCIO: 'El profesor ha publicado un anuncio importante.',
        TAREA: 'Se ha habilitado una nueva tarea para entregar.',
        QUIZ: 'Un nuevo quiz está disponible para realizar.',
        EVENTO: 'Se ha agregado un evento al calendario.'
      }
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: tipo,
          title: titulos[tipo],
          body: bodies[tipo],
          read: Math.random() > 0.4,
          createdAt: randomDate(new Date('2026-07-01'), new Date())
        }
      })
    }
  }
  console.log('   ✓ Notificaciones de ejemplo creadas')

  // 4. Crear intentos de quizzes para algunos estudiantes (más data en notas)
  console.log('\n📝 Creando intentos de quizzes adicionales...')
  const quizzes = await prisma.quiz.findMany({ select: { id: true, sectionSubjectId: true } })
  let quizAttemptsCount = 0

  for (const quiz of quizzes) {
    const enrollments = await prisma.enrollment.findMany({
      where: { sectionSubjectId: quiz.sectionSubjectId },
      take: 15,
      select: { userId: true }
    })

    for (const enrollment of enrollments) {
      if (Math.random() > 0.4) {
        const score = Math.floor(Math.random() * 101)
        await prisma.quizAttempt.create({
          data: {
            quizId: quiz.id,
            userId: enrollment.userId,
            answers: '[]',
            results: '[]',
            score,
            startedAt: randomDate(new Date('2026-07-01'), new Date()),
            submittedAt: randomDate(new Date('2026-07-01'), new Date())
          }
        })
        quizAttemptsCount++
      }
    }
  }
  console.log(`   ✓ ${quizAttemptsCount} intentos de quizzes creados`)

  console.log('\n✅ Datos de prueba agregados exitosamente!')
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
