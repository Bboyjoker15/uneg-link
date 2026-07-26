import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CAMPOS_EDITABLES = ['nombre', 'email', 'telefono', 'fechaNacimiento', 'direccion', 'bio', 'carrera', 'semestre']

export async function getProfile(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, nombre: true, cedula: true, email: true, telefono: true,
        avatar: true, carrera: true, semestre: true, fechaNacimiento: true,
        direccion: true, bio: true, role: true, createdAt: true
      }
    })
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
    res.json(user)
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ error: 'Error al obtener perfil' })
  }
}

export async function updateProfile(req, res) {
  try {
    const data = {}
    for (const campo of CAMPOS_EDITABLES) {
      if (req.body[campo] !== undefined) {
        data[campo] = req.body[campo]
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' })
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: {
        id: true, nombre: true, cedula: true, email: true, telefono: true,
        avatar: true, carrera: true, semestre: true, fechaNacimiento: true,
        direccion: true, bio: true, role: true
      }
    })

    res.json(user)
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ error: 'Error al actualizar perfil' })
  }
}

export async function uploadAvatar(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Imagen requerida' })
    }

    const avatarUrl = `/uploads/${req.file.filename}`

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: avatarUrl },
      select: { avatar: true }
    })

    res.json({ avatar: user.avatar })
  } catch (error) {
    console.error('Upload avatar error:', error)
    res.status(500).json({ error: 'Error al subir avatar' })
  }
}

const CAMPOS_PUBLICOS = {
  id: true, nombre: true, avatar: true, role: true,
  carrera: true, semestre: true, bio: true
}

const CAMPOS_PROFESOR = {
  id: true, nombre: true, cedula: true, avatar: true, role: true,
  carrera: true, semestre: true, bio: true, email: true, telefono: true
}

export async function getPublicProfile(req, res) {
  try {
    const { userId } = req.params

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: CAMPOS_PUBLICOS
    })
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' })

    const isSameUser = userId === req.user.id
    const isProfesor = req.user.role === 'PROFESOR'
    let showContact = false

    if (isSameUser || isProfesor) {
      showContact = true
    }

    if (isProfesor && !isSameUser) {
      const sharedSubject = await prisma.enrollment.findFirst({
        where: {
          sectionSubject: {
            profesorId: req.user.id,
            enrollments: { some: { userId } }
          }
        }
      })
      if (sharedSubject) showContact = true
    }

    if (isSameUser) {
      const full = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, nombre: true, cedula: true, email: true, telefono: true,
          avatar: true, carrera: true, semestre: true, fechaNacimiento: true,
          direccion: true, bio: true, role: true, createdAt: true
        }
      })
      return res.json(full)
    }

    if (showContact) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: CAMPOS_PROFESOR
      })
      return res.json(user)
    }

    res.json(target)
  } catch (error) {
    console.error('Get public profile error:', error)
    res.status(500).json({ error: 'Error al obtener perfil' })
  }
}

export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Contraseña actual y nueva requeridas' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' })
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' })
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashed }
    })

    res.json({ mensaje: 'Contraseña actualizada exitosamente' })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({ error: 'Error al cambiar contraseña' })
  }
}
