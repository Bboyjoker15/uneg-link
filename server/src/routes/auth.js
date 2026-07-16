import { Router } from 'express'
import { register, login, getMe, verifyPassword, forgotPassword, resetPassword } from '../controllers/authController.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.get('/me', authenticate, getMe)
router.post('/verify-password', authenticate, verifyPassword)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

export default router
