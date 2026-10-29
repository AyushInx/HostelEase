import { Types } from 'mongoose';
import { Complaint, IComplaint, generateTicketReference, ComplaintPriority, ComplaintStatus } from '../models/Complaint';
import { StatusHistory, IStatusHistory } from '../models/StatusHistory';
import { Assignment, IAssignment } from '../models/Assignment';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { AuthUserPayload } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { auditService } from './audit.service';

export interface ComplaintFilterParams {
  search?: string;
  status?: string;
  category?: string;
  priority?: string;
  technicianName?: string;
  hostelName?: string;
}

export class ComplaintService {
  async createComplaint(
    user: AuthUserPayload,
    data: {
      category: any;
      title: string;
      description: string;
      roomNumber: string;
      block?: string;
      priority?: ComplaintPriority;
    }
  ): Promise<IComplaint> {
    // Determine unique reference ID
    let referenceId = generateTicketReference();
    let collision = await Complaint.findOne({ referenceId });
    while (collision) {
      referenceId = generateTicketReference();
      collision = await Complaint.findOne({ referenceId });
    }

    const complaint = new Complaint({
      referenceId,
      student: new Types.ObjectId(user.id),
      studentName: user.name,
      hostelName: user.hostelName || 'General Campus',
      block: data.block || 'A Block',
      roomNumber: data.roomNumber,
      category: data.category,
      title: data.title,
      description: data.description,
      priority: data.priority || 'Medium',
      status: 'Submitted',
    });

    await complaint.save();

    // Initial StatusHistory entry
    const history = new StatusHistory({
      complaint: complaint._id,
      actor: new Types.ObjectId(user.id),
      actorName: user.name,
      actorRole: user.role,
      fromStatus: 'Submitted',
      toStatus: 'Submitted',
      remarks: 'Complaint registered by student.',
      timestamp: new Date(),
    });
    await history.save();

    await auditService.record({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'COMPLAINT_CREATED',
      targetEntity: 'Complaint',
      entityId: complaint.referenceId,
      details: `New ticket registered: ${complaint.referenceId} (${complaint.category} - ${complaint.priority})`,
    });

    return complaint;
  }

  async getComplaints(user: AuthUserPayload, filters: ComplaintFilterParams = {}): Promise<IComplaint[]> {
    const query: any = {};

    // 1. Role-based scoping
    if (user.role === 'Student') {
      query.student = new Types.ObjectId(user.id);
    } else if (user.role === 'Technician') {
      query.assignedTechnician = new Types.ObjectId(user.id);
    } else if (user.role === 'Caretaker' || user.role === 'Warden') {
      if (user.hostelName) {
        query.hostelName = user.hostelName;
      }
    } else if (user.role === 'Hostel Admin') {
      // Cross-hostel visibility; optional filter by hostelName
      if (filters.hostelName && filters.hostelName !== 'All') {
        query.hostelName = filters.hostelName;
      }
    }

    // 2. Query filters
    if (filters.status && filters.status !== 'All') {
      query.status = filters.status;
    }
    if (filters.category && filters.category !== 'All') {
      query.category = filters.category;
    }
    if (filters.priority && filters.priority !== 'All') {
      query.priority = filters.priority;
    }
    if (filters.technicianName && filters.technicianName !== 'All') {
      query.assignedTechnicianName = filters.technicianName;
    }
    if (filters.search && filters.search.trim()) {
      const s = filters.search.trim();
      query.$or = [
        { referenceId: { $regex: s, $options: 'i' } },
        { title: { $regex: s, $options: 'i' } },
        { roomNumber: { $regex: s, $options: 'i' } },
        { studentName: { $regex: s, $options: 'i' } },
      ];
    }

    return Complaint.find(query).sort({ createdAt: -1 });
  }

