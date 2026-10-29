import { Types } from 'mongoose';
import { Complaint, IComplaint } from '../models/Complaint';
import { Support } from '../models/Support';
import { Comment, IComment } from '../models/Comment';
import { UnresolvedReport } from '../models/UnresolvedReport';
import { AuthUserPayload } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { auditService } from './audit.service';

export interface SanitizedCommunityComplaint {
  id: string;
  referenceId: string;
  category: string;
  title: string;
  description: string;
  roomNumber: string;
  hostelName: string;
  status: string;
  priority: string;
  supportCount: number;
  hasSupported: boolean;
  unresolvedReportsCount: number;
  hasReportedUnresolved: boolean;
  createdAt: Date;
  comments: IComment[];
}

export class CommunityService {
  async getCommunityFeed(user: AuthUserPayload): Promise<SanitizedCommunityComplaint[]> {
    const hostelFilter = user.role === 'Hostel Admin' ? {} : { hostelName: user.hostelName || 'C.V.R Hostel' };
    
    // Fetch complaints
    const complaints = await Complaint.find(hostelFilter).sort({ createdAt: -1 }).limit(50);
    const complaintIds = complaints.map((c: IComplaint) => c._id);

    // Fetch student's supports and unresolved reports
    const [userSupports, userReports, comments] = await Promise.all([
      Support.find({ complaint: { $in: complaintIds }, student: new Types.ObjectId(user.id) }),
      UnresolvedReport.find({ complaint: { $in: complaintIds }, student: new Types.ObjectId(user.id) }),
      Comment.find({ complaint: { $in: complaintIds } }).sort({ createdAt: 1 }),
    ]);

    const supportedSet = new Set(userSupports.map((s: any) => s.complaint.toString()));
    const reportedSet = new Set(userReports.map((r: any) => r.complaint.toString()));
    
    const commentsByComplaint = new Map<string, IComment[]>();
    for (const c of comments) {
      const cid = c.complaint.toString();
      if (!commentsByComplaint.has(cid)) commentsByComplaint.set(cid, []);
      commentsByComplaint.get(cid)!.push(c);
    }

    // Sanitize response: NEVER leak student emails or private details
    return complaints.map((c: IComplaint) => ({
      id: c._id.toString(),
      referenceId: c.referenceId,
      category: c.category,
      title: c.title,
      description: c.description,
      roomNumber: c.roomNumber,
      hostelName: c.hostelName,
      status: c.status,
      priority: c.priority,
      supportCount: c.supportCount,
      hasSupported: supportedSet.has(c._id.toString()),
      unresolvedReportsCount: c.unresolvedReportsCount,
      hasReportedUnresolved: reportedSet.has(c._id.toString()),
      createdAt: c.createdAt,
      comments: commentsByComplaint.get(c._id.toString()) || [],
    }));
  }

  async toggleSupport(complaintId: string, user: AuthUserPayload): Promise<{ supported: boolean; supportCount: number }> {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw new AppError('Complaint not found', 404);

    const studentId = new Types.ObjectId(user.id);
    const existing = await Support.findOne({ complaint: complaint._id, student: studentId });

    if (existing) {
      await Support.deleteOne({ _id: existing._id });
      complaint.supportCount = Math.max(0, complaint.supportCount - 1);
      await complaint.save();
      return { supported: false, supportCount: complaint.supportCount };
    }

    try {
      const support = new Support({ complaint: complaint._id, student: studentId });
      await support.save();
      complaint.supportCount += 1;
      await complaint.save();
      return { supported: true, supportCount: complaint.supportCount };
    } catch (err: any) {
      if (err.code === 11000) {
        // Already supported concurrently
        return { supported: true, supportCount: complaint.supportCount };
      }
      throw err;
    }
  }

  async addComment(
    complaintId: string,
    user: AuthUserPayload,
    content: string,
    visibility: 'public' | 'internal' = 'public'
  ): Promise<IComment> {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw new AppError('Complaint not found', 404);

    const comment = new Comment({
      complaint: complaint._id,
      author: new Types.ObjectId(user.id),
      authorName: user.name,
      authorRole: user.role,
      content: content.trim(),
      visibility,
      createdAt: new Date(),
    });

    await comment.save();
    return comment;
  }

  async reportUnresolved(
    complaintId: string,
    user: AuthUserPayload,
    remarks?: string
  ): Promise<{ reported: boolean; unresolvedReportsCount: number }> {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw new AppError('Complaint not found', 404);

    const studentId = new Types.ObjectId(user.id);

    try {
      const report = new UnresolvedReport({
        complaint: complaint._id,
        student: studentId,
        remarks: remarks?.trim(),
        reportedAt: new Date(),
      });
      await report.save();

      complaint.unresolvedReportsCount += 1;
      await complaint.save();

      await auditService.record({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: 'REPORT_UNRESOLVED',
        targetEntity: 'Complaint',
        entityId: complaint.referenceId,
        details: `Reported unresolved by student ${user.name}. Remarks: ${remarks || 'None'}`,
      });

      return { reported: true, unresolvedReportsCount: complaint.unresolvedReportsCount };
    } catch (err: any) {
      // SPEC INVARIANT: Unique index on (complaint, student)
      if (err.code === 11000) {
        throw new AppError('You have already reported this complaint as unresolved.', 409);
      }
      throw err;
    }
  }

  async getUnresolvedSummary(user: AuthUserPayload): Promise<{
    totalUnresolvedReports: number;
    complaintsWithUnresolvedReports: number;
    complaints: Array<{
      id: string;
      referenceId: string;
      title: string;
      hostelName: string;
      roomNumber: string;
      status: string;
      priority: string;
      unresolvedReportsCount: number;
      reports: Array<{
        id: string;
        reportedAt: Date;
        remarks?: string;
      }>;
    }>;
  }> {
    if (user.role === 'Student') {
      throw new AppError('Only staff can access aggregate unresolved reports summary.', 403);
    }

    const hostelFilter: any = {};
    if ((user.role === 'Caretaker' || user.role === 'Warden') && user.hostelName) {
      hostelFilter.hostelName = user.hostelName;
    }

    const complaints = await Complaint.find({
      ...hostelFilter,
      unresolvedReportsCount: { $gt: 0 },
    }).sort({ unresolvedReportsCount: -1 });

    const complaintIds = complaints.map((c) => c._id);
    const reports = await UnresolvedReport.find({ complaint: { $in: complaintIds } }).sort({ reportedAt: -1 });

    const reportsByComplaint = new Map<string, any[]>();
    for (const r of reports) {
      const cid = r.complaint.toString();
      if (!reportsByComplaint.has(cid)) reportsByComplaint.set(cid, []);
      reportsByComplaint.get(cid)!.push({
        id: r._id.toString(),
        reportedAt: r.reportedAt,
        remarks: r.remarks,
      });
    }

    return {
      totalUnresolvedReports: reports.length,
      complaintsWithUnresolvedReports: complaints.length,
      complaints: complaints.map((c) => ({
        id: c._id.toString(),
        referenceId: c.referenceId,
        title: c.title,
        hostelName: c.hostelName,
        roomNumber: c.roomNumber,
        status: c.status,
        priority: c.priority,
        unresolvedReportsCount: c.unresolvedReportsCount,
        reports: reportsByComplaint.get(c._id.toString()) || [],
      })),
    };
  }
}

export const communityService = new CommunityService();
