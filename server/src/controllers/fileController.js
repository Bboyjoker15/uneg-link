import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function uploadFile(req, res) {
  try {
    const { sectionSubjectId } = req.body

    if (!req.file || !sectionSubjectId) {
      return res.status(400).json({ error: 'Archivo y materia requeridos' })
    }

    const file = await prisma.file.create({
      data: {
        nombre: req.file.originalname,
        url: `/uploads/${req.file.filename}`,
        tipo: req.file.mimetype,
        sectionSubjectId,
        uploadedBy: req.user.id
      }
    })

    res.status(201).json(file)
  } catch (error) {
    console.error('Upload file error:', error)
    res.status(500).json({ error: 'Error al subir archivo' })
  }
}

export async function getFiles(req, res) {
  try {
    const { sectionSubjectId } = req.params

    const files = await prisma.file.findMany({
      where: { sectionSubjectId },
      orderBy: { createdAt: 'desc' }
    })

    res.json(files)
  } catch (error) {
    console.error('Get files error:', error)
    res.status(500).json({ error: 'Error al obtener archivos' })
  }
}

export async function deleteFile(req, res) {
  try {
    const { id } = req.params

    const file = await prisma.file.findUnique({
      where: { id },
      include: { sectionSubject: true }
    })

    if (!file) {
      return res.status(404).json({ error: 'Archivo no encontrado' })
    }

    if (file.sectionSubject.profesorId !== req.user.id && file.uploadedBy !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este archivo' })
    }

    await prisma.file.delete({ where: { id } })

    res.json({ message: 'Archivo eliminado' })
  } catch (error) {
    console.error('Delete file error:', error)
    res.status(500).json({ error: 'Error al eliminar archivo' })
  }
}
