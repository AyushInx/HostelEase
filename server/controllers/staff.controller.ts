import { Request, Response, NextFunction } from 'express';
import { staffService } from '../services/staff.service';

const getId = (req: Request): string => (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);

export class StaffController {
  async getHostels(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hostels = await staffService.getHostels();
      res.status(200).json({ success: true, data: hostels });
    } catch (err) {
      next(err);
    }
  }

  async addBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, floors, roomsCount } = req.body;
      const hostel = await staffService.addHostelBlock(getId(req), { name, floors, roomsCount }, req.user!);
      res.status(201).json({ success: true, data: hostel, message: 'Block added successfully' });
    } catch (err) {
      next(err);
    }
  }

  async getStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const role = req.query.role as string;
      const staff = await staffService.getStaff(role);
      res.status(200).json({ success: true, data: staff });
    } catch (err) {
      next(err);
    }
  }

  async provisionStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const staff = await staffService.provisionStaff(req.body, req.user!);
      res.status(201).json({ success: true, data: staff, message: 'Staff account provisioned successfully' });
    } catch (err) {
      next(err);
    }
  }

  async toggleStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const staff = await staffService.toggleStaffStatus(getId(req), req.user!);
      res.status(200).json({ success: true, data: staff, message: `Account status updated to ${staff.eligibilityStatus}` });
    } catch (err) {
      next(err);
    }
  }

  async getStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const students = await staffService.getStudents(req.user!);
      res.status(200).json({ success: true, data: students });
    } catch (err) {
      next(err);
    }
  }

  async updateStudentEligibility(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, reason } = req.body;
      const student = await staffService.updateStudentEligibility(getId(req), status, reason, req.user!);
      res.status(200).json({
        success: true,
        data: student,
        message: `Student eligibility updated to ${student.eligibilityStatus}`,
      });
    } catch (err) {
      next(err);
    }
  }

  async changeRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role } = req.body;
      const staff = await staffService.changeStaffRole(getId(req), role, req.user!);
      res.status(200).json({
        success: true,
        data: staff,
        message: `Staff role changed to ${staff.role}`,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const staffController = new StaffController();
