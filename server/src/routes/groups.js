import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { getGroups, createGroup, updateGroup, deleteGroup, addMember, removeMember } from '../controllers/groupController.js'

const router = Router()

router.get('/:sectionSubjectId', authenticate, getGroups)
router.post('/:sectionSubjectId', authenticate, createGroup)
router.put('/group/:groupId', authenticate, updateGroup)
router.delete('/group/:groupId', authenticate, deleteGroup)
router.post('/group/:groupId/members/:userId', authenticate, addMember)
router.delete('/group/:groupId/members/:userId', authenticate, removeMember)

export default router
