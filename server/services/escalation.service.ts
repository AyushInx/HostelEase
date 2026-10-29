import { Types } from 'mongoose';
import { Complaint, IComplaint } from '../models/Complaint';
import {
  Escalation,
  IEscalation,
  DEFAULT_SLA_CONFIG,
  IEscalationSLAConfig,
  canTriggerTier2Escalation,
} from '../models/Escalation';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { auditService } from './audit.service';

export interface EscalationEvaluationResult {
  checkedComplaints: number;
  acknowledgmentBreaches: number;
  resolutionBreaches: number;
  newEscalations: IEscalation[];
}

export class EscalationService {
  private slaConfig: Record<string, IEscalationSLAConfig> = JSON.parse(JSON.stringify(DEFAULT_SLA_CONFIG));
  private intervalTimer: NodeJS.Timeout | null = null;

  /**
   * Set or override SLA configuration for a specific priority (Emergency, High, Medium, Low)
   */
  setSLAConfig(priority: string, config: Partial<IEscalationSLAConfig>): void {
    if (!this.slaConfig[priority]) {
      this.slaConfig[priority] = { ...DEFAULT_SLA_CONFIG.Medium, ...config };
    } else {
      this.slaConfig[priority] = { ...this.slaConfig[priority], ...config };
    }
  }

  getSLAConfig(priority?: string): Record<string, IEscalationSLAConfig> | IEscalationSLAConfig {
    return priority ? this.slaConfig[priority] : this.slaConfig;
  }

  resetSLAConfig(): void {
    this.slaConfig = JSON.parse(JSON.stringify(DEFAULT_SLA_CONFIG));
  }

  /**
   * Evaluates active complaints against acknowledgment and resolution deadlines.
   * Completely idempotent and restart-safe.
   *
   * @param asOfDate Optional simulation timestamp for testing deadline math.
   */
  async evaluateEscalations(asOfDate: Date = new Date()): Promise<EscalationEvaluationResult> {
    const nowMs = asOfDate.getTime();
    const newEscalations: IEscalation[] = [];
    let ackBreaches = 0;
    let resBreaches = 0;

    // Find all non-terminal complaints
    const activeComplaints = await Complaint.find({
      status: { $nin: ['Resolved', 'Rejected'] },
    });

    for (const complaint of activeComplaints) {
      const priorityConfig = this.slaConfig[complaint.priority] || this.slaConfig.Medium;
      const createdMs = complaint.createdAt ? new Date(complaint.createdAt).getTime() : nowMs;
      const elapsedMinutes = Math.max(0, (nowMs - createdMs) / (60 * 1000));

      // -------------------------------------------------------------
      // 1. Acknowledgment SLA (Stops once ticket reaches 'Seen' or beyond)
      // -------------------------------------------------------------
      // Acknowledgment SLA evaluates only while status is 'Submitted'
      if (complaint.status === 'Submitted') {
        const ackDeadline = priorityConfig.acknowledgmentDeadlineMinutes;

        if (elapsedMinutes >= ackDeadline) {
          ackBreaches++;

          // Check if Tier 1 already created
          const existingTier1 = await Escalation.findOne({
            complaint: complaint._id,
            slaType: 'acknowledgment',
            escalationTier: 'tier1_warden',
          });

          if (!existingTier1) {
            const esc = await this.createEscalation({
              complaint,
              slaType: 'acknowledgment',
              escalationTier: 'tier1_warden',
              targetRole: 'Warden',
              reason: `Acknowledgment SLA breached (${elapsedMinutes.toFixed(0)}m elapsed vs ${ackDeadline}m deadline). Escalated to Warden.`,
              triggeredAt: asOfDate,
              gracePeriodMinutes: priorityConfig.tier2GracePeriodMinutes,
            });
            if (esc) {
              newEscalations.push(esc);
              complaint.escalationLevel = 'tier1_warden';
              await complaint.save();
            }
          } else {
            // Check Tier 2 grace period
            const gracePeriod = priorityConfig.tier2GracePeriodMinutes;
            const tier1TriggeredAt = existingTier1.triggeredAt;
            const tier1ElapsedMinutes = (nowMs - new Date(tier1TriggeredAt).getTime()) / (60 * 1000);

            if (tier1ElapsedMinutes >= gracePeriod) {
              const existingTier2 = await Escalation.findOne({
                complaint: complaint._id,
                slaType: 'acknowledgment',
                escalationTier: 'tier2_admin',
              });

              if (!existingTier2) {
                const esc = await this.createEscalation({
                  complaint,
                  slaType: 'acknowledgment',
                  escalationTier: 'tier2_admin',
                  targetRole: 'Hostel Admin',
                  reason: `Acknowledgment SLA critical breach (${tier1ElapsedMinutes.toFixed(0)}m elapsed since Tier 1 vs ${gracePeriod}m grace period). Escalated to Hostel Admin.`,
                  triggeredAt: asOfDate,
                });
                if (esc) {
                  newEscalations.push(esc);
                  complaint.escalationLevel = 'tier2_admin';
                  await complaint.save();
                }
              }
            }
          }
        }
      }

      // -------------------------------------------------------------
      // 2. Resolution SLA (Applies to all non-terminal complaints)
      // -------------------------------------------------------------
      const resDeadline = priorityConfig.resolutionDeadlineMinutes;

      if (elapsedMinutes >= resDeadline) {
        resBreaches++;

        // Check if Tier 1 already created
        const existingResTier1 = await Escalation.findOne({
          complaint: complaint._id,
          slaType: 'resolution',
          escalationTier: 'tier1_warden',
        });

        if (!existingResTier1) {
          const esc = await this.createEscalation({
            complaint,
            slaType: 'resolution',
            escalationTier: 'tier1_warden',
            targetRole: 'Warden',
            reason: `Resolution SLA breached (${elapsedMinutes.toFixed(0)}m elapsed vs ${resDeadline}m deadline). Escalated to Warden.`,
            triggeredAt: asOfDate,
            gracePeriodMinutes: priorityConfig.tier2GracePeriodMinutes,
          });
          if (esc) {
            newEscalations.push(esc);
            if (complaint.escalationLevel === 'none') {
              complaint.escalationLevel = 'tier1_warden';
              await complaint.save();
            }
          }
        } else {
          // Check Tier 2 grace period
          const gracePeriod = priorityConfig.tier2GracePeriodMinutes;
          const tier1TriggeredAt = existingResTier1.triggeredAt;
          const tier1ElapsedMinutes = (nowMs - new Date(tier1TriggeredAt).getTime()) / (60 * 1000);

          if (tier1ElapsedMinutes >= gracePeriod) {
            const existingResTier2 = await Escalation.findOne({
              complaint: complaint._id,
              slaType: 'resolution',
              escalationTier: 'tier2_admin',
            });

            if (!existingResTier2) {
              const esc = await this.createEscalation({
                complaint,
                slaType: 'resolution',
                escalationTier: 'tier2_admin',
                targetRole: 'Hostel Admin',
                reason: `Resolution SLA critical breach (${tier1ElapsedMinutes.toFixed(0)}m elapsed since Tier 1 vs ${gracePeriod}m grace period). Escalated to Hostel Admin.`,
                triggeredAt: asOfDate,
              });
              if (esc) {
                newEscalations.push(esc);
                complaint.escalationLevel = 'tier2_admin';
                await complaint.save();
              }
            }
          }
        }
      }
    }

    return {
      checkedComplaints: activeComplaints.length,
      acknowledgmentBreaches: ackBreaches,
      resolutionBreaches: resBreaches,
      newEscalations,
    };
  }

