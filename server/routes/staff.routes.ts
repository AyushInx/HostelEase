import { Router } from 'express';
import { staffController } from '../controllers/staff.controller';
import { requireAuth, requireRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { provisionStaffSchema } from '../schemas/auth.schema';

const router = Router();

// Hostels & Blocks
router.get('/hostels', requireAuth, (req, res, next) => staffController.getHostels(req, res, next));

router.post(
  '/hostels/:id/blocks',
  requireAuth,
  requireRoles('Hostel Admin'),
  (req, res, next) => staffController.addBlock(req, res, next)
);

// Staff Accounts
router.get(
  '/accounts',
  requireAuth,
  requireRoles('Caretaker', 'Warden', 'Hostel Admin'),
  (req, res, next) => staffController.getStaff(req, res, next)
);

router.post(
  '/accounts',
  requireAuth,
  requireRoles('Hostel Admin'),
  validateRequest({ body: provisionStaffSchema }),
  (req, res, next) => staffController.provisionStaff(req, res, next)
);

router.patch(
  '/accounts/:id/status',
  requireAuth,
  requireRoles('Hostel Admin'),
  (req, res, next) => staffController.toggleStatus(req, res, next)
);

export default router;
