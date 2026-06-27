import { Router } from 'express'
import { createChannel, deleteChannel } from '../controllers/channelController.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.post('/', authenticate, requireRole('PROFESOR'), createChannel)
router.delete('/:id', authenticate, requireRole('PROFESOR'), deleteChannel)

export default router
