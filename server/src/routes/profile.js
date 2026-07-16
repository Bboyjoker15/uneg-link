import { Router } from 'express'
import { getProfile, getPublicProfile, updateProfile, uploadAvatar, changePassword } from '../controllers/profileController.js'
import { authenticate } from '../middleware/auth.js'
import upload from '../utils/upload.js'

const router = Router()

router.get('/', authenticate, getProfile)
router.get('/:userId', authenticate, getPublicProfile)
router.put('/', authenticate, updateProfile)
router.post('/avatar', authenticate, upload.single('avatar'), uploadAvatar)
router.put('/change-password', authenticate, changePassword)

export default router
