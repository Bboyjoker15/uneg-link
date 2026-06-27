import { Router } from 'express'
import { createEvent, getEvents, updateEvent, deleteEvent } from '../controllers/calendarController.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.post('/', authenticate, requireRole('PROFESOR'), createEvent)
router.get('/:sectionSubjectId', authenticate, getEvents)
router.put('/:id', authenticate, requireRole('PROFESOR'), updateEvent)
router.delete('/:id', authenticate, requireRole('PROFESOR'), deleteEvent)

export default router
