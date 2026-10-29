import { Router } from 'express';
import { communityController } from '../controllers/community.controller';
import { requireAuth, requireRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { addCommentSchema, reportUnresolvedSchema } from '../schemas/complaint.schema';

const router = Router();

router.get('/feed', requireAuth, (req, res, next) => communityController.feed(req, res, next));

router.get(
  '/unresolved-summary',
  requireAuth,
  requireRoles('Caretaker', 'Warden', 'Hostel Admin'),
  (req, res, next) => communityController.unresolvedSummary(req, res, next)
);

router.post(
  '/:id/support',
  requireAuth,
  requireRoles('Student'),
  (req, res, next) => communityController.support(req, res, next)
);

router.post(
  '/:id/comments',
  requireAuth,
  validateRequest({ body: addCommentSchema }),
  (req, res, next) => communityController.addComment(req, res, next)
);

router.post(
  '/:id/unresolved',
  requireAuth,
  requireRoles('Student'),
  validateRequest({ body: reportUnresolvedSchema }),
  (req, res, next) => communityController.reportUnresolved(req, res, next)
);

export default router;
