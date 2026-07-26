import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { getGrades, getAllStudentGrades, exportGrades } from '../controllers/gradeController.js'

const router = Router()

router.get('/:sectionSubjectId', authenticate, getGrades)
router.get('/:sectionSubjectId/all', authenticate, getAllStudentGrades)
router.get('/:sectionSubjectId/export', authenticate, exportGrades)

export default router
