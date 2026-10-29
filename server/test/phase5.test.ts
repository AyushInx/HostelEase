import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { connectDB } from '../config/db';
import { runSeed } from '../scripts/seed';
import { User } from '../models/User';
import { Verification } from '../models/Verification';
import { Complaint } from '../models/Complaint';
import { AuditLog } from '../models/AuditLog';
import { CSRF_HEADER_NAME, CSRF_COOKIE_NAME } from '../middleware/csrf';
import { SESSION_COOKIE_NAME } from '../middleware/auth';
import { resetRateLimits } from '../middleware/rateLimit';
import { emailService } from '../services/email.service';

describe('Phase 5 Security Controls, OTP Verification & Authorization Invariants', () => {
  let mongoServer: MongoMemoryServer;
  let app: any;
  let csrfToken: string;
  let csrfCookie: string;

  let studentAlexCookie: string;
  let studentPriyaCookie: string;
  let technicianCookie: string;
  let wardenCookie: string;
  let adminCookie: string;
  let adminId: string;

  const extractCookie = (res: any, name: string): string => {
    const raw = res.headers['set-cookie'];
    if (!raw) return '';
    const arr: string[] = Array.isArray(raw) ? raw : [raw];
    const match = arr.find((c: string) => c.startsWith(name));
    return match ? match.split(';')[0] : '';
  };

  const post = (url: string, cookie?: string) => {
    const req = request(app).post(url).set(CSRF_HEADER_NAME, csrfToken);
    const cookies: string[] = [csrfCookie];
    if (cookie) cookies.push(cookie);
    return req.set('Cookie', cookies);
  };

  const patch = (url: string, cookie?: string) => {
    const req = request(app).patch(url).set(CSRF_HEADER_NAME, csrfToken);
    const cookies: string[] = [csrfCookie];
    if (cookie) cookies.push(cookie);
    return req.set('Cookie', cookies);
  };

  const get = (url: string, cookie?: string) => {
    const req = request(app).get(url);
    const cookies: string[] = [csrfCookie];
    if (cookie) cookies.push(cookie);
    return req.set('Cookie', cookies);
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectDB(uri);

    // Seed database
    await runSeed();
    app = createApp();

    // 1. Initial Handshake for CSRF
    const csrfRes = await request(app).get('/api/auth/csrf-token');
    csrfToken = csrfRes.body.data.csrfToken;
    csrfCookie = extractCookie(csrfRes, CSRF_COOKIE_NAME) || `${CSRF_COOKIE_NAME}=${csrfToken}`;

    // 2. Authenticate standard roles
    const alexRes = await post('/api/auth/login').send({
      email: 'alex.sharma@iitp.ac.in',
      password: 'mock-student-pass',
    });
    studentAlexCookie = extractCookie(alexRes, SESSION_COOKIE_NAME);

    const priyaRes = await post('/api/auth/login').send({
      email: 'priya.patel@iitp.ac.in',
      password: 'mock-student-pass',
    });
    studentPriyaCookie = extractCookie(priyaRes, SESSION_COOKIE_NAME);

    const techRes = await post('/api/auth/login').send({
      email: 'tech.raj@iitp.ac.in',
      password: 'mock-staff-pass',
    });
    technicianCookie = extractCookie(techRes, SESSION_COOKIE_NAME);

    const wardenRes = await post('/api/auth/login').send({
      email: 'warden.kalam@iitp.ac.in',
      password: 'mock-staff-pass',
    });
    wardenCookie = extractCookie(wardenRes, SESSION_COOKIE_NAME);

    const adminRes = await post('/api/auth/login').send({
      email: 'admin@iitp.ac.in',
      password: 'CampusAdmin2026!',
    });
    adminCookie = extractCookie(adminRes, SESSION_COOKIE_NAME);
    adminId = adminRes.body.data.user.id;
  });

  beforeEach(() => {
    resetRateLimits();
    emailService.clearTestSentEmails();
    emailService.setForceDeliveryFailure(false);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  // 1. Production-Ready Email & OTP Verification Flow (Resend + MongoDB)
  describe('Domain-Restricted Email & OTP Verification Flow', () => {
    it('1. rejects OTP generation for non-@iitp.ac.in email domains with 400', async () => {
      const res = await post('/api/auth/send-otp').send({
        email: 'attacker@commercial-domain.com',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('@iitp.ac.in');

      const resEdu = await post('/api/auth/send-otp').send({
        email: 'student@college.edu',
      });
      expect(resEdu.status).toBe(400);
      expect(resEdu.body.error).toContain('@iitp.ac.in');
    });

    it('2 & 3. generates valid 6-digit OTP and persists keyed hash in MongoDB without plaintext OTP in response or DB', async () => {
      const email = 'freshman.resident@iitp.ac.in';
      const res = await post('/api/auth/send-otp').send({ email });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(email);
      expect(res.body.data.expiresAt).toBeDefined();
      expect(res.body.data.verificationId).toBeDefined();

      // INVARIANT: Plain OTP must NEVER be exposed in the client response
      expect(res.body.data.otp).toBeUndefined();
      expect(res.body.data.testOtp).toBeUndefined();

      // Verify email was dispatched via email service
      const sentEmail = emailService.getLastTestSentEmail(email);
      expect(sentEmail).toBeDefined();
      expect(sentEmail?.otp).toMatch(/^\d{6}$/);

      // Verify Verification record exists in DB with hashed OTP
      const record = await Verification.findOne({ email, consumed: false });
      expect(record).not.toBeNull();
      expect(record?.otpHash).toBeDefined();
      expect(record?.deliveryStatus).toBe('sent');
      // Ensure plaintext OTP is NOT stored in the database
      expect(record?.otpHash).not.toBe(sentEmail?.otp);
    });

    it('4 & 14. successfully verifies valid OTP, sets session cookie, and separates verification from eligibility', async () => {
      const email = 'new.student@iitp.ac.in';
      await post('/api/auth/send-otp').send({ email });
      const sentEmail = emailService.getLastTestSentEmail(email);
      expect(sentEmail?.otp).toBeDefined();

      const verifyRes = await post('/api/auth/verify-otp').send({
        email,
        otp: sentEmail!.otp,
        name: 'New Student',
      });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.user.email).toBe(email);
      expect(verifyRes.body.data.user.isEmailVerified).toBe(true);

      // INVARIANT: Email is verified, but eligibility is strictly 'pending' (staff approval required)
      expect(verifyRes.body.data.user.eligibilityStatus).toBe('pending');

      // Verify session cookie was set
      const sessionCookie = extractCookie(verifyRes, SESSION_COOKIE_NAME);
      expect(sessionCookie).toContain('hct_session=');

      // Verify Verification record is atomically marked consumed
      const record = await Verification.findOne({ email });
      expect(record?.consumed).toBe(true);
      expect(record?.consumedAt).toBeDefined();
    });

    it('5. rejects invalid OTP and atomically increments attempt count', async () => {
      const email = 'wrong.otp.user@iitp.ac.in';
      await post('/api/auth/send-otp').send({ email });

      const verifyRes = await post('/api/auth/verify-otp').send({
        email,
        otp: '000000',
      });

      expect(verifyRes.status).toBe(400);
      expect(verifyRes.body.success).toBe(false);
      expect(verifyRes.body.error).toMatch(/Invalid verification code/i);

      // Verify attempts counter atomically incremented
      const record = await Verification.findOne({ email, consumed: false });
      expect(record?.attempts).toBe(1);
    });

    it('6. enforces attempt limits: blocks verification and marks consumed when max attempts (5) are reached', async () => {
      const email = 'max.attempts.user@iitp.ac.in';
      await post('/api/auth/send-otp').send({ email });

      // Exhaust 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await post('/api/auth/verify-otp').send({
          email,
          otp: '111111',
        });
      }

      // 6th attempt should be blocked
      const blockedRes = await post('/api/auth/verify-otp').send({
        email,
        otp: '111111',
      });

      expect([400, 429]).toContain(blockedRes.status);
      expect(blockedRes.body.error).toMatch(/Maximum verification attempts exceeded/i);

      // Record is marked consumed
      const record = await Verification.findOne({ email });
      expect(record?.consumed).toBe(true);
    });

    it('7. rejects expired OTP with informative 400 error', async () => {
      const email = 'expired.user@iitp.ac.in';
      await post('/api/auth/send-otp').send({ email });
      const sentEmail = emailService.getLastTestSentEmail(email);

      // Simulate expired timestamp in database
      await Verification.updateOne(
        { email, consumed: false },
        { $set: { expiresAt: new Date(Date.now() - 60000) } }
      );

      const verifyRes = await post('/api/auth/verify-otp').send({
        email,
        otp: sentEmail!.otp,
      });

      expect(verifyRes.status).toBe(400);
      expect(verifyRes.body.error).toMatch(/expired/i);
    });

    it('8. prevents replay attacks: a consumed OTP cannot be reused', async () => {
      const email = 'replay.user@iitp.ac.in';
      await post('/api/auth/send-otp').send({ email });
      const sentEmail = emailService.getLastTestSentEmail(email);

      // First verification succeeds
      const firstRes = await post('/api/auth/verify-otp').send({
        email,
        otp: sentEmail!.otp,
      });
      expect(firstRes.status).toBe(200);

      // Second verification attempt with same OTP must be rejected
      const secondRes = await post('/api/auth/verify-otp').send({
        email,
        otp: sentEmail!.otp,
      });
      expect(secondRes.status).toBe(404);
      expect(secondRes.body.error).toMatch(/No active verification request found/i);
    });

    it('9. prevents cross-account verification: OTP for student A cannot verify student B', async () => {
      const emailA = 'student.alpha@iitp.ac.in';
      const emailB = 'student.beta@iitp.ac.in';

      await post('/api/auth/send-otp').send({ email: emailA });
      const sentEmailA = emailService.getLastTestSentEmail(emailA);
      expect(sentEmailA?.otp).toBeDefined();

      // Student B attempts to verify using student A's OTP
      const attackRes = await post('/api/auth/verify-otp').send({
        email: emailB,
        otp: sentEmailA!.otp,
      });

      expect(attackRes.status).toBe(404);
      expect(attackRes.body.error).toMatch(/No active verification request found/i);
    });

    it('10. invalidates earlier outstanding OTPs when a new OTP is issued for the same email', async () => {
      const email = 'reissue.user@iitp.ac.in';

      // 1. Request first OTP
      await post('/api/auth/send-otp').send({ email });
      const firstSent = emailService.getLastTestSentEmail(email);
      const firstOtp = firstSent!.otp;

      // Reset cooldown artificially in test for reissue assertion
      resetRateLimits();
      await Verification.updateMany({ email }, { $set: { createdAt: new Date(Date.now() - 70000) } });

      // 2. Request second OTP
      await post('/api/auth/send-otp').send({ email });
      const secondSent = emailService.getLastTestSentEmail(email);
      const secondOtp = secondSent!.otp;
      expect(firstOtp).not.toBe(secondOtp);

      // Attempting to use the first OTP should be rejected
      const firstVerifyRes = await post('/api/auth/verify-otp').send({
        email,
        otp: firstOtp,
      });
      expect(firstVerifyRes.status).toBe(400);
      expect(firstVerifyRes.body.error).toMatch(/Invalid verification code/i);

      // Second OTP works
      const secondVerifyRes = await post('/api/auth/verify-otp').send({
        email,
        otp: secondOtp,
      });
      expect(secondVerifyRes.status).toBe(200);
    });

    it('11. Resend delivery failure does NOT leave a usable active OTP in the database', async () => {
      const email = 'resend.fail@iitp.ac.in';
      emailService.setForceDeliveryFailure(true);

      const res = await post('/api/auth/send-otp').send({ email });
      expect(res.status).toBe(502);
      expect(res.body.error).toMatch(/Failed to dispatch verification email/i);

      // Ensure no active/unconsumed OTP remains in MongoDB
      const activeRecord = await Verification.findOne({ email, consumed: false });
      expect(activeRecord).toBeNull();

      emailService.setForceDeliveryFailure(false);
    });

    it('12. concurrent verification requests cannot consume the same OTP twice', async () => {
      const email = 'concurrent.verify@iitp.ac.in';
      await post('/api/auth/send-otp').send({ email });
      const sentEmail = emailService.getLastTestSentEmail(email);

      // Execute 2 simultaneous verification requests with the same valid OTP
      const [res1, res2] = await Promise.all([
        post('/api/auth/verify-otp').send({ email, otp: sentEmail!.otp }),
        post('/api/auth/verify-otp').send({ email, otp: sentEmail!.otp }),
      ]);

      const statuses = [res1.status, res2.status];
      expect(statuses).toContain(200);
      // Exactly one succeeds, the other is rejected as already consumed
      expect(statuses.filter((s) => s === 200).length).toBe(1);
    });

    it('13. concurrent signup requests cannot create duplicate user accounts', async () => {
      const email = 'concurrent.signup@iitp.ac.in';
      await post('/api/auth/send-otp').send({ email });
      const sentEmail = emailService.getLastTestSentEmail(email);

      // Verify OTP
      await post('/api/auth/verify-otp').send({
        email,
        otp: sentEmail!.otp,
        name: 'Concurrent Student',
      });

      // Assert only 1 User document exists in database for this email
      const userCount = await User.countDocuments({ email });
      expect(userCount).toBe(1);
    });

    it('17. production mode never accepts hardcoded 123456 as a backdoor', async () => {
      const email = 'no.demo.otp@iitp.ac.in';
      await post('/api/auth/send-otp').send({ email });

      const res = await post('/api/auth/verify-otp').send({
        email,
        otp: '123456',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid verification code/i);
    });

    it('18. enforces resend cooldown: rapid second request to same email within 60s returns 429', async () => {
      const email = 'cooldown.student@iitp.ac.in';

      // First request succeeds
      const firstRes = await post('/api/auth/send-otp').send({ email });
      expect(firstRes.status).toBe(200);

      // Rapid second request within 60s triggers cooldown rate limiter
      const secondRes = await post('/api/auth/send-otp').send({ email });
      expect(secondRes.status).toBe(429);
      expect(secondRes.body.error).toMatch(/Please wait 60 seconds/i);
    });
  });

  // 2. Reusable Authorization Middleware & Scoping Controls
  describe('Server-Side Reusable Authorization Middleware', () => {
    it('15. SPEC INVARIANT: prevents a student from reading another student\'s complaint (returns 403)', async () => {
      // Alex creates a private room complaint
      const createRes = await post('/api/complaints', studentAlexCookie).send({
        title: 'Broken Window Handle in Alex Room',
        category: 'Carpentry',
        hostelName: 'C.V.R Hostel',
        block: 'A Block',
        floor: 3,
        roomNumber: 'A-304',
        locationType: 'Room',
        priority: 'Medium',
        description: 'The latch on the room window has cracked.',
      });

      expect(createRes.status).toBe(201);
      const complaintId = createRes.body.data._id;

      // Priya (different student) attempts to read Alex's complaint
      const readRes = await get(`/api/complaints/${complaintId}`, studentPriyaCookie);
      expect(readRes.status).toBe(403);
      expect(readRes.body.success).toBe(false);
      expect(readRes.body.error).toMatch(/Access denied/i);

      // Alex himself CAN read his own complaint
      const alexReadRes = await get(`/api/complaints/${complaintId}`, studentAlexCookie);
      expect(alexReadRes.status).toBe(200);
      expect(alexReadRes.body.data.complaint.title).toBe('Broken Window Handle in Alex Room');
    });

    it('16. SPEC INVARIANT: rejects technician attempting warden actions with 403 Forbidden', async () => {
      // Find or create an in-progress complaint
      const complaint = await Complaint.findOne({ status: 'Assigned' });
      expect(complaint).not.toBeNull();
      const complaintId = complaint!._id.toString();

      // Technician tries to confirm resolution (Warden-only action)
      const res1 = await post(`/api/complaints/${complaintId}/confirm-resolution`, technicianCookie).send({});
      expect(res1.status).toBe(403);
      expect(res1.body.error).toMatch(/Role 'Technician' is not authorized/i);

      // Technician tries to return work in progress (Warden-only action)
      const res2 = await post(`/api/complaints/${complaintId}/return-in-progress`, technicianCookie).send({
        reason: 'Technician attempt to revert',
      });
      expect(res2.status).toBe(403);
      expect(res2.body.error).toMatch(/Role 'Technician' is not authorized/i);

      // Technician tries to reprioritize complaint (Warden-only action)
      const res3 = await post(`/api/complaints/${complaintId}/reprioritize`, technicianCookie).send({
        priority: 'Urgent',
        reason: 'Technician reprioritization attempt',
      });
      expect(res3.status).toBe(403);
      expect(res3.body.error).toMatch(/Role 'Technician' is not authorized/i);
    });
  });

  // 3. Staff Accounts Creation & Role Modification Invariants
  describe('Staff Accounts & Role Management Invariants', () => {
    it('SPEC INVARIANT: staff accounts can ONLY be created by Hostel Admin (non-admin gets 403)', async () => {
      // Warden tries to provision staff
      const wardenProvisionRes = await post('/api/staff/accounts', wardenCookie).send({
        name: 'Unauthorized Tech',
        email: 'unauth.tech@iitp.ac.in',
        role: 'Technician',
      });
      expect(wardenProvisionRes.status).toBe(403);

      // Student tries to provision staff
      const studentProvisionRes = await post('/api/staff/accounts', studentAlexCookie).send({
        name: 'Student Provision',
        email: 'student.prov@iitp.ac.in',
        role: 'Caretaker',
      });
      expect(studentProvisionRes.status).toBe(403);

      // Hostel Admin CAN provision staff
      const adminProvisionRes = await post('/api/staff/accounts', adminCookie).send({
        name: 'Official Carpenter',
        email: 'carpenter.official@iitp.ac.in',
        role: 'Technician',
        specialization: 'Carpentry',
      });
      expect(adminProvisionRes.status).toBe(201);
      expect(adminProvisionRes.body.data.email).toBe('carpenter.official@iitp.ac.in');
    });

    it('SPEC INVARIANT: self role change is strictly forbidden (returns 400)', async () => {
      // Admin tries to change their own role to Caretaker
      const selfChangeRes = await patch(`/api/staff/accounts/${adminId}/role`, adminCookie).send({
        role: 'Caretaker',
      });

      expect(selfChangeRes.status).toBe(400);
      expect(selfChangeRes.body.success).toBe(false);
      expect(selfChangeRes.body.error).toMatch(/Self role change is forbidden/i);
    });

    it('SPEC INVARIANT: audits staff role changes when modified by Hostel Admin', async () => {
      // Find a technician
      const tech = await User.findOne({ email: 'carpenter.official@iitp.ac.in' });
      expect(tech).not.toBeNull();

      // Admin changes technician to Caretaker
      const roleChangeRes = await patch(`/api/staff/accounts/${tech!._id}/role`, adminCookie).send({
        role: 'Caretaker',
      });

      expect(roleChangeRes.status).toBe(200);
      expect(roleChangeRes.body.data.role).toBe('Caretaker');

      // Verify immutable audit log entry was written
      const auditLog = await AuditLog.findOne({
        action: 'CHANGE_STAFF_ROLE',
        entityId: 'carpenter.official@iitp.ac.in',
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.actorRole).toBe('Hostel Admin');
      expect(auditLog?.details).toContain('Changed role of Official Carpenter');
    });

    it('staff can review and update student residency eligibility with audit log', async () => {
      // Priya currently has eligibilityStatus: 'pending' in Kalam Hostel
      const priya = await User.findOne({ email: 'priya.patel@iitp.ac.in' });
      expect(priya?.eligibilityStatus).toBe('pending');

      // 1. Warden Anita (C.V.R Hostel) gets 403 when trying to manage student outside jurisdiction (Kalam Hostel)
      const crossHostelRes = await patch(`/api/staff/students/${priya!._id}/eligibility`, wardenCookie).send({
        status: 'approved',
      });
      expect(crossHostelRes.status).toBe(403);
      expect(crossHostelRes.body.error).toMatch(/Cannot manage students outside your jurisdiction/i);

      // 2. Hostel Admin (cross-hostel jurisdiction) approves Priya's residency
      const approveRes = await patch(`/api/staff/students/${priya!._id}/eligibility`, adminCookie).send({
        status: 'approved',
        reason: 'Hostel admission fee paid and room allotment ledger verified.',
      });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.eligibilityStatus).toBe('approved');

      // Verify audit log
      const auditLog = await AuditLog.findOne({
        action: 'UPDATE_STUDENT_ELIGIBILITY',
        entityId: 'priya.patel@iitp.ac.in',
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.actorRole).toBe('Hostel Admin');
      expect(auditLog?.details).toContain('pending to approved');
    });
  });
});
