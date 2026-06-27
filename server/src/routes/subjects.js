import { Router } from 'express'
import { getMySubjects, getSubjectDetail, getOverview, createAnnouncement, getSections, getSectionSubjectsBySection } from '../controllers/subjectController.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/overview', authenticate, getOverview)
router.get('/', authenticate, getMySubjects)
router.get('/sections', authenticate, getSections)
router.get('/sections/:sectionId/subjects', authenticate, getSectionSubjectsBySection)
router.get('/:id', authenticate, getSubjectDetail)
router.post('/:id/announcement', authenticate, requireRole('PROFESOR'), createAnnouncement)

export default router
