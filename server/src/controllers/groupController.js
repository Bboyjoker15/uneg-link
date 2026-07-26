import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function getGroups(req, res) {
  try {
    const { sectionSubjectId } = req.params

    const groups = await prisma.workingGroup.findMany({
      where: { sectionSubjectId },
      include: {
        members: {
          include: { user: { select: { id: true, nombre: true, avatar: true, role: true, cedula: true } } }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    res.json(groups)
  } catch (error) {
    console.error('Get groups error:', error)
    res.status(500).json({ error: 'Error al obtener grupos' })
  }
}

export async function createGroup(req, res) {
  try {
    const { sectionSubjectId } = req.params
    const { nombre, memberIds } = req.body

    if (!nombre?.trim()) {
      return res.status(400).json({ error: 'Nombre del grupo requerido' })
    }

    const ss = await prisma.sectionSubject.findUnique({ where: { id: sectionSubjectId } })
    if (!ss || ss.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede crear grupos' })
    }

    const group = await prisma.workingGroup.create({
      data: {
        nombre: nombre.trim(),
        sectionSubjectId,
        members: memberIds?.length > 0 ? {
          create: memberIds.map(id => ({ userId: id, role: 'MEMBER' }))
        } : undefined
      },
      include: {
        members: {
          include: { user: { select: { id: true, nombre: true, avatar: true, role: true, cedula: true } } }
        }
      }
    })

    res.status(201).json(group)
  } catch (error) {
    console.error('Create group error:', error)
    res.status(500).json({ error: 'Error al crear grupo' })
  }
}

export async function updateGroup(req, res) {
  try {
    const { groupId } = req.params
    const { nombre } = req.body

    const group = await prisma.workingGroup.findUnique({
      where: { id: groupId },
      include: { sectionSubject: { select: { profesorId: true } } }
    })
    if (!group) return res.status(404).json({ error: 'Grupo no encontrado' })
    if (group.sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede editar grupos' })
    }

    const updated = await prisma.workingGroup.update({
      where: { id: groupId },
      data: { nombre: nombre?.trim() },
      include: {
        members: {
          include: { user: { select: { id: true, nombre: true, avatar: true, role: true, cedula: true } } }
        }
      }
    })

    res.json(updated)
  } catch (error) {
    console.error('Update group error:', error)
    res.status(500).json({ error: 'Error al actualizar grupo' })
  }
}

export async function deleteGroup(req, res) {
  try {
    const { groupId } = req.params

    const group = await prisma.workingGroup.findUnique({
      where: { id: groupId },
      include: { sectionSubject: { select: { profesorId: true } } }
    })
    if (!group) return res.status(404).json({ error: 'Grupo no encontrado' })
    if (group.sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede eliminar grupos' })
    }

    await prisma.workingGroup.delete({ where: { id: groupId } })
    res.json({ message: 'Grupo eliminado' })
  } catch (error) {
    console.error('Delete group error:', error)
    res.status(500).json({ error: 'Error al eliminar grupo' })
  }
}

export async function addMember(req, res) {
  try {
    const { groupId, userId } = req.params

    const group = await prisma.workingGroup.findUnique({
      where: { id: groupId },
      include: { sectionSubject: { select: { profesorId: true } } }
    })
    if (!group) return res.status(404).json({ error: 'Grupo no encontrado' })
    if (group.sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede añadir miembros' })
    }

    const member = await prisma.groupMember.create({
      data: { groupId, userId },
      include: { user: { select: { id: true, nombre: true, avatar: true, role: true, cedula: true } } }
    })

    res.status(201).json(member)
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'El usuario ya es miembro del grupo' })
    }
    console.error('Add member error:', error)
    res.status(500).json({ error: 'Error al añadir miembro' })
  }
}

export async function removeMember(req, res) {
  try {
    const { groupId, userId } = req.params

    const group = await prisma.workingGroup.findUnique({
      where: { id: groupId },
      include: { sectionSubject: { select: { profesorId: true } } }
    })
    if (!group) return res.status(404).json({ error: 'Grupo no encontrado' })
    if (group.sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede eliminar miembros' })
    }

    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId } }
    })

    res.json({ message: 'Miembro eliminado' })
  } catch (error) {
    console.error('Remove member error:', error)
    res.status(500).json({ error: 'Error al eliminar miembro' })
  }
}
