import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import config from '../config.js'
import { sendPasswordResetEmail } from '../services/emailService.js'

const prisma = new PrismaClient()

const CEDULAS_VALIDAS = [
  'V-12345678',
  ...Array.from({ length: 40 }, (_, i) => `V-${20000000 + i}`),
  ...Array.from({ length: 50 }, (_, i) => `V-${30100000 + i}`),
  ...Array.from({ length: 450 }, (_, i) => `V-${30200000 + i}`),
  'V-26592592',
  'V-30932462'
]

function normalizarCedula(val) {
  const nums = val.replace(/[^0-9]/g, '')
  return nums ? 'V-' + nums : val
}

export async function register(req, res) {
  try {
    let { nombre, cedula, password } = req.body
    cedula = normalizarCedula(cedula)

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
    let { cedula, password, rememberMe } = req.body
    cedula = normalizarCedula(cedula)

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

    const expiresIn = rememberMe ? '30d' : '1d'

    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, cedula: user.cedula, role: user.role },
      config.jwtSecret,
      { expiresIn }
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

export async function verifyPassword(req, res) {
  try {
    const { password } = req.body
    if (!password) {
      return res.status(400).json({ error: 'Contraseña requerida' })
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Contraseña incorrecta' })
    }

    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, cedula: user.cedula, role: user.role },
      config.jwtSecret,
      { expiresIn: '30d' }
    )

    res.json({
      token,
      user: { id: user.id, nombre: user.nombre, cedula: user.cedula, role: user.role }
    })
  } catch (error) {
    console.error('Verify password error:', error)
    res.status(500).json({ error: 'Error al verificar contraseña' })
  }
}

export async function forgotPassword(req, res) {
  try {
    const { cedula } = req.body
    const normalized = normalizarCedula(cedula)

    const user = await prisma.user.findUnique({ where: { cedula: normalized } })
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    if (!user.email) {
      return res.status(400).json({ error: 'El usuario no tiene un correo registrado. Contacta al administrador.' })
    }

    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true }
    })

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt }
    })

    await sendPasswordResetEmail(user.email, user.nombre, token)

    res.json({ mensaje: 'Si el usuario existe, recibirás un enlace de recuperación en tu correo' })
  } catch (error) {
    console.error('Forgot password error:', error)
    res.status(500).json({ error: 'Error al solicitar recuperación' })
  }
}

export async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token y nueva contraseña requeridos' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
    }

    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } })
    if (!resetToken) {
      return res.status(400).json({ error: 'Token inválido' })
    }

    if (resetToken.used) {
      return res.status(400).json({ error: 'El token ya ha sido usado' })
    }

    if (new Date(resetToken.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'El token ha expirado' })
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashed }
    })

    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true }
    })

    res.json({ mensaje: 'Contraseña actualizada exitosamente' })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ error: 'Error al restablecer contraseña' })
  }
}

export async function getMe(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, nombre: true, cedula: true, role: true, avatar: true }
    })
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuario' })
  }
}
