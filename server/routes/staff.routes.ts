import { Router } from 'express';
import { staffController } from '../controllers/staff.controller';
import { requireAuth, requireRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { provisionStaffSchema, updateStudentEligibilitySchema, changeStaffRoleSchema } from '../schemas/auth.schema';

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

router.patch(
  '/accounts/:id/role',
  requireAuth,
  requireRoles('Hostel Admin'),
  validateRequest({ body: changeStaffRoleSchema }),
  (req, res, next) => staffController.changeRole(req, res, next)
);

// Student Eligibility Management (Staff can approve/reject residency eligibility)
router.get(
  '/students',
  requireAuth,
  requireRoles('Caretaker', 'Warden', 'Hostel Admin'),
  (req, res, next) => staffController.getStudents(req, res, next)
);

router.patch(
  '/students/:id/eligibility',
  requireAuth,
  requireRoles('Caretaker', 'Warden', 'Hostel Admin'),
  validateRequest({ body: updateStudentEligibilitySchema }),
  (req, res, next) => staffController.updateStudentEligibility(req, res, next)
);

export default router;
