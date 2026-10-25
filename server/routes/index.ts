import { Router } from 'express';
import authRoutes from './auth.routes';
import complaintRoutes from './complaint.routes';
import communityRoutes from './community.routes';
import staffRoutes from './staff.routes';
import auditRoutes from './audit.routes';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Hostel Complaint Tracker API',
    phase: 'Phase 4 (Express + Mongoose)',
    timestamp: new Date().toISOString(),
  });
});

// Mounted REST modules
router.use('/auth', authRoutes);
router.use('/complaints', complaintRoutes);
router.use('/community', communityRoutes);
router.use('/staff', staffRoutes);
router.use('/audit', auditRoutes);

// Mark incomplete/deferred endpoints per prompt
router.use('/notifications', (_req, res) => {
  res.status(501).json({
    success: false,
    error: 'Incomplete: Push/Email notifications engine is deferred to Phase 5.',
  });
});

router.use('/escalations/scheduler', (_req, res) => {
  res.status(501).json({
    success: false,
    error: 'Incomplete: Automated background SLA cron scheduler is deferred to Phase 5.',
  });
});

export default router;
