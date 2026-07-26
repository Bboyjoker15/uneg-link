import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { getThreads, createThread, getThread, createReply, togglePinThread, toggleCloseThread } from '../controllers/forumController.js'

const router = Router()

router.get('/:sectionSubjectId/threads', authenticate, getThreads)
router.post('/:sectionSubjectId/threads', authenticate, createThread)
router.get('/threads/:threadId', authenticate, getThread)
router.post('/threads/:threadId/replies', authenticate, createReply)
router.put('/threads/:threadId/pin', authenticate, togglePinThread)
router.put('/threads/:threadId/close', authenticate, toggleCloseThread)

export default router
