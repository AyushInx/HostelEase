import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/audit.service';

export class AuditController {
  async getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      const skip = req.query.skip ? parseInt(req.query.skip as string, 10) : 0;
      const result = await auditService.getLogs(limit, skip);
      res.status(200).json({ success: true, data: result.logs, total: result.total });
    } catch (err) {
      next(err);
    }
  }
}

export const auditController = new AuditController();
