import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import config from '../config.js'

const prisma = new PrismaClient()

const CEDULAS_VALIDAS = [
  'V-12345678',
  ...Array.from({ length: 40 }, (_, i) => `V-${20000000 + i}`),
  ...Array.from({ length: 50 }, (_, i) => `V-${30100000 + i}`),
  ...Array.from({ length: 450 }, (_, i) => `V-${30200000 + i}`),
  'V-26592592',
  'V-30932462'
]

export async function register(req, res) {
  try {
    const { nombre, cedula, password } = req.body

    if (!nombre || !cedula || !password) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' })
    }

    if (!CEDULAS_VALIDAS.includes(cedula)) {
      return res.status(400).json({ error: 'Cédula no registrada en el sistema universitario' })
    }

    const existing = await prisma.user.findUnique({ where: { cedula } })
    if (existing) {
      return res.status(400).json({ error: 'El usuario ya está registrado' })
    }

    const hashed = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: { nombre, cedula, password: hashed }
    })

    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, cedula: user.cedula, role: user.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      token,
      user: { id: user.id, nombre: user.nombre, cedula: user.cedula, role: user.role }
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'Error al registrar usuario' })
  }
}

export async function login(req, res) {
  try {
    const { cedula, password } = req.body

    if (!cedula || !password) {
      return res.status(400).json({ error: 'Cédula y contraseña requeridas' })
    }

    const user = await prisma.user.findUnique({ where: { cedula } })
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, cedula: user.cedula, role: user.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: { id: user.id, nombre: user.nombre, cedula: user.cedula, role: user.role }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Error al iniciar sesión' })
  }
}

export async function getMe(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, nombre: true, cedula: true, role: true }
    })
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuario' })
  }
}