  async getComplaintById(
    idOrRef: string,
    user: AuthUserPayload
  ): Promise<{ complaint: IComplaint; timeline: IStatusHistory[] }> {
    const isObjectId = Types.ObjectId.isValid(idOrRef);
    const complaint = await Complaint.findOne(
      isObjectId ? { $or: [{ _id: idOrRef }, { referenceId: idOrRef }] } : { referenceId: idOrRef }
    );

    if (!complaint) {
      throw new AppError('Complaint ticket not found', 404);
    }

    // Scoping authorization check
    if (user.role === 'Student' && complaint.student.toString() !== user.id) {
      throw new AppError('Access denied: You do not have permission to view this ticket.', 403);
    }
    if (
      (user.role === 'Caretaker' || user.role === 'Warden') &&
      user.hostelName &&
      complaint.hostelName !== user.hostelName
    ) {
      throw new AppError('Access denied: Ticket belongs to a different hostel jurisdiction.', 403);
    }

    const timeline = await StatusHistory.find({ complaint: complaint._id }).sort({ timestamp: 1 });
    return { complaint, timeline };
  }

  // Caretaker: Acknowledge (Submitted -> Seen)
  async acknowledge(complaintId: string, user: AuthUserPayload): Promise<IComplaint> {
    const complaint = await this.findComplaintAndVerifyJurisdiction(complaintId, user);
    if (complaint.status !== 'Submitted') {
      throw new AppError(`Cannot acknowledge ticket in current state '${complaint.status}' (must be 'Submitted')`, 400);
    }

    const fromStatus = complaint.status;
    complaint.status = 'Seen';
    complaint.acknowledgedAt = new Date();
    await complaint.save();

    await this.recordTransition(complaint, user, fromStatus, 'Seen', 'Ticket acknowledged by Caretaker (Acknowledgment SLA clock stopped at Seen).');
    return complaint;
  }

  // Caretaker: Assign Technician (Seen/Submitted -> Assigned)
  async assignTechnician(
    complaintId: string,
    technicianId: string,
    notes: string | undefined,
    user: AuthUserPayload
  ): Promise<IComplaint> {
    const complaint = await this.findComplaintAndVerifyJurisdiction(complaintId, user);
    
    // Technicians cannot assign technicians
    if (user.role === 'Technician') {
      throw new AppError('Technicians are not authorized to assign work orders.', 403);
    }

    const tech = await User.findById(technicianId);
    if (!tech || tech.role !== 'Technician') {
      throw new AppError('Designated technician not found or invalid role.', 400);
    }
    if (tech.eligibilityStatus === 'suspended') {
      throw new AppError('Cannot assign to a suspended technician.', 400);
    }

    const fromStatus = complaint.status;
    const fromTechId = complaint.assignedTechnician;
    const fromTechName = complaint.assignedTechnicianName;
    const isReassignment = Boolean(fromTechId && fromTechId.toString() !== tech._id.toString());

    complaint.status = 'Assigned';
    complaint.assignedTechnician = tech._id;
    complaint.assignedTechnicianName = tech.name;
    await complaint.save();

    // SPEC INVARIANT: Assignment/reassignment records (actor, from, to, reason)
    const assignmentRecord = new Assignment({
      complaint: complaint._id,
      actor: new Types.ObjectId(user.id),
      actorName: user.name,
      actorRole: user.role,
      fromTechnician: fromTechId,
      fromTechnicianName: fromTechName,
      toTechnician: tech._id,
      toTechnicianName: tech.name,
      reason: notes || (isReassignment ? `Reassigned from ${fromTechName} to ${tech.name}` : `Initial assignment to ${tech.name}`),
      assignedAt: new Date(),
    });
    await assignmentRecord.save();

    const remark = isReassignment
      ? `Reassigned from ${fromTechName} to ${tech.name}${notes ? `. Reason: ${notes}` : ''}`
      : `Assigned to technician ${tech.name}${notes ? `. Notes: ${notes}` : ''}`;
    await this.recordTransition(complaint, user, fromStatus, 'Assigned', remark);
    return complaint;
  }

