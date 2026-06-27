import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const PROFESORES = [
  'Carlos Méndez', 'María Fernández', 'José Rodríguez', 'Ana Martínez',
  'Luis García', 'Carmen López', 'Jorge Hernández', 'Rosa González',
  'Miguel Torres', 'Sara Pérez', 'Ricardo Silva', 'Patricia Medina',
  'Eduardo Rojas', 'Diana Castillo', 'Alberto Cruz', 'Mónica Flores',
  'Fernando Vargas', 'Laura Sánchez', 'Guillermo Morales', 'Elena Díaz',
  'Héctor Ruiz', 'Teresa Aguilar', 'Rafael Romero', 'Silvia Navarro',
  'Oscar Contreras', 'Marta Jiménez', 'Víctor Ramírez', 'Carolina Peña',
  'Manuel Herrera', 'Adriana Soto', 'Pablo Delgado', 'Valentina Gil',
  'Andrés Guzmán', 'Camila Vega', 'Santiago Rivas', 'Gabriela Paredes',
  'Diego León', 'Mariana Brito', 'Javier Campos', 'Natalia Ferrer'
]

const ESTUDIANTE_NOMBRES = {
  nombres: [
    'Luis', 'María', 'Pedro', 'Ana', 'Diego', 'Sofía', 'Andrés', 'Valentina',
    'Santiago', 'Camila', 'Javier', 'Gabriela', 'Fernando', 'Isabella',
    'Miguel', 'Luciana', 'Carlos', 'Victoria', 'José', 'Martina',
    'Rafael', 'Paula', 'Daniel', 'Julieta', 'Alejandro', 'Carolina',
    'Manuel', 'Andrea', 'Alberto', 'Daniela', 'Ricardo', 'Sara',
    'Eduardo', 'Valeria', 'Cristian', 'Laura', 'Moisés', 'Natalia',
    'Héctor', 'Mariana', 'Iván', 'Elena', 'César', 'Francisca',
    'Raúl', 'Mercedes', 'Tadeo', 'Rosa', 'Emilio', 'Julia'
  ],
  apellidos: [
    'González', 'Rodríguez', 'Pérez', 'López', 'Martínez', 'García',
    'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivero', 'Colina',
    'Rivas', 'Castillo', 'Romero', 'Alvarado', 'Moreno', 'Hernández',
    'Jiménez', 'Vásquez', 'Mendoza', 'Paredes', 'Reyes', 'Acosta',
    'Contreras', 'Navarro', 'Figueroa', 'Medina', 'Delgado', 'Carrillo',
    'Guevara', 'Cordero', 'Campos', 'Ferrer', 'Machado', 'Brito',
    'León', 'Zambrano', 'Salazar', 'Aponte', 'Linares', 'Cabeza',
    'Velásquez', 'Quintero', 'Arias', 'Blanco', 'Cárdenas', 'Ortiz',
    'Núñez', 'Castro', 'Vargas', 'Rojas', 'Vera', 'Márquez',
    'Molina', 'Bravo', 'Álvarez', 'Gil', 'Cabrera', 'Guiñán'
  ]
}

const MATERIAS = [
  { codigo: 'MAT-101', nombre: 'Matemáticas I' },
  { codigo: 'MAT-102', nombre: 'Matemáticas II' },
  { codigo: 'FIS-101', nombre: 'Física I' },
  { codigo: 'FIS-102', nombre: 'Física II' },
  { codigo: 'PRO-101', nombre: 'Programación I' },
  { codigo: 'PRO-102', nombre: 'Programación II' },
  { codigo: 'ALG-101', nombre: 'Álgebra Lineal' },
  { codigo: 'EST-101', nombre: 'Estadística' },
  { codigo: 'QUI-101', nombre: 'Química General' },
  { codigo: 'ING-101', nombre: 'Inglés Técnico' },
  { codigo: 'ELE-101', nombre: 'Electrónica Básica' },
  { codigo: 'RED-101', nombre: 'Redes de Computadoras' }
]

