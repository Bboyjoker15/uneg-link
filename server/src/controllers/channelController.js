
import prisma from '../lib/prisma.js'

export async function createChannel(req, res) {
  try {
    const { sectionSubjectId, nombre, tipo } = req.body

    if (!sectionSubjectId || !nombre) {
      return res.status(400).json({ error: 'Nombre y materia requeridos' })
    }

    const sectionSubject = await prisma.sectionSubject.findUnique({
      where: { id: sectionSubjectId }
    })
    if (!sectionSubject) {
      return res.status(404).json({ error: 'Materia no encontrada' })
    }

    if (sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede crear canales' })
    }

    const channel = await prisma.channel.create({
      data: { nombre, tipo: tipo || 'TEXTO', sectionSubjectId }
    })

    res.status(201).json(channel)
  } catch (error) {
    console.error('Create channel error:', error)
    res.status(500).json({ error: 'Error al crear canal' })
  }
}

export async function deleteChannel(req, res) {
  try {
    const { id } = req.params

    const channel = await prisma.channel.findUnique({
      where: { id },
      include: { sectionSubject: true }
    })

    if (!channel) {
      return res.status(404).json({ error: 'Canal no encontrado' })
    }

    if (channel.sectionSubject.profesorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el profesor puede eliminar canales' })
    }

    await prisma.channel.delete({ where: { id } })

    res.json({ message: 'Canal eliminado' })
  } catch (error) {
    console.error('Delete channel error:', error)
    res.status(500).json({ error: 'Error al eliminar canal' })
  }
}