  // Technician: Start Work (Assigned -> In Progress)
  async startWork(complaintId: string, user: AuthUserPayload): Promise<IComplaint> {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw new AppError('Complaint not found', 404);

    if (complaint.status !== 'Assigned') {
      throw new AppError(`Cannot start work on ticket in '${complaint.status}' status (must be 'Assigned')`, 400);
    }

    if (user.role === 'Technician' && complaint.assignedTechnician?.toString() !== user.id) {
      throw new AppError('You can only start work on orders assigned directly to you.', 403);
    }

    const fromStatus = complaint.status;
    complaint.status = 'In Progress';
    await complaint.save();

    await this.recordTransition(complaint, user, fromStatus, 'In Progress', 'Technician started active diagnostic and repair work.');
    return complaint;
  }

  // Technician: Complete Work (In Progress -> Work Completed)
  async completeWork(complaintId: string, repairNotes: string, user: AuthUserPayload): Promise<IComplaint> {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw new AppError('Complaint not found', 404);

    if (complaint.status !== 'In Progress') {
      throw new AppError(`Cannot mark work completed on ticket in '${complaint.status}' status (must be 'In Progress')`, 400);
    }

    if (user.role === 'Technician' && complaint.assignedTechnician?.toString() !== user.id) {
      throw new AppError('You can only complete work on orders assigned directly to you.', 403);
    }

    const fromStatus = complaint.status;
    complaint.status = 'Work Completed';
    complaint.repairNotes = repairNotes;
    await complaint.save();

    await this.recordTransition(complaint, user, fromStatus, 'Work Completed', `Work completed by technician. Notes: ${repairNotes}`);
    return complaint;
  }

  // Warden: Confirm Resolution (Work Completed -> Resolved)
  async confirmResolution(complaintId: string, notes: string | undefined, user: AuthUserPayload): Promise<IComplaint> {
    if (user.role !== 'Warden' && user.role !== 'Hostel Admin') {
      throw new AppError('Only the Hostel Warden or Admin can confirm final resolution.', 403);
    }

    const complaint = await this.findComplaintAndVerifyJurisdiction(complaintId, user);
    if (complaint.status !== 'Work Completed') {
      throw new AppError(`Cannot confirm resolution on ticket in '${complaint.status}' status (must be 'Work Completed')`, 400);
    }

    if (notes !== undefined && notes !== null && notes.trim().length > 0 && notes.trim().length < 5) {
      throw new AppError('Resolution notes must be at least 5 characters.', 400);
    }

    const resolutionNotes = notes?.trim() || 'Final resolution verified and approved by staff.';
    const fromStatus = complaint.status;
    complaint.status = 'Resolved';
    complaint.resolutionNotes = resolutionNotes;
    await complaint.save();

    await this.recordTransition(
      complaint,
      user,
      fromStatus,
      'Resolved',
      `Final resolution verified and approved by ${user.role}. Notes: ${resolutionNotes}`
    );
    return complaint;
  }

  // Retrieve assignment history records for a complaint
  async getAssignments(complaintId: string, user: AuthUserPayload): Promise<IAssignment[]> {
    const complaint = await this.findComplaintAndVerifyJurisdiction(complaintId, user);
    return Assignment.find({ complaint: complaint._id }).sort({ assignedAt: 1 });
  }

