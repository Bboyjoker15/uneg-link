import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { getStats } from '../controllers/professorPanelController.js'

const router = Router()

router.get('/:sectionSubjectId/stats', authenticate, getStats)

export default router
