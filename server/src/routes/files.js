import { Router } from 'express'
import { uploadFile, getFiles, deleteFile } from '../controllers/fileController.js'
import { authenticate } from '../middleware/auth.js'
import upload from '../utils/upload.js'

const router = Router()

router.post('/upload', authenticate, upload.single('file'), uploadFile)
router.get('/:sectionSubjectId', authenticate, getFiles)
router.delete('/:id', authenticate, deleteFile)

export default router
