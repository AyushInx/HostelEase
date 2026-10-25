import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { runSeed } from '../scripts/seed';
import { SESSION_COOKIE_NAME } from '../middleware/auth';
import type { Express } from 'express';

import { connectDB } from '../config/db';

describe('Phase 4 Express REST API Endpoints', () => {
  let mongoServer: MongoMemoryServer;
  let app: Express;

  // Stored cookies for authenticated test sessions
  let studentCookie: string;
  let caretakerCookie: string;
  let technicianCookie: string;
  let wardenCookie: string;
  let adminCookie: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectDB(uri);

    // Seed database with hostels, staff, students, and sample complaints
    await runSeed();
    app = createApp();

    // Authenticate demo roles to obtain httpOnly cookies
    const studentRes = await request(app).post('/api/auth/login').send({
      email: 'alex.sharma@college.edu',
      password: 'mock-student-pass',
    });
    studentCookie = studentRes.headers['set-cookie'][0];

    const caretakerRes = await request(app).post('/api/auth/login').send({
      email: 'caretaker.mandakini@hostel.edu',
      password: 'mock-staff-pass',
    });
    caretakerCookie = caretakerRes.headers['set-cookie'][0];

    const techRes = await request(app).post('/api/auth/login').send({
      email: 'tech.raj@hostel.edu',
      password: 'mock-staff-pass',
    });
    technicianCookie = techRes.headers['set-cookie'][0];

    const wardenRes = await request(app).post('/api/auth/login').send({
      email: 'warden.mandakini@hostel.edu',
      password: 'mock-staff-pass',
    });
    wardenCookie = wardenRes.headers['set-cookie'][0];

    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@campus.edu',
      password: 'CampusAdmin2026!',
    });
    adminCookie = adminRes.headers['set-cookie'][0];
  }, 120000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  // 1. Authentication & Session Security
  describe('Authentication (/api/auth)', () => {
    it('authenticates valid credentials and sets httpOnly session cookie', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'alex.sharma@college.edu',
        password: 'mock-student-pass',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('alex.sharma@college.edu');
      expect(res.body.data.user.role).toBe('Student');

      // SPEC INVARIANT: httpOnly session cookie (no tokens in localStorage)
      const cookieHeader = res.headers['set-cookie'][0];
      expect(cookieHeader).toContain(SESSION_COOKIE_NAME);
      expect(cookieHeader.toLowerCase()).toContain('httponly');
    });

    it('rejects invalid password with 401', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'alex.sharma@college.edu',
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
      const res = await request(app).post('/api/auth/logout').set('Cookie', studentCookie);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // 2. Complaints Lifecycle & State Machine
  describe('Complaints Lifecycle (/api/complaints)', () => {
    let createdComplaintId: string;
    let createdReferenceId: string;

    it('allows student to register a complaint with generated ticket reference ID', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Cookie', studentCookie)
        .send({
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

    it('allows Caretaker to acknowledge complaint (Submitted -> Seen)', async () => {
      const res = await request(app)
        .post(`/api/complaints/${createdComplaintId}/acknowledge`)
        .set('Cookie', caretakerCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Seen');
    });

    it('allows Caretaker to assign technician (Seen -> Assigned)', async () => {
      // Find technician Rajesh Verma id
      const staffRes = await request(app)
        .get('/api/staff/accounts?role=Technician')
        .set('Cookie', caretakerCookie);
      const tech = staffRes.body.data.find((t: any) => t.email === 'tech.raj@hostel.edu');

      const res = await request(app)
        .post(`/api/complaints/${createdComplaintId}/assign`)
        .set('Cookie', caretakerCookie)
        .send({
          technicianId: tech._id,
          notes: 'Priority replacement of heating coil.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Assigned');
      expect(res.body.data.assignedTechnicianName).toBe(tech.name);
    });

    it('allows Technician to start work (Assigned -> In Progress)', async () => {
      const res = await request(app)
        .post(`/api/complaints/${createdComplaintId}/start-work`)
        .set('Cookie', technicianCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('In Progress');
    });

    it('allows Technician to complete work with repair notes (In Progress -> Work Completed)', async () => {
      const res = await request(app)
        .post(`/api/complaints/${createdComplaintId}/complete-work`)
        .set('Cookie', technicianCookie)
        .send({
          repairNotes: 'Replaced 2000W heating element and thermostatic switch.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Work Completed');
      expect(res.body.data.repairNotes).toContain('heating element');
    });

    it('allows Warden to confirm final resolution (Work Completed -> Resolved)', async () => {
      const res = await request(app)
        .post(`/api/complaints/${createdComplaintId}/confirm-resolution`)
        .set('Cookie', wardenCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Resolved');
    });

    it('allows Student to submit a reopen request on resolved ticket', async () => {
      const res = await request(app)
        .post(`/api/complaints/${createdComplaintId}/reopen-request`)
        .set('Cookie', studentCookie)
        .send({
          reason: 'Water is still only lukewarm after 30 minutes.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Reopened');
    });

    it('allows Warden/Caretaker to approve reopening, returning to Assigned', async () => {
      const res = await request(app)
        .post(`/api/complaints/${createdComplaintId}/approve-reopen`)
        .set('Cookie', wardenCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Assigned');
    });

    it('SPEC INVARIANT: Rejection is allowed for Caretaker and Warden ONLY, with mandatory reason', async () => {
      // 1. Technician cannot reject (must be 403)
      const techRejectRes = await request(app)
        .post(`/api/complaints/${createdComplaintId}/reject`)
        .set('Cookie', technicianCookie)
        .send({ reason: 'Cannot fix this' });

      expect(techRejectRes.status).toBe(403);

      // 2. Caretaker rejection without reason must be rejected with 400
      const emptyReasonRes = await request(app)
        .post(`/api/complaints/${createdComplaintId}/reject`)
        .set('Cookie', caretakerCookie)
        .send({ reason: '' });

      expect(emptyReasonRes.status).toBe(400);

      // 3. Caretaker rejection with valid reason succeeds
      const validRejectRes = await request(app)
        .post(`/api/complaints/${createdComplaintId}/reject`)
        .set('Cookie', caretakerCookie)
        .send({ reason: 'Personal private geyser not supported by hostel maintenance.' });

      expect(validRejectRes.status).toBe(200);
      expect(validRejectRes.body.data.status).toBe('Rejected');
    });
  });

  // 3. Community Feed, Support (+1), Comments, and Unresolved Reporting
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
      // 1. First toggle: adds support (+1)
      const res1 = await request(app)
        .post(`/api/community/${testComplaintId}/support`)
        .set('Cookie', studentCookie);
      expect(res1.status).toBe(200);
      expect(res1.body.data.supported).toBe(true);

      // 2. Second toggle: removes support
      const res2 = await request(app)
        .post(`/api/community/${testComplaintId}/support`)
        .set('Cookie', studentCookie);
      expect(res2.status).toBe(200);
      expect(res2.body.data.supported).toBe(false);
    });

    it('allows submitting discussion comments on complaints', async () => {
      const res = await request(app)
        .post(`/api/community/${testComplaintId}/comments`)
        .set('Cookie', studentCookie)
        .send({ content: 'Experiencing the same issue on floor 3.' });

      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe('Experiencing the same issue on floor 3.');
      expect(res.body.data.authorName).toBe('Alex Sharma');
    });

    it('SPEC INVARIANT: prevents duplicate unresolved reports by same student on same complaint (409 Conflict)', async () => {
      // 1. First report succeeds
      const res1 = await request(app)
        .post(`/api/community/${testComplaintId}/unresolved`)
        .set('Cookie', studentCookie)
        .send({ remarks: 'Still leaking' });

      expect(res1.status).toBe(200);
      expect(res1.body.data.reported).toBe(true);

      // 2. Second report by same student on same complaint must return 409 Conflict
      const res2 = await request(app)
        .post(`/api/community/${testComplaintId}/unresolved`)
        .set('Cookie', studentCookie)
        .send({ remarks: 'Attempting duplicate report' });

      expect(res2.status).toBe(409);
      expect(res2.body.error).toContain('already reported');
    });
  });

  // 4. Staff & Hostel Admin Endpoints
  describe('Staff & Admin Management (/api/staff & /api/audit)', () => {
    it('allows Admin to configure new hostel block', async () => {
      const hostels = await request(app).get('/api/staff/hostels').set('Cookie', adminCookie);
      const mnd = hostels.body.data.find((h: any) => h.code === 'MND');

      const res = await request(app)
        .post(`/api/staff/hostels/${mnd._id}/blocks`)
        .set('Cookie', adminCookie)
        .send({
          name: 'C Block Annex',
          floors: 4,
          roomsCount: 80,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.blocks.some((b: any) => b.name === 'C Block Annex')).toBe(true);
    });

    it('allows Admin to provision staff account', async () => {
      const res = await request(app)
        .post('/api/staff/accounts')
        .set('Cookie', adminCookie)
        .send({
          name: 'Ravi Teja',
          email: 'tech.ravi@hostel.edu',
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

      const schedulerRes = await request(app).post('/api/escalations/scheduler').set('Cookie', adminCookie);
      expect(schedulerRes.status).toBe(501);
      expect(schedulerRes.body.error).toContain('Incomplete');
    });
  });
});