  /**
   * Strictly idempotent creation: unique compound index on (complaint, slaType, escalationTier)
   * guarantees zero duplicates across repeated runs and server restarts.
   */
  private async createEscalation(params: {
    complaint: IComplaint;
    slaType: 'acknowledgment' | 'resolution';
    escalationTier: 'tier1_warden' | 'tier2_admin';
    targetRole: 'Warden' | 'Hostel Admin';
    reason: string;
    triggeredAt: Date;
    gracePeriodMinutes?: number;
  }): Promise<IEscalation | null> {
    try {
      const escalation = new Escalation({
        complaint: params.complaint._id,
        slaType: params.slaType,
        escalationTier: params.escalationTier,
        targetRole: params.targetRole,
        reason: params.reason,
        triggeredAt: params.triggeredAt,
        gracePeriodMinutes: params.gracePeriodMinutes || 120,
      });

      await escalation.save();

      // Find recipient staff for notification
      let recipient = null;
      if (params.targetRole === 'Warden') {
        recipient = await User.findOne(
          params.complaint.hostelName
            ? { role: 'Warden', hostelName: params.complaint.hostelName }
            : { role: 'Warden' }
        );
        if (!recipient) {
          recipient = await User.findOne({ role: 'Warden' });
        }
      } else {
        recipient = await User.findOne({ role: 'Hostel Admin' });
      }
      if (recipient) {
        await Notification.create({
          recipient: recipient._id,
          type: 'escalation',
          title: `SLA Breach Escalation: ${params.complaint.referenceId}`,
          message: params.reason,
          link: `/complaints/${params.complaint._id}`,
          readStatus: false,
        });
      }

      await auditService.record({
        actorName: 'System Scheduler',
        actorRole: 'System',
        action: 'ESCALATION_TRIGGERED',
        targetEntity: 'Complaint',
        entityId: params.complaint.referenceId,
        details: `[${params.slaType.toUpperCase()} SLA - ${params.escalationTier}] ${params.reason}`,
      });

      return escalation;
    } catch (err: any) {
      if (err.code === 11000) {
        // Unique index collision: duplicate prevented idempotently
        return null;
      }
      throw err;
    }
  }

  startScheduler(intervalMs: number = 60000): void {
    if (this.intervalTimer) return;
    this.intervalTimer = setInterval(async () => {
      try {
        await this.evaluateEscalations();
      } catch (err: any) {
        console.error('❌ Error during background escalation evaluation:', err.message);
      }
    }, intervalMs);
  }

  stopScheduler(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }
}

export const escalationService = new EscalationService();
