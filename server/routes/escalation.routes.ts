import { Router } from 'express';
import { escalationService } from '../services/escalation.service';
import { Escalation } from '../models/Escalation';
import { requireAuth, requireRoles } from '../middleware/auth';

const router = Router();

// Legacy deferred scheduler route for API backwards compatibility
router.all('/scheduler', (_req, res) => {
  res.status(501).json({
    success: false,
    error: 'Incomplete: Automated background SLA cron scheduler is deferred.',
  });
});

// Run escalation scheduler check
router.post(
  '/evaluate',
  requireAuth,
  requireRoles('Hostel Admin', 'Warden'),
  async (_req, res, next) => {
    try {
      const result = await escalationService.evaluateEscalations();
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// Get current SLA configuration
router.get(
  '/sla-config',
  requireAuth,
  requireRoles('Hostel Admin', 'Warden', 'Caretaker'),
  (_req, res) => {
    const config = escalationService.getSLAConfig();
    res.status(200).json({ success: true, data: config });
  }
);

// Update SLA configuration (Admin only)
router.patch(
  '/sla-config',
  requireAuth,
  requireRoles('Hostel Admin'),
  (req, res) => {
    const { priority, config } = req.body;
    if (!priority || !config) {
      res.status(400).json({ success: false, error: 'Priority and config object are required' });
      return;
    }
    escalationService.setSLAConfig(priority, config);
    res.status(200).json({
      success: true,
      data: escalationService.getSLAConfig(priority),
      message: `SLA config for ${priority} updated successfully`,
    });
  }
);

// Get all escalations
router.get(
  '/',
  requireAuth,
  requireRoles('Hostel Admin', 'Warden'),
  async (req, res, next) => {
    try {
      const { complaintId, slaType, escalationTier } = req.query;
      const query: any = {};
      if (complaintId) query.complaint = complaintId;
      if (slaType) query.slaType = slaType;
      if (escalationTier) query.escalationTier = escalationTier;

      const escalations = await Escalation.find(query).sort({ triggeredAt: -1 });
      res.status(200).json({ success: true, data: escalations });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
