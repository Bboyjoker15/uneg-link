import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { getConversations, getOrCreateConversation, getMessages, sendMessage } from '../controllers/directMessageController.js'

const router = Router()

router.get('/conversations', authenticate, getConversations)
router.post('/conversations/:userId', authenticate, getOrCreateConversation)
router.get('/conversations/:conversationId/messages', authenticate, getMessages)
router.post('/conversations/:conversationId/messages', authenticate, sendMessage)

export default router
