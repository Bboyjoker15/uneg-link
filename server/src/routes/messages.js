import { Router } from 'express'
import { getMessages, sendMessage, updateMessageRelevance } from '../controllers/messageController.js'
import { authenticate } from '../middleware/auth.js'
import upload from '../utils/upload.js'

const router = Router()

router.get('/:channelId', authenticate, getMessages)
router.post('/:channelId', authenticate, upload.single('file'), sendMessage)
router.patch('/:id/relevance', authenticate, updateMessageRelevance)

export default router
