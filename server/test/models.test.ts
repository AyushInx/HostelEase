import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../models/User';
import { Complaint } from '../models/Complaint';
import { Support } from '../models/Support';
import { UnresolvedReport } from '../models/UnresolvedReport';
import { Escalation, canTriggerTier2Escalation } from '../models/Escalation';
import { Notification } from '../models/Notification';
import bcrypt from 'bcryptjs';

describe('Phase 4 Mongoose Models & Index Invariants', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    // Ensure all model indexes are created in MongoDB
    await User.init();
    await Complaint.init();
    await Support.init();
    await UnresolvedReport.init();
    await Escalation.init();
    await Notification.init();
  }, 120000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('enforces password hashing and secure verification on User model', async () => {
    const rawPassword = 'StudentSecret2026!';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const user = new User({
      name: 'Rohan Mehra',
      email: 'rohan.mehra@iitp.ac.in',
      passwordHash,
      role: 'Student',
      eligibilityStatus: 'approved',
    });
    await user.save();

    const isMatch = await user.comparePassword(rawPassword);
    const isWrongMatch = await user.comparePassword('WrongPassword');

    expect(isMatch).toBe(true);
    expect(isWrongMatch).toBe(false);

    // Verify toJSON excludes passwordHash
    const json = user.toJSON();
    expect((json as any).passwordHash).toBeUndefined();
  });

  it('enforces unique index constraint on Complaint referenceId', async () => {
    const studentId = new Types.ObjectId();
    const c1 = new Complaint({
      referenceId: 'HCT-2026-11111',
      student: studentId,
      studentName: 'Test Student',
      hostelName: 'C.V.R Hostel',
      roomNumber: 'A-101',
      category: 'Electrical',
      title: 'Light Flickering',
      description: 'The tube light flickers repeatedly in room A-101.',
      priority: 'Low',
    });
    await c1.save();

    const c2 = new Complaint({
      referenceId: 'HCT-2026-11111', // duplicate referenceId
      student: studentId,
      studentName: 'Another Student',
      hostelName: 'C.V.R Hostel',
      roomNumber: 'A-102',
      category: 'Plumbing',
      title: 'Tap Leaking',
      description: 'Tap leaking in bathroom.',
      priority: 'Medium',
    });

    let error: any;
    try {
      await c2.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.code).toBe(11000); // MongoDB duplicate key error
  });

  it('SPEC INVARIANT: enforces unique compound index on Support (complaint, student)', async () => {
    const complaintId = new Types.ObjectId();
    const studentId = new Types.ObjectId();

    // First support record succeeds
    const s1 = new Support({ complaint: complaintId, student: studentId });
    await s1.save();

    // Second support by same student on same complaint must fail
    const s2 = new Support({ complaint: complaintId, student: studentId });
    let error: any;
    try {
      await s2.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.code).toBe(11000);
  });

  it('SPEC INVARIANT: enforces unique compound index on UnresolvedReport (complaint, student)', async () => {
    const complaintId = new Types.ObjectId();
    const studentId = new Types.ObjectId();

    // First unresolved report succeeds
    const r1 = new UnresolvedReport({
      complaint: complaintId,
      student: studentId,
      remarks: 'Issue persists after marked resolved.',
    });
    await r1.save();

    // Second report by same student on same complaint must fail
    const r2 = new UnresolvedReport({
      complaint: complaintId,
      student: studentId,
      remarks: 'Still unresolved.',
    });

    let error: any;
    try {
      await r2.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.code).toBe(11000);
  });

  it('SPEC INVARIANT: enforces unique compound index on Escalation (complaint, slaType, escalationTier)', async () => {
    const complaintId = new Types.ObjectId();

    const e1 = new Escalation({
      complaint: complaintId,
      slaType: 'acknowledgment',
      escalationTier: 'tier1_warden',
      reason: 'Acknowledgment deadline exceeded (6 hours)',
      targetRole: 'Warden',
    });
    await e1.save();

    // Duplicate escalation for same SLA and tier must be blocked for idempotency
    const e2 = new Escalation({
      complaint: complaintId,
      slaType: 'acknowledgment',
      escalationTier: 'tier1_warden',
      reason: 'Duplicate tick',
      targetRole: 'Warden',
    });

    let error: any;
    try {
      await e2.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.code).toBe(11000);
  });

  it('SPEC RECONCILIATION: supports configurable gracePeriodMinutes and evaluates Tier 2 escalation eligibility', async () => {
    const complaintId = new Types.ObjectId();
    const e1 = new Escalation({
      complaint: complaintId,
      slaType: 'resolution',
      escalationTier: 'tier1_warden',
      reason: 'Resolution deadline exceeded (24 hours)',
      targetRole: 'Warden',
      gracePeriodMinutes: 120, // 2-hour grace period before Tier 2
    });
    await e1.save();
    expect(e1.gracePeriodMinutes).toBe(120);

    // Right after Tier 1 triggered, Tier 2 cannot trigger yet
    const justNow = new Date();
    expect(canTriggerTier2Escalation(justNow, 120)).toBe(false);

    // After 121 minutes have elapsed, Tier 2 is eligible to trigger
    const pastDate = new Date(Date.now() - 121 * 60 * 1000);
    expect(canTriggerTier2Escalation(pastDate, 120)).toBe(true);
  });

  it('SPEC RECONCILIATION: stores acknowledgedAt timestamp and creates Notification record', async () => {
    const student = await User.create({
      name: 'Test Student',
      email: 'test.std@iitp.ac.in',
      passwordHash: 'hashed',
      role: 'Student',
      hostelName: 'C.V.R Hostel',
      roomNumber: '101',
    });

    const complaint = new Complaint({
      referenceId: 'HCT-2026-99999',
      student: student._id,
      studentName: student.name,
      hostelName: student.hostelName,
      roomNumber: '101',
      category: 'Plumbing',
      title: 'Water tap leaking',
      description: 'The tap in bathroom is constantly dripping',
      status: 'Seen',
      acknowledgedAt: new Date(),
    });
    await complaint.save();
    expect(complaint.acknowledgedAt).toBeDefined();

    const notif = await Notification.create({
      recipient: student._id,
      type: 'reopen_rejected',
      title: 'Reopen Request Rejected',
      message: 'Reopen request rejected by Warden. Reason: Work verified satisfactory by inspection team.',
      link: `/complaints/${complaint._id}`,
    });
    expect(notif.recipient.toString()).toBe(student._id.toString());
    expect(notif.readStatus).toBe(false);
  });
});
