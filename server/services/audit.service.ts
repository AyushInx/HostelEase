import { Types } from 'mongoose';
import { AuditLog, IAuditLog } from '../models/AuditLog';

export class AuditService {
  async record(params: {
    actorId?: string | Types.ObjectId;
    actorName?: string;
    actorRole?: string;
    action: string;
    targetEntity: 'Complaint' | 'Staff' | 'Hostel' | 'SLA' | 'Auth' | 'Student';
    entityId: string;
    details: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<IAuditLog> {
    const entry = new AuditLog({
      actor: params.actorId ? new Types.ObjectId(params.actorId.toString()) : undefined,
      actorName: params.actorName || 'System',
      actorRole: params.actorRole || 'System',
      action: params.action,
      targetEntity: params.targetEntity,
      entityId: params.entityId,
      details: params.details,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      timestamp: new Date(),
    });
    return entry.save();
  }

  async getLogs(limit = 100, skip = 0): Promise<{ logs: IAuditLog[]; total: number }> {
    const [logs, total] = await Promise.all([
      AuditLog.find().sort({ timestamp: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments(),
    ]);
    return { logs, total };
  }
}

export const auditService = new AuditService();
