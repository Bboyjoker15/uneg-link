import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { authenticate, requireRole } from '../middleware/auth.js'
import prisma from '../lib/prisma.js'

const router = Router()

router.use(authenticate, requireRole('ADMIN'))

const ENTITIES = {
  users: {
    model: 'user',
    list: { select: { id: true, nombre: true, cedula: true, role: true, carrera: true, semestre: true, email: true, telefono: true, createdAt: true }, orderBy: { createdAt: 'desc' } },
    detail: { select: { id: true, nombre: true, cedula: true, role: true, carrera: true, semestre: true, email: true, telefono: true, fechaNacimiento: true, direccion: true, bio: true, avatar: true, createdAt: true } },
    search: ['nombre', 'cedula', 'email'],
    buildCreate: (data, password) => ({ nombre: data.nombre, cedula: data.cedula, password, role: data.role || 'ESTUDIANTE', carrera: data.carrera, semestre: data.semestre, email: data.email, telefono: data.telefono }),
    buildUpdate: (data) => {
      const upd = {}
      const fields = ['nombre', 'role', 'carrera', 'semestre', 'email', 'telefono']
      for (const f of fields) if (data[f] !== undefined) upd[f] = data[f]
      return upd
    },
    uniqueField: 'cedula'
  },
  subjects: {
    model: 'subject',
    list: { orderBy: { nombre: 'asc' } },
    detail: {},
    search: ['nombre', 'codigo'],
    buildCreate: (data) => ({ nombre: data.nombre, codigo: data.codigo }),
    buildUpdate: (data) => {
      const upd = {}
      if (data.nombre) upd.nombre = data.nombre
      if (data.codigo) upd.codigo = data.codigo
      return upd
    },
    uniqueField: 'codigo'
  },
  sections: {
    model: 'section',
    list: { orderBy: { year: 'desc' } },
    detail: {},
    search: ['nombre', 'codigo'],
    buildCreate: (data) => ({ nombre: data.nombre, codigo: data.codigo, year: parseInt(data.year) || 2026, semester: data.semester || '1' }),
    buildUpdate: (data) => {
      const upd = {}
      const fields = ['nombre', 'codigo', 'semester']
      for (const f of fields) if (data[f] !== undefined) upd[f] = data[f]
      if (data.year) upd.year = parseInt(data.year)
      return upd
    },
    uniqueField: 'codigo'
  },
  'section-subjects': {
    model: 'sectionSubject',
    list: { include: { subject: { select: { nombre: true, codigo: true } }, section: { select: { nombre: true, codigo: true, year: true, semester: true } }, profesor: { select: { id: true, nombre: true } } }, orderBy: { createdAt: 'desc' } },
    detail: { include: { subject: true, section: true, profesor: { select: { id: true, nombre: true, cedula: true, email: true } } } },
    search: [],
    buildCreate: (data) => ({ subjectId: data.subjectId, sectionId: data.sectionId, profesorId: data.profesorId }),
    buildUpdate: (data) => {
      const upd = {}
      if (data.profesorId) upd.profesorId = data.profesorId
      return upd
    },
    uniqueField: null
  },
  enrollments: {
    model: 'enrollment',
    list: { include: { user: { select: { id: true, nombre: true, cedula: true, role: true } }, sectionSubject: { include: { subject: { select: { nombre: true } }, section: { select: { codigo: true } } } } }, orderBy: { createdAt: 'desc' } },
    detail: { include: { user: { select: { id: true, nombre: true, cedula: true, role: true, carrera: true } }, sectionSubject: { include: { subject: true, section: true, profesor: { select: { id: true, nombre: true } } } } } },
    search: [],
    buildCreate: (data) => ({ userId: data.userId, sectionSubjectId: data.sectionSubjectId, subRole: data.subRole && data.subRole !== '' ? data.subRole : null }),
    buildUpdate: (data) => ({ subRole: data.subRole && data.subRole !== '' ? data.subRole : null }),
    uniqueField: null
  },
  assignments: {
    model: 'assignment',
    list: { include: { sectionSubject: { include: { subject: { select: { nombre: true } }, section: { select: { codigo: true } } } }, _count: { select: { submissions: true } } }, orderBy: { createdAt: 'desc' } },
    detail: { include: { sectionSubject: { include: { subject: true, section: true } }, submissions: { include: { user: { select: { id: true, nombre: true } } } } } },
    search: ['titulo'],
    buildCreate: (data) => ({ titulo: data.titulo, descripcion: data.descripcion, sectionSubjectId: data.sectionSubjectId, fechaLimite: data.fechaLimite ? new Date(data.fechaLimite) : null }),
    buildUpdate: (data) => {
      const upd = {}
      const fields = ['titulo', 'descripcion']
      for (const f of fields) if (data[f] !== undefined) upd[f] = data[f]
      if (data.fechaLimite !== undefined) upd.fechaLimite = data.fechaLimite ? new Date(data.fechaLimite) : null
      return upd
    },
    uniqueField: null
  }
}

