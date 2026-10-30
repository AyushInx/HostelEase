import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { runSeed } from '../scripts/seed';
import { SESSION_COOKIE_NAME } from '../middleware/auth';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '../middleware/csrf';
import { Notification } from '../models/Notification';
import type { Express } from 'express';

import { connectDB } from '../config/db';

describe('Phase 4 Express REST API Endpoints', () => {
  let mongoServer: MongoMemoryServer;
  let app: Express;

  // Stored cookies and CSRF tokens
  let csrfToken: string;
  let csrfCookie: string;
  let studentCookie: string;
  let caretakerCookie: string;
  let technicianCookie: string;
  let wardenCookie: string;
  let adminCookie: string;

  const extractCookie = (res: any, name: string): string => {
    const raw = res.headers['set-cookie'];
    if (!raw) return '';
    const arr: string[] = Array.isArray(raw) ? raw : [raw];
    return arr.find((c: string) => c.startsWith(name)) || '';
  };

  // Helper for state-changing requests adhering strictly to authentic double-submit CSRF protection
  const post = (url: string, cookie?: string) => {
    const req = request(app).post(url).set(CSRF_HEADER_NAME, csrfToken);
    const cookies: string[] = [csrfCookie];
    if (cookie) cookies.push(cookie);
    return req.set('Cookie', cookies);
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectDB(uri);

    // Seed database with hostels, staff, students, and sample complaints
    await runSeed();
    app = createApp();

    // 1. Initial Handshake to obtain valid double-submit CSRF cookie & token
    const csrfRes = await request(app).get('/api/auth/csrf-token');
    csrfToken = csrfRes.body.data.csrfToken;
    csrfCookie = extractCookie(csrfRes, CSRF_COOKIE_NAME) || `${CSRF_COOKIE_NAME}=${csrfToken}`;

    // 2. Authenticate demo roles to obtain httpOnly session cookies
    const studentRes = await post('/api/auth/login').send({
      email: 'alex.sharma@iitp.ac.in',
      password: 'mock-student-pass',
    });
    studentCookie = extractCookie(studentRes, SESSION_COOKIE_NAME);

    const caretakerRes = await post('/api/auth/login').send({
      email: 'caretaker.kalam@iitp.ac.in',
      password: 'mock-staff-pass',
    });
    caretakerCookie = extractCookie(caretakerRes, SESSION_COOKIE_NAME);

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
  }, 120000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  // 1. CSRF Protection (SPEC Point 6)
  describe('CSRF Protection & Security Controls', () => {
    it('blocks mutating POST request when CSRF token is missing with 403', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Cookie', [studentCookie, csrfCookie])
        .send({ title: 'Test complaint' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('CSRF');
    });

    it('blocks mutating POST request when CSRF token header does not match cookie', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Cookie', [studentCookie, csrfCookie])
        .set(CSRF_HEADER_NAME, 'tampered-csrf-token-xyz')
        .send({ title: 'Test complaint' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('CSRF');
    });

    it('allows safe GET request and issues CSRF token', async () => {
      const res = await request(app).get('/api/auth/csrf-token');
      expect(res.status).toBe(200);
      expect(res.body.data.csrfToken).toBeDefined();
    });
  });

  // 2. Authentication & Session Security (SPEC Point 5)
  describe('Authentication (/api/auth)', () => {
    it('authenticates valid credentials and sets httpOnly session cookie', async () => {
      const res = await post('/api/auth/login').send({
        email: 'alex.sharma@iitp.ac.in',
        password: 'mock-student-pass',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('alex.sharma@iitp.ac.in');
      expect(res.body.data.user.role).toBe('Student');

      // SPEC INVARIANT: httpOnly session cookie
      const cookieHeader = extractCookie(res, SESSION_COOKIE_NAME);
      expect(cookieHeader).toBeTruthy();
      expect(cookieHeader.toLowerCase()).toContain('httponly');
    });

    it('rejects invalid password with 401', async () => {
      const res = await post('/api/auth/login').send({
        email: 'alex.sharma@iitp.ac.in',
        password: 'incorrect-password',
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns authenticated user profile on /api/auth/me', async () => {
      const res = await request(app).get('/api/auth/me').set('Cookie', studentCookie);
      expect(res.status).toBe(200);
      expect(res.body.data.user.name).toBe('Alex Sharma');
      expect(res.body.data.user.role).toBe('Student');
      expect(res.body.data.user.passwordHash).toBeUndefined(); // never leak hash
    });

    it('clears session cookie upon logout', async () => {
      const res = await post('/api/auth/logout', studentCookie);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('verifies demo access password correctly and rejects incorrect password', async () => {
      // Test incorrect password
      const badRes = await post('/api/auth/verify-demo').send({
        password: 'wrong-demo-password',
      });
      expect(badRes.status).toBe(401);
      expect(badRes.body.success).toBe(false);
      expect(badRes.body.error).toBe('Incorrect password. Please try again.');

      // Test correct password '280723'
      const goodRes = await post('/api/auth/verify-demo').send({
        password: '280723',
      });
      expect(goodRes.status).toBe(200);
      expect(goodRes.body.success).toBe(true);
      expect(goodRes.body.message).toBe('Demo access granted');
    });
  });

  // 3. Complaints Lifecycle & State Machine
  describe('Complaints Lifecycle (/api/complaints)', () => {
    let createdComplaintId: string;
    let createdReferenceId: string;

    it('allows student to register a complaint with generated ticket reference ID', async () => {
      const res = await post('/api/complaints', studentCookie).send({
        title: 'Geyser Heating Coil Burnout',
        category: 'Electrical',
        description: 'The water geyser in bathroom 3 is not heating and emits burning odor.',
        roomNumber: 'B-304',
        block: 'B Block',
        priority: 'High',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.referenceId).toMatch(/^HCT-2026-\d{5}$/);
      expect(res.body.data.status).toBe('Submitted');

      createdComplaintId = res.body.data._id;
      createdReferenceId = res.body.data.referenceId;
    });

    it('lists complaints scoped to student and filters by status', async () => {
      const res = await request(app)
        .get('/api/complaints?status=Submitted')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].status).toBe('Submitted');
    });

    it('fetches complaint detail including immutable status timeline', async () => {
      const res = await request(app)
        .get(`/api/complaints/${createdReferenceId}`)
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.complaint.title).toBe('Geyser Heating Coil Burnout');
      expect(res.body.data.timeline.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.timeline[0].fromStatus).toBe('Submitted');
    });

    // SPEC Point 4: Acknowledgment SLA stops at Seen
    it('allows Caretaker to acknowledge complaint (Submitted -> Seen) and stops Acknowledgment SLA clock', async () => {
      const res = await post(`/api/complaints/${createdComplaintId}/acknowledge`, caretakerCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Seen');
      expect(res.body.data.acknowledgedAt).toBeDefined();
    });

    it('allows Caretaker to assign technician (Seen -> Assigned)', async () => {
      const staffRes = await request(app)
        .get('/api/staff/accounts?role=Technician')
        .set('Cookie', caretakerCookie);
      const tech = staffRes.body.data.find((t: any) => t.email === 'tech.raj@iitp.ac.in');

      const res = await post(`/api/complaints/${createdComplaintId}/assign`, caretakerCookie).send({
        technicianId: tech._id,
        notes: 'Priority replacement of heating coil.',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Assigned');
      expect(res.body.data.assignedTechnicianName).toBe(tech.name);
    });

    it('allows Technician to start work (Assigned -> In Progress)', async () => {
      const res = await post(`/api/complaints/${createdComplaintId}/start-work`, technicianCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('In Progress');
    });

    it('allows Technician to complete work with repair notes (In Progress -> Work Completed)', async () => {
      const res = await post(`/api/complaints/${createdComplaintId}/complete-work`, technicianCookie).send({
        repairNotes: 'Replaced 2000W heating element and thermostatic switch.',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Work Completed');
      expect(res.body.data.repairNotes).toContain('heating element');
    });

    // SPEC Point 2: Transition Work Completed -> In Progress (Warden only, mandatory reason)
    it('allows Warden to return Work Completed to In Progress with mandatory reason', async () => {
      // 1. Caretaker cannot return to in-progress (must be 403)
      const caretakerRes = await post(`/api/complaints/${createdComplaintId}/return-in-progress`, caretakerCookie).send({
        reason: 'Water is still leaking after inspection.',
      });
      expect(caretakerRes.status).toBe(403);

      // 2. Empty reason must fail with 400
      const emptyReasonRes = await post(`/api/complaints/${createdComplaintId}/return-in-progress`, wardenCookie).send({
        reason: '',
      });
      expect(emptyReasonRes.status).toBe(400);

      // 3. Warden with mandatory reason returns ticket to In Progress
      const wardenRes = await post(`/api/complaints/${createdComplaintId}/return-in-progress`, wardenCookie).send({
        reason: 'Physical inspection failed; thermostatic switch is not tripping properly.',
      });
      expect(wardenRes.status).toBe(200);
      expect(wardenRes.body.data.status).toBe('In Progress');

      // Move it back to Work Completed for subsequent resolution tests
      await post(`/api/complaints/${createdComplaintId}/complete-work`, technicianCookie).send({
        repairNotes: 'Replaced switch unit and tested trip circuit successfully.',
      });
    });

    it('allows Warden to confirm final resolution (Work Completed -> Resolved)', async () => {
      const res = await post(`/api/complaints/${createdComplaintId}/confirm-resolution`, wardenCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Resolved');
    });

    it('allows Student to submit a reopen request on resolved ticket', async () => {
      const res = await post(`/api/complaints/${createdComplaintId}/reopen-request`, studentCookie).send({
        reason: 'Water is still only lukewarm after 30 minutes.',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Reopened');
    });

    // SPEC Point 1: Rejected reopen request (ticket stays Resolved, student notified with reason, audit written)
    it('allows Warden/Caretaker to reject reopen request: ticket stays Resolved, student notified with reason', async () => {
      // 1. Technician cannot reject reopen request (403)
      const techRes = await post(`/api/complaints/${createdComplaintId}/reject-reopen`, technicianCookie).send({
        reason: 'Reopened ticket rejected by technician.',
      });
      expect(techRes.status).toBe(403);

      // 2. Rejecting without reason fails (400)
      const emptyRes = await post(`/api/complaints/${createdComplaintId}/reject-reopen`, wardenCookie).send({
        reason: '',
      });
      expect(emptyRes.status).toBe(400);

      // 3. Warden rejects reopen request with valid reason
      const rejectRes = await post(`/api/complaints/${createdComplaintId}/reject-reopen`, wardenCookie).send({
        reason: 'Temperature logged at 65C during inspection. Issue verified resolved.',
      });
      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.data.status).toBe('Resolved');

      // Verify student received Notification
      const studentNotification = await Notification.findOne({
        recipient: rejectRes.body.data.student,
        type: 'reopen_rejected',
      });
      expect(studentNotification).toBeDefined();
      expect(studentNotification?.message).toContain('65C during inspection');

      // 4. Student can reopen again if new issues occur, and Warden approves
      await post(`/api/complaints/${createdComplaintId}/reopen-request`, studentCookie).send({
        reason: 'Power tripped when turned on this morning.',
      });
      const approveRes = await post(`/api/complaints/${createdComplaintId}/approve-reopen`, wardenCookie);
      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe('Assigned');
    });

    it('SPEC INVARIANT: Rejection is allowed for Caretaker and Warden ONLY, with mandatory reason', async () => {
      // 1. Technician cannot reject (must be 403)
      const techRejectRes = await post(`/api/complaints/${createdComplaintId}/reject`, technicianCookie).send({
        reason: 'Cannot fix this',
      });
      expect(techRejectRes.status).toBe(403);

      // 2. Caretaker rejection without reason must be rejected with 400
      const emptyReasonRes = await post(`/api/complaints/${createdComplaintId}/reject`, caretakerCookie).send({
        reason: '',
      });
      expect(emptyReasonRes.status).toBe(400);

      // 3. Caretaker rejection with valid reason succeeds
      const validRejectRes = await post(`/api/complaints/${createdComplaintId}/reject`, caretakerCookie).send({
        reason: 'Personal private geyser not supported by hostel maintenance.',
      });

      expect(validRejectRes.status).toBe(200);
      expect(validRejectRes.body.data.status).toBe('Rejected');
    });
  });

  // 4. Community Feed, Support (+1), Comments, and Unresolved Reporting
  describe('Community Hub (/api/community)', () => {
    let testComplaintId: string;

    beforeAll(async () => {
      const list = await request(app).get('/api/complaints').set('Cookie', studentCookie);
      testComplaintId = list.body.data[0]._id;
    });

    it('provides community feed without leaking student emails or private details', async () => {
      const res = await request(app).get('/api/community/feed').set('Cookie', studentCookie);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      for (const item of res.body.data) {
        expect(item.studentEmail).toBeUndefined();
        expect(item.email).toBeUndefined();
        expect(item.phone).toBeUndefined();
      }
    });

    it('toggles community support (+1) once per student cleanly', async () => {
      const res1 = await post(`/api/community/${testComplaintId}/support`, studentCookie);
      expect(res1.status).toBe(200);
      expect(res1.body.data.supported).toBe(true);

      const res2 = await post(`/api/community/${testComplaintId}/support`, studentCookie);
      expect(res2.status).toBe(200);
      expect(res2.body.data.supported).toBe(false);
    });

    it('allows submitting discussion comments on complaints', async () => {
      const res = await post(`/api/community/${testComplaintId}/comments`, studentCookie).send({
        content: 'Experiencing the same issue on floor 3.',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe('Experiencing the same issue on floor 3.');
      expect(res.body.data.authorName).toBe('Alex Sharma');
    });

    it('SPEC INVARIANT: prevents duplicate unresolved reports by same student on same complaint (409 Conflict)', async () => {
      const res1 = await post(`/api/community/${testComplaintId}/unresolved`, studentCookie).send({
        remarks: 'Still leaking',
      });
      expect(res1.status).toBe(200);
      expect(res1.body.data.reported).toBe(true);

      const res2 = await post(`/api/community/${testComplaintId}/unresolved`, studentCookie).send({
        remarks: 'Attempting duplicate report',
      });
      expect(res2.status).toBe(409);
      expect(res2.body.error).toContain('already reported');
    });
  });

  // 5. Staff & Hostel Admin Endpoints
  describe('Staff & Admin Management (/api/staff & /api/audit)', () => {
    it('allows Admin to configure new hostel block', async () => {
      const hostels = await request(app).get('/api/staff/hostels').set('Cookie', adminCookie);
      const cvr = hostels.body.data.find((h: any) => h.code === 'CVR');

      const res = await post(`/api/staff/hostels/${cvr._id}/blocks`, adminCookie).send({
        name: 'C Block Annex',
        floors: 4,
        roomsCount: 80,
      });

      expect(res.status).toBe(201);
      expect(res.body.data.blocks.some((b: any) => b.name === 'C Block Annex')).toBe(true);
    });

    it('allows Admin to provision staff account', async () => {
      const res = await post('/api/staff/accounts', adminCookie).send({
        name: 'Ravi Teja',
        email: 'tech.ravi@iitp.ac.in',
        role: 'Technician',
        specialization: 'HVAC & Refrigeration',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Ravi Teja');
      expect(res.body.data.role).toBe('Technician');
    });

    it('allows Admin to inspect append-only immutable audit logs', async () => {
      const res = await request(app).get('/api/audit').set('Cookie', adminCookie);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(1);

      // Verify non-admins cannot access audit logs
      const studentAuditRes = await request(app).get('/api/audit').set('Cookie', studentCookie);
      expect(studentAuditRes.status).toBe(403);
    });

    it('returns 501 for incomplete deferred endpoints', async () => {
      const notifRes = await request(app).get('/api/notifications').set('Cookie', studentCookie);
      expect(notifRes.status).toBe(501);
      expect(notifRes.body.error).toContain('Incomplete');

      const schedulerRes = await post('/api/escalations/scheduler', adminCookie);
      expect(schedulerRes.status).toBe(501);
      expect(schedulerRes.body.error).toContain('Incomplete');
    });
  });
});
