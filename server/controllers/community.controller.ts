import { Request, Response, NextFunction } from 'express';
import { communityService } from '../services/community.service';

const getId = (req: Request): string => (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);

export class CommunityController {
  async feed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const feed = await communityService.getCommunityFeed(req.user!);
      res.status(200).json({ success: true, data: feed });
    } catch (err) {
      next(err);
    }
  }

  async support(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await communityService.toggleSupport(getId(req), req.user!);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async addComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { content, visibility } = req.body;
      const comment = await communityService.addComment(getId(req), req.user!, content, visibility);
      res.status(201).json({ success: true, data: comment });
    } catch (err) {
      next(err);
    }
  }

  async reportUnresolved(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { remarks } = req.body;
      const result = await communityService.reportUnresolved(getId(req), req.user!, remarks);
      res.status(200).json({ success: true, data: result, message: 'Unresolved report recorded.' });
    } catch (err) {
      next(err);
    }
  }

  async unresolvedSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await communityService.getUnresolvedSummary(req.user!);
      res.status(200).json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }
}

export const communityController = new CommunityController();
