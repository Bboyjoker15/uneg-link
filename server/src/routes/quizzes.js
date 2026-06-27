import { Router } from 'express'
import { createQuiz, getQuizzes, getQuizDetail, startAttempt, submitAttempt, getAttempt, getQuizAttempts, resetAttempt } from '../controllers/quizController.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.post('/', authenticate, requireRole('PROFESOR'), createQuiz)
router.get('/:sectionSubjectId', authenticate, getQuizzes)
router.get('/detail/:id', authenticate, getQuizDetail)
router.post('/:id/start', authenticate, startAttempt)
router.post('/attempts/:id/submit', authenticate, submitAttempt)
router.get('/attempt/:id', authenticate, getAttempt)
router.get('/:id/attempts', authenticate, getQuizAttempts)
router.post('/:id/reset-attempt/:userId', authenticate, requireRole('PROFESOR'), resetAttempt)

export default router
