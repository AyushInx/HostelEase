import { Router } from 'express';
import { complaintController } from '../controllers/complaint.controller';
import { requireAuth, requireRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import {
  createComplaintSchema,
  assignTechnicianSchema,
  completeWorkSchema,
  rejectComplaintSchema,
  reopenRequestSchema,
  reprioritizeSchema,
} from '../schemas/complaint.schema';

const router = Router();

// Base complaints CRUD
router.post(
  '/',
  requireAuth,
  requireRoles('Student'),
  validateRequest({ body: createComplaintSchema }),
  (req, res, next) => complaintController.create(req, res, next)
);

router.get('/', requireAuth, (req, res, next) => complaintController.list(req, res, next));
router.get('/:id', requireAuth, (req, res, next) => complaintController.detail(req, res, next));

// Caretaker endpoints
router.post(
  '/:id/acknowledge',
  requireAuth,
  requireRoles('Caretaker', 'Hostel Admin'),
  (req, res, next) => complaintController.acknowledge(req, res, next)
);

router.post(
  '/:id/assign',
  requireAuth,
  requireRoles('Caretaker', 'Hostel Admin'),
  validateRequest({ body: assignTechnicianSchema }),
  (req, res, next) => complaintController.assign(req, res, next)
);

// Technician endpoints
router.post(
  '/:id/start-work',
  requireAuth,
  requireRoles('Technician', 'Hostel Admin'),
  (req, res, next) => complaintController.startWork(req, res, next)
);

router.post(
  '/:id/complete-work',
  requireAuth,
  requireRoles('Technician', 'Hostel Admin'),
  validateRequest({ body: completeWorkSchema }),
  (req, res, next) => complaintController.completeWork(req, res, next)
);

// Warden endpoints
router.post(
  '/:id/confirm-resolution',
  requireAuth,
  requireRoles('Warden', 'Hostel Admin'),
  (req, res, next) => complaintController.confirmResolution(req, res, next)
);

router.post(
  '/:id/reprioritize',
  requireAuth,
  requireRoles('Warden', 'Hostel Admin'),
  validateRequest({ body: reprioritizeSchema }),
  (req, res, next) => complaintController.reprioritize(req, res, next)
);

// Rejection: Allowed for Caretaker and Warden only, with mandatory reason
router.post(
  '/:id/reject',
  requireAuth,
  requireRoles('Caretaker', 'Warden', 'Hostel Admin'),
  validateRequest({ body: rejectComplaintSchema }),
  (req, res, next) => complaintController.reject(req, res, next)
);

// Reopen: Student requests, Warden or Caretaker approves
router.post(
  '/:id/reopen-request',
  requireAuth,
  requireRoles('Student'),
  validateRequest({ body: reopenRequestSchema }),
  (req, res, next) => complaintController.reopenRequest(req, res, next)
);

router.post(
  '/:id/approve-reopen',
  requireAuth,
  requireRoles('Warden', 'Caretaker', 'Hostel Admin'),
  (req, res, next) => complaintController.approveReopen(req, res, next)
);

export default router;