  // Warden ONLY: Return Work Completed -> In Progress (Mandatory Reason)
  async returnWorkInProgress(complaintId: string, reason: string, user: AuthUserPayload): Promise<IComplaint> {
    if (user.role !== 'Warden' && user.role !== 'Hostel Admin') {
      throw new AppError('SPEC INVARIANT: Transition Work Completed -> In Progress is restricted to Warden only.', 403);
    }

    if (!reason || reason.trim().length < 5) {
      throw new AppError('Mandatory reason (minimum 5 characters) is required to return work to In Progress.', 400);
    }

    const complaint = await this.findComplaintAndVerifyJurisdiction(complaintId, user);
    if (complaint.status !== 'Work Completed') {
      throw new AppError(`Cannot return ticket to 'In Progress' from '${complaint.status}' status (must be 'Work Completed').`, 400);
    }

    const fromStatus = complaint.status;
    complaint.status = 'In Progress';
    await complaint.save();

    await this.recordTransition(
      complaint,
      user,
      fromStatus,
      'In Progress',
      `Work marked unsatisfactory by Warden and returned to In Progress. Reason: ${reason.trim()}`
    );
    return complaint;
  }

  // Caretaker and Warden ONLY: Reject Complaint (Mandatory Reason)
  async rejectComplaint(complaintId: string, reason: string, user: AuthUserPayload): Promise<IComplaint> {
    if (user.role !== 'Caretaker' && user.role !== 'Warden' && user.role !== 'Hostel Admin') {
      throw new AppError('SPEC INVARIANT: Rejection is allowed for Caretaker and Warden only.', 403);
    }

    if (!reason || reason.trim().length < 5) {
      throw new AppError('SPEC INVARIANT: Rejection requires a mandatory reason (minimum 5 characters).', 400);
    }

    const complaint = await this.findComplaintAndVerifyJurisdiction(complaintId, user);
    if (complaint.status === 'Resolved' || complaint.status === 'Rejected') {
      throw new AppError(`Cannot reject ticket in terminal status '${complaint.status}'.`, 400);
    }

    const fromStatus = complaint.status;
    complaint.status = 'Rejected';
    complaint.rejectionReason = reason.trim();
    await complaint.save();

    await this.recordTransition(complaint, user, fromStatus, 'Rejected', `Rejected with reason: ${complaint.rejectionReason}`);
    return complaint;
  }

  // Student: Reopen Request (Resolved -> Reopened)
  async submitReopenRequest(complaintId: string, reason: string, user: AuthUserPayload): Promise<IComplaint> {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw new AppError('Complaint not found', 404);

    if (complaint.student.toString() !== user.id) {
      throw new AppError('Only the student who submitted this complaint can request reopening.', 403);
    }

    if (complaint.status !== 'Resolved') {
      throw new AppError(`Cannot request reopening on ticket in '${complaint.status}' status (must be 'Resolved')`, 400);
    }

    const fromStatus = complaint.status;
    complaint.status = 'Reopened';
    await complaint.save();

    await this.recordTransition(complaint, user, fromStatus, 'Reopened', `Student submitted reopen request: ${reason}`);
    return complaint;
  }

  // Warden or Caretaker: Approve Reopen (Reopened -> Assigned)
  async approveReopen(complaintId: string, user: AuthUserPayload): Promise<IComplaint> {
    if (user.role !== 'Warden' && user.role !== 'Caretaker' && user.role !== 'Hostel Admin') {
      throw new AppError('Approval of reopen requests is restricted to Warden or Caretaker.', 403);
    }

    const complaint = await this.findComplaintAndVerifyJurisdiction(complaintId, user);
    if (complaint.status !== 'Reopened') {
      throw new AppError(`Ticket is not in 'Reopened' state (current: '${complaint.status}').`, 400);
    }

    const fromStatus = complaint.status;
    // SPEC INVARIANT: Returns to Assigned (same technician if still active, else Caretaker reassigns)
    let techStillActive = false;
    if (complaint.assignedTechnician) {
      const activeTech = await User.findOne({ _id: complaint.assignedTechnician, eligibilityStatus: 'approved' });
      if (activeTech) techStillActive = true;
    }

    complaint.status = 'Assigned';
    if (!techStillActive) {
      complaint.assignedTechnician = undefined;
      complaint.assignedTechnicianName = undefined;
    }
    await complaint.save();

    const remark = techStillActive
      ? `Reopening approved. Returned to Assigned with original technician ${complaint.assignedTechnicianName}.`
      : 'Reopening approved. Technician reassignment required.';
    await this.recordTransition(complaint, user, fromStatus, 'Assigned', remark);
    return complaint;
  }

