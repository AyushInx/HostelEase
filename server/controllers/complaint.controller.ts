import { Request, Response, NextFunction } from 'express';
import { complaintService } from '../services/complaint.service';

const getId = (req: Request): string => (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);

export class ComplaintController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const complaint = await complaintService.createComplaint(req.user!, req.body);
      res.status(201).json({ success: true, data: complaint });
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        search: req.query.search as string,
        status: req.query.status as string,
        category: req.query.category as string,
        priority: req.query.priority as string,
        technicianName: req.query.technicianName as string,
        hostelName: req.query.hostelName as string,
      };
      const complaints = await complaintService.getComplaints(req.user!, filters);
      res.status(200).json({ success: true, data: complaints });
    } catch (err) {
      next(err);
    }
  }

  async detail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getId(req);
      const detail = await complaintService.getComplaintById(id, req.user!);
      res.status(200).json({ success: true, data: detail });
    } catch (err) {
      next(err);
    }
  }

  async acknowledge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const complaint = await complaintService.acknowledge(getId(req), req.user!);
      res.status(200).json({ success: true, data: complaint, message: 'Ticket marked as Seen' });
    } catch (err) {
      next(err);
    }
  }

  async assign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { technicianId, notes } = req.body;
      const complaint = await complaintService.assignTechnician(getId(req), technicianId, notes, req.user!);
      res.status(200).json({ success: true, data: complaint, message: 'Technician assigned successfully' });
    } catch (err) {
      next(err);
    }
  }

  async startWork(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const complaint = await complaintService.startWork(getId(req), req.user!);
      res.status(200).json({ success: true, data: complaint, message: 'Work started on complaint' });
    } catch (err) {
      next(err);
    }
  }

  async completeWork(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { repairNotes } = req.body;
      const complaint = await complaintService.completeWork(getId(req), repairNotes, req.user!);
      res.status(200).json({ success: true, data: complaint, message: 'Work marked as completed' });
    } catch (err) {
      next(err);
    }
  }

  async confirmResolution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { notes, resolutionNotes } = req.body || {};
      const complaint = await complaintService.confirmResolution(getId(req), notes || resolutionNotes, req.user!);
      res.status(200).json({ success: true, data: complaint, message: 'Ticket confirmed and resolved' });
    } catch (err) {
      next(err);
    }
  }

  async getAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assignments = await complaintService.getAssignments(getId(req), req.user!);
      res.status(200).json({ success: true, data: assignments });
    } catch (err) {
      next(err);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reason } = req.body;
      const complaint = await complaintService.rejectComplaint(getId(req), reason, req.user!);
      res.status(200).json({ success: true, data: complaint, message: 'Complaint rejected with mandatory reason' });
    } catch (err) {
      next(err);
    }
  }

  async reopenRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reason } = req.body;
      const complaint = await complaintService.submitReopenRequest(getId(req), reason, req.user!);
      res.status(200).json({ success: true, data: complaint, message: 'Reopen request submitted' });
    } catch (err) {
      next(err);
    }
  }

  async approveReopen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const complaint = await complaintService.approveReopen(getId(req), req.user!);
      res.status(200).json({ success: true, data: complaint, message: 'Reopening approved; ticket reassigned' });
    } catch (err) {
      next(err);
    }
  }

  async rejectReopen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reason } = req.body;
      const complaint = await complaintService.rejectReopen(getId(req), reason, req.user!);
      res.status(200).json({ success: true, data: complaint, message: 'Reopen request rejected; ticket remains Resolved' });
    } catch (err) {
      next(err);
    }
  }

  async returnWorkInProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reason } = req.body;
      const complaint = await complaintService.returnWorkInProgress(getId(req), reason, req.user!);
      res.status(200).json({ success: true, data: complaint, message: 'Work marked unsatisfactory; returned to In Progress' });
    } catch (err) {
      next(err);
    }
  }

  async reprioritize(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { priority } = req.body;
      const complaint = await complaintService.reprioritize(getId(req), priority, req.user!);
      res.status(200).json({ success: true, data: complaint, message: 'Priority updated successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const complaintController = new ComplaintController();
