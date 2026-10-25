import { Router } from 'express';
import { auditController } from '../controllers/audit.controller';
import { requireAuth, requireRoles } from '../middleware/auth';

const router = Router();

router.get(
  '/',
  requireAuth,
  requireRoles('Hostel Admin'),
  (req, res, next) => auditController.getLogs(req, res, next)
);

export default router;
