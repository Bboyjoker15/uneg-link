import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import { authenticate } from '../middleware/auth.js'
import { getAssignments, createAssignment, updateAssignment, deleteAssignment, submitAssignment, getSubmissions, gradeSubmission, getAssignmentSection } from '../controllers/assignmentController.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads/assignments'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
})

const router = Router()

router.get('/:sectionSubjectId', authenticate, getAssignments)
router.post('/:sectionSubjectId', authenticate, upload.single('archivo'), createAssignment)
router.put('/:id', authenticate, upload.single('archivo'), updateAssignment)
router.delete('/:id', authenticate, deleteAssignment)
router.post('/:id/submit', authenticate, upload.single('archivo'), submitAssignment)
router.get('/:id/submissions', authenticate, getSubmissions)
router.put('/:id/grade/:userId', authenticate, gradeSubmission)
router.get('/:id/section', authenticate, getAssignmentSection)

export default router