// GET /api/admin/stats/overview - estadisticas del panel (antes de :entity para no colisionar)
router.get('/stats/overview', async (req, res) => {
  try {
    const [users, subjects, sections, sectionSubjects, enrollments, assignments] = await Promise.all([
      prisma.user.count(),
      prisma.subject.count(),
      prisma.section.count(),
      prisma.sectionSubject.count(),
      prisma.enrollment.count(),
      prisma.assignment.count()
    ])
    res.json({ users, subjects, sections, sectionSubjects, enrollments, assignments })
  } catch (error) {
    console.error('Admin stats error:', error)
    res.status(500).json({ error: 'Error al obtener estadísticas' })
  }
})

// GET /api/admin/:entity - listar con busqueda
router.get('/:entity', async (req, res) => {
  try {
    const config = ENTITIES[req.params.entity]
    if (!config) return res.status(400).json({ error: 'Entidad no encontrada' })

    const { search, page = '1', limit = '20' } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = Math.min(parseInt(limit), 100)

    const where = {}
    if (search && config.search.length > 0) {
      where.OR = config.search.map(f => ({ [f]: { contains: search } }))
    }

    const [items, total] = await Promise.all([
      prisma[config.model].findMany({ where, ...config.list, skip, take }),
      prisma[config.model].count({ where })
    ])

    res.json({ items, total, page: parseInt(page), totalPages: Math.ceil(total / take) })
  } catch (error) {
    console.error(`Admin list ${req.params.entity} error:`, error)
    res.status(500).json({ error: 'Error al listar' })
  }
})

// GET /api/admin/:entity/:id - detalle
router.get('/:entity/:id', async (req, res) => {
  try {
    const config = ENTITIES[req.params.entity]
    if (!config) return res.status(400).json({ error: 'Entidad no encontrada' })

    const item = await prisma[config.model].findUnique({
      where: { id: req.params.id },
      ...config.detail
    })
    if (!item) return res.status(404).json({ error: 'No encontrado' })

    res.json(item)
  } catch (error) {
    console.error(`Admin detail ${req.params.entity} error:`, error)
    res.status(500).json({ error: 'Error al obtener detalle' })
  }
})

// POST /api/admin/:entity - crear
router.post('/:entity', async (req, res) => {
  try {
    const config = ENTITIES[req.params.entity]
    if (!config) return res.status(400).json({ error: 'Entidad no encontrada' })

    const data = req.body

    // Manejo de password para usuarios
    let password = null
    if (req.params.entity === 'users') {
      password = data.password || '123456'
      const existing = await prisma.user.findUnique({ where: { cedula: data.cedula } })
      if (existing) return res.status(400).json({ error: 'Ya existe un usuario con esa cédula' })
    }

    // Validar unique constraints para otras entidades
    if (config.uniqueField && data[config.uniqueField]) {
      const existing = await prisma[config.model].findUnique({
        where: { [config.uniqueField]: data[config.uniqueField] }
      })
      if (existing) return res.status(400).json({ error: `Ya existe un registro con ese ${config.uniqueField}` })
    }

    // Validar constraints para section-subjects
    if (req.params.entity === 'section-subjects') {
      const existing = await prisma.sectionSubject.findUnique({
        where: { sectionId_subjectId: { sectionId: data.sectionId, subjectId: data.subjectId } }
      })
      if (existing) return res.status(400).json({ error: 'Ya existe esa materia en la sección' })
    }

    // Validar constraints para enrollments
    if (req.params.entity === 'enrollments') {
      const existing = await prisma.enrollment.findUnique({
        where: { userId_sectionSubjectId: { userId: data.userId, sectionSubjectId: data.sectionSubjectId } }
      })
      if (existing) return res.status(400).json({ error: 'El estudiante ya está inscrito' })
    }

    const createData = config.buildCreate(data, password ? await bcrypt.hash(password, 10) : undefined)
    const item = await prisma[config.model].create({ data: createData })

    res.status(201).json(item)
  } catch (error) {
    console.error(`Admin create ${req.params.entity} error:`, error)
    res.status(500).json({ error: 'Error al crear' })
  }
})

// PUT /api/admin/:entity/:id - editar
router.put('/:entity/:id', async (req, res) => {
  try {
    const config = ENTITIES[req.params.entity]
    if (!config) return res.status(400).json({ error: 'Entidad no encontrada' })

    const updateData = config.buildUpdate(req.body)
    if (Object.keys(updateData).length === 0) return res.status(400).json({ error: 'Sin datos para actualizar' })

    if (req.body.password && req.params.entity === 'users') {
      updateData.password = await bcrypt.hash(req.body.password, 10)
    }

    const item = await prisma[config.model].update({
      where: { id: req.params.id },
      data: updateData
    })

    res.json(item)
  } catch (error) {
    console.error(`Admin update ${req.params.entity} error:`, error)
    res.status(500).json({ error: 'Error al actualizar' })
  }
})

// DELETE /api/admin/:entity/:id - eliminar
router.delete('/:entity/:id', async (req, res) => {
  try {
    const config = ENTITIES[req.params.entity]
    if (!config) return res.status(400).json({ error: 'Entidad no encontrada' })

    await prisma[config.model].delete({ where: { id: req.params.id } })

    res.json({ message: 'Eliminado' })
  } catch (error) {
    console.error(`Admin delete ${req.params.entity} error:`, error)
    res.status(500).json({ error: 'Error al eliminar' })
  }
})

export default router
