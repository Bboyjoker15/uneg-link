import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { getGrades, getAllStudentGrades } from '../controllers/gradeController.js'

const router = Router()

router.get('/:sectionSubjectId', authenticate, getGrades)
router.get('/:sectionSubjectId/all', authenticate, getAllStudentGrades)

export default router