const SECCIONES = [
  { codigo: 'SEC-A', nombre: 'Sección A' },
  { codigo: 'SEC-B', nombre: 'Sección B' },
  { codigo: 'SEC-C', nombre: 'Sección C' },
  { codigo: 'SEC-D', nombre: 'Sección D' },
  { codigo: 'SEC-E', nombre: 'Sección E' },
  { codigo: 'SEC-F', nombre: 'Sección F' },
  { codigo: 'SEC-G', nombre: 'Sección G' },
  { codigo: 'SEC-H', nombre: 'Sección H' }
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function main() {
  console.log('🌱 Iniciando seed masivo...')

  const password = await bcrypt.hash('123456', 10)

  await prisma.quizAttempt.deleteMany()
  await prisma.quiz.deleteMany()
  await prisma.message.deleteMany()
  await prisma.channel.deleteMany()
  await prisma.calendarEvent.deleteMany()
  await prisma.file.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.sectionSubject.deleteMany()
  await prisma.section.deleteMany()
  await prisma.subject.deleteMany()
  await prisma.user.deleteMany()

  const profesorUsers = []
  for (let i = 0; i < PROFESORES.length; i++) {
    const nombre = PROFESORES[i]
    const cedula = `V-${20000000 + i}`
    const user = await prisma.user.create({
      data: { nombre, cedula, password, role: 'PROFESOR' }
    })
    profesorUsers.push(user)
  }
  console.log(`✅ ${profesorUsers.length} profesores creados`)

  const seedEstudiantes = []

  for (let i = 0; i < 50; i++) {
    const nombre = ESTUDIANTE_NOMBRES.nombres[i % ESTUDIANTE_NOMBRES.nombres.length]
    const apellido1 = ESTUDIANTE_NOMBRES.apellidos[i % ESTUDIANTE_NOMBRES.apellidos.length]
    const apellido2 = ESTUDIANTE_NOMBRES.apellidos[(i + 7) % ESTUDIANTE_NOMBRES.apellidos.length]
    const nombreCompleto = `${nombre} ${apellido1} ${apellido2}`
    const cedulaNum = 30100000 + i
    seedEstudiantes.push({ nombre: nombreCompleto, cedula: `V-${cedulaNum}` })
  }

  for (let i = 0; i < 450; i++) {
    const nombre = ESTUDIANTE_NOMBRES.nombres[Math.floor(Math.random() * ESTUDIANTE_NOMBRES.nombres.length)]
    const apellido1 = ESTUDIANTE_NOMBRES.apellidos[Math.floor(Math.random() * ESTUDIANTE_NOMBRES.apellidos.length)]
    const apellido2 = ESTUDIANTE_NOMBRES.apellidos[Math.floor(Math.random() * ESTUDIANTE_NOMBRES.apellidos.length)]
    const nombreCompleto = `${nombre} ${apellido1} ${apellido2}`
    const cedulaNum = 30200000 + i
    seedEstudiantes.push({ nombre: nombreCompleto, cedula: `V-${cedulaNum}` })
  }

  seedEstudiantes.push({ nombre: 'César Velásquez', cedula: 'V-26592592' })
  seedEstudiantes.push({ nombre: 'Franklin Quintero', cedula: 'V-30932462' })

  const estudianteUsers = []
  for (const e of seedEstudiantes) {
    const user = await prisma.user.create({
      data: { nombre: e.nombre, cedula: e.cedula, password, role: 'ESTUDIANTE' }
    })
    estudianteUsers.push(user)
  }
  console.log(`✅ ${estudianteUsers.length} estudiantes creados`)

  const subjectRecords = []
  for (const m of MATERIAS) {
    const subj = await prisma.subject.create({
      data: { nombre: m.nombre, codigo: m.codigo }
    })
    subjectRecords.push(subj)
  }
  console.log(`✅ ${subjectRecords.length} materias creadas`)

  const sectionRecords = []
  for (const s of SECCIONES) {
    const sec = await prisma.section.create({
      data: { nombre: s.nombre, codigo: s.codigo }
    })
    sectionRecords.push(sec)
  }
  console.log(`✅ ${sectionRecords.length} secciones creadas`)

  const sectionSubjectsCreated = []
  for (let si = 0; si < sectionRecords.length; si++) {
    const section = sectionRecords[si]
    const numSubjects = 7 + Math.floor(Math.random() * 4)
    const shuffledSubjects = shuffle(subjectRecords).slice(0, numSubjects)

    for (const subject of shuffledSubjects) {
      const profesor = profesorUsers[Math.floor(Math.random() * profesorUsers.length)]
      const ss = await prisma.sectionSubject.create({
        data: {
          sectionId: section.id,
          subjectId: subject.id,
          profesorId: profesor.id
        }
      })
      sectionSubjectsCreated.push(ss)
    }
  }
  console.log(`✅ ${sectionSubjectsCreated.length} sección-materias creadas`)

  const studentArrays = []
  for (let si = 0; si < estudianteUsers.length; si += 50) {
    studentArrays.push(estudianteUsers.slice(si, si + 50))
  }

  for (let batchIdx = 0; batchIdx < studentArrays.length; batchIdx++) {
    const batch = studentArrays[batchIdx]
    const sectionIdx = batchIdx % sectionRecords.length
    const section = sectionRecords[sectionIdx]
    const sectionSubjectsForSection = sectionSubjectsCreated.filter(ss => ss.sectionId === section.id)

    if (sectionSubjectsForSection.length === 0) continue

    for (const student of batch) {
      const numSubjects = 4 + Math.floor(Math.random() * 4)
      const selectedSS = shuffle(sectionSubjectsForSection).slice(0, Math.min(numSubjects, sectionSubjectsForSection.length))

      for (const ss of selectedSS) {
        try {
          await prisma.enrollment.create({
            data: { userId: student.id, sectionSubjectId: ss.id }
          })
        } catch {
          // ignore duplicate
        }
      }
    }
    console.log(`  Lote ${batchIdx + 1}/${studentArrays.length}: ${batch.length} estudiantes inscritos`)
  }
  console.log('✅ Inscripciones creadas')

  const channelTypes = ['TEXTO', 'ANUNCIOS', 'ARCHIVOS']

  for (const ss of sectionSubjectsCreated) {
    const ssWithSection = await prisma.sectionSubject.findUnique({
      where: { id: ss.id },
      include: { section: true, subject: true }
    })

    for (const tipo of channelTypes) {
      await prisma.channel.create({
        data: {
          nombre: tipo === 'TEXTO' ? 'General'
            : tipo === 'ANUNCIOS' ? 'Anuncios'
            : 'Material de estudio',
          tipo,
          sectionSubjectId: ss.id
        }
      })
    }
  }
  console.log('✅ Canales creados')

  const eventTypes = ['EXAMEN', 'ENTREGA', 'PROYECTO', 'ACTIVIDAD', 'TRABAJO', 'EXPOSICION', 'OTRO']
  const baseDate = new Date('2026-08-01')

  for (const ss of sectionSubjectsCreated) {
    for (let ei = 0; ei < 2; ei++) {
      const tipo = eventTypes[Math.floor(Math.random() * eventTypes.length)]
      const fecha = new Date(baseDate)
      fecha.setDate(fecha.getDate() + Math.floor(Math.random() * 120))

      await prisma.calendarEvent.create({
        data: {
          titulo: `${tipo === 'EXAMEN' ? 'Parcial' : tipo === 'ENTREGA' ? 'Entrega' : 'Actividad'} ${ei + 1}`,
          fecha,
          tipo,
          sectionSubjectId: ss.id
        }
      })
    }
  }
  console.log('✅ Eventos creados')

  console.log('\n📋 Credenciales de prueba:')
  console.log(`   Profesores: V-20000000 / 123456 hasta V-20000039 / 123456`)
  console.log(`   Estudiantes: V-30100000 / 123456 hasta V-30100049 / 123456`)
  console.log('   César Velásquez: V-26592592 / 123456')
  console.log('   Franklin Quintero: V-30932462 / 123456')
  console.log(`\n📊 Resumen:`)
  console.log(`   Profesores: ${profesorUsers.length}`)
  console.log(`   Estudiantes: ${estudianteUsers.length}`)
  console.log(`   Materias: ${subjectRecords.length}`)
  console.log(`   Secciones: ${sectionRecords.length}`)
  console.log(`   Sección-Materias: ${sectionSubjectsCreated.length}`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