  // Warden or Caretaker: Reject Reopen Request (Reopened -> Resolved, stays Resolved, student notified with reason, audit written)
  async rejectReopen(complaintId: string, reason: string, user: AuthUserPayload): Promise<IComplaint> {
    if (user.role !== 'Warden' && user.role !== 'Caretaker' && user.role !== 'Hostel Admin') {
      throw new AppError('Rejection of reopen requests is restricted to Warden or Caretaker.', 403);
    }

    if (!reason || reason.trim().length < 5) {
      throw new AppError('Rejection of reopen request requires a mandatory reason (minimum 5 characters).', 400);
    }

    const complaint = await this.findComplaintAndVerifyJurisdiction(complaintId, user);
    if (complaint.status !== 'Reopened') {
      throw new AppError(`Cannot reject reopen request: Ticket is not in 'Reopened' state (current: '${complaint.status}').`, 400);
    }

    const fromStatus = complaint.status;
    complaint.status = 'Resolved';
    await complaint.save();

    await this.recordTransition(
      complaint,
      user,
      fromStatus,
      'Resolved',
      `Reopen request rejected by ${user.role}. Reason: ${reason.trim()}`
    );

    // SPEC INVARIANT: student notified with reason
    await Notification.create({
      recipient: complaint.student,
      type: 'reopen_rejected',
      title: 'Reopen Request Rejected',
      message: `Your reopen request for ticket ${complaint.referenceId} was rejected by ${user.role}. Reason: ${reason.trim()}`,
      link: `/complaints/${complaint._id}`,
      readStatus: false,
    });

    return complaint;
  }

  // Warden: Reprioritize
  async reprioritize(complaintId: string, newPriority: ComplaintPriority, user: AuthUserPayload): Promise<IComplaint> {
    if (user.role !== 'Warden' && user.role !== 'Hostel Admin') {
      throw new AppError('Only Warden or Admin can reprioritize tickets.', 403);
    }

    const complaint = await this.findComplaintAndVerifyJurisdiction(complaintId, user);
    const oldPriority = complaint.priority;
    complaint.priority = newPriority;
    await complaint.save();

    await auditService.record({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'REPRIORITIZE',
      targetEntity: 'Complaint',
      entityId: complaint.referenceId,
      details: `Priority updated from ${oldPriority} to ${newPriority}`,
    });

    return complaint;
  }

  private async findComplaintAndVerifyJurisdiction(complaintId: string, user: AuthUserPayload): Promise<IComplaint> {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw new AppError('Complaint not found', 404);

    if (
      (user.role === 'Caretaker' || user.role === 'Warden') &&
      user.hostelName &&
      complaint.hostelName !== user.hostelName
    ) {
      throw new AppError(`Access denied: Ticket belongs to ${complaint.hostelName}, outside your jurisdiction (${user.hostelName}).`, 403);
    }

    return complaint;
  }

  private async recordTransition(
    complaint: IComplaint,
    user: AuthUserPayload,
    fromStatus: ComplaintStatus,
    toStatus: ComplaintStatus,
    remarks?: string
  ): Promise<void> {
    const history = new StatusHistory({
      complaint: complaint._id,
      actor: new Types.ObjectId(user.id),
      actorName: user.name,
      actorRole: user.role,
      fromStatus,
      toStatus,
      remarks,
      timestamp: new Date(),
    });
    await history.save();

    await auditService.record({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: `STATUS_${toStatus.toUpperCase()}`,
      targetEntity: 'Complaint',
      entityId: complaint.referenceId,
      details: `Status changed from ${fromStatus} to ${toStatus}. ${remarks || ''}`,
    });
  }
}

export const complaintService = new ComplaintService();
