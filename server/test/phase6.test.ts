import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { runSeed } from '../scripts/seed';
import { Complaint, IComplaint } from '../models/Complaint';
import { StatusHistory } from '../models/StatusHistory';
import { Assignment } from '../models/Assignment';
import { Escalation } from '../models/Escalation';
import { UnresolvedReport } from '../models/UnresolvedReport';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { escalationService } from '../services/escalation.service';

import { SESSION_COOKIE_NAME } from '../middleware/auth';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '../middleware/csrf';
import { connectDB } from '../config/db';

describe('Phase 6: Status Transitions, Assignments, Unresolved Reports & Escalation Scheduler', () => {
  let mongoServer: MongoMemoryServer;
  let app: any;

  let csrfToken = '';
  let csrfCookie = '';

  let studentAlexCookie = '';
  let studentAlexId = '';
  let studentPriyaCookie = '';
  let studentPriyaId = '';
  let caretakerCookie = '';
  let technician1Cookie = '';
  let technician1Id = '';
  let technician2Id = '';
  let wardenCookie = '';
  let adminCookie = '';

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
    await runSeed();
    app = createApp();

    // 1. Handshake CSRF
    const csrfRes = await request(app).get('/api/auth/csrf-token');
    csrfToken = csrfRes.body.data.csrfToken;
    csrfCookie = extractCookie(csrfRes, CSRF_COOKIE_NAME) || `${CSRF_COOKIE_NAME}=${csrfToken}`;

    // 2. Authenticate standard roles
    const alexRes = await post('/api/auth/login').send({
      email: 'alex.sharma@iitp.ac.in',
      password: 'mock-student-pass',
    });
    studentAlexCookie = extractCookie(alexRes, SESSION_COOKIE_NAME);
    studentAlexId = alexRes.body.data.user.id;

    const priyaRes = await post('/api/auth/login').send({
      email: 'priya.patel@iitp.ac.in',
      password: 'mock-student-pass',
    });
    studentPriyaCookie = extractCookie(priyaRes, SESSION_COOKIE_NAME);
    studentPriyaId = priyaRes.body.data.user.id;

    const caretakerRes = await post('/api/auth/login').send({
      email: 'caretaker.kalam@iitp.ac.in',
      password: 'mock-staff-pass',
    });
    caretakerCookie = extractCookie(caretakerRes, SESSION_COOKIE_NAME);

    const tech1Res = await post('/api/auth/login').send({
      email: 'tech.raj@iitp.ac.in',
      password: 'mock-staff-pass',
    });
    technician1Cookie = extractCookie(tech1Res, SESSION_COOKIE_NAME);
    technician1Id = tech1Res.body.data.user.id;

    const tech2 = await User.findOne({ email: 'tech.amit@iitp.ac.in' });
    technician2Id = tech2!._id.toString();

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
    escalationService.stopScheduler();
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  // =========================================================================
  // 1. Backend-Enforced Status Transitions & History Entries
  // =========================================================================
  describe('Backend-Enforced Status Transitions & History Tracking', () => {
    let complaintId = '';

    it('enforces full legitimate transition chain with append-only StatusHistory', async () => {
      // 1. Student creates complaint -> Submitted
      const createRes = await post('/api/complaints', studentAlexCookie).send({
        title: 'Ceiling Fan Making Squeaking Sound',
        category: 'Electrical',
        description: 'The ceiling fan regulator and bearing make an unbearable screeching noise.',
        roomNumber: 'A-101',
        priority: 'High',
      });
      expect(createRes.status).toBe(201);
      complaintId = createRes.body.data.id;
      expect(createRes.body.data.status).toBe('Submitted');

      // 2. Caretaker acknowledges -> Seen
      const ackRes = await post(`/api/complaints/${complaintId}/acknowledge`, caretakerCookie);
      expect(ackRes.status).toBe(200);
      expect(ackRes.body.data.status).toBe('Seen');
      expect(ackRes.body.data.acknowledgedAt).toBeDefined();

      // 3. Caretaker assigns technician -> Assigned
      const assignRes = await post(`/api/complaints/${complaintId}/assign`, caretakerCookie).send({
        technicianId: technician1Id,
        notes: 'Check capacitor and lubricate fan bearings.',
      });
      expect(assignRes.status).toBe(200);
      expect(assignRes.body.data.status).toBe('Assigned');
      expect(assignRes.body.data.assignedTechnicianName).toBe('Rajesh Verma');

      // 4. Technician starts work -> In Progress
      const startRes = await post(`/api/complaints/${complaintId}/start-work`, technician1Cookie);
      expect(startRes.status).toBe(200);
      expect(startRes.body.data.status).toBe('In Progress');

      // 5. Technician completes work -> Work Completed
      const completeRes = await post(`/api/complaints/${complaintId}/complete-work`, technician1Cookie).send({
        repairNotes: 'Replaced bearing ball assembly and balanced fan blades.',
      });
      expect(completeRes.status).toBe(200);
      expect(completeRes.body.data.status).toBe('Work Completed');
      expect(completeRes.body.data.repairNotes).toContain('Replaced bearing');

      // 6. Warden confirms resolution -> Resolved (with required notes)
      const resolveRes = await post(`/api/complaints/${complaintId}/confirm-resolution`, wardenCookie).send({
        notes: 'Verified fan operation in room A-101; runs quietly without noise.',
      });
      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.data.status).toBe('Resolved');
      expect(resolveRes.body.data.resolutionNotes).toContain('Verified fan operation');

      // Verify StatusHistory timeline has all 6 append-only transition entries
      const timelineRes = await get(`/api/complaints/${complaintId}`, studentAlexCookie);
      expect(timelineRes.status).toBe(200);
      const timeline = timelineRes.body.data.timeline;
      expect(timeline.length).toBe(6);

      const toStatuses = timeline.map((t: any) => t.toStatus);
      expect(toStatuses).toEqual(['Submitted', 'Seen', 'Assigned', 'In Progress', 'Work Completed', 'Resolved']);

      for (const entry of timeline) {
        expect(entry.actorName).toBeDefined();
        expect(entry.actorRole).toBeDefined();
        expect(entry.timestamp).toBeDefined();
      }
    });

    it('rejects invalid state transitions (skipping states, illegal backwards transitions)', async () => {
      // Create new fresh complaint in Submitted state
      const createRes = await post('/api/complaints', studentAlexCookie).send({
        title: 'Bathroom Tap Leaking Slowly',
        category: 'Plumbing',
        description: 'Tap washer is worn out and drips steadily every second.',
        roomNumber: 'A-102',
        priority: 'Low',
      });
      const freshId = createRes.body.data.id;

      // 1. Attempting to start work on a Submitted ticket (must be Assigned) -> 400
      const invalidStartRes = await post(`/api/complaints/${freshId}/start-work`, technician1Cookie);
      expect(invalidStartRes.status).toBe(400);
      expect(invalidStartRes.body.error).toMatch(/must be 'Assigned'/i);

      // 2. Attempting to complete work on a Submitted ticket -> 400
      const invalidCompleteRes = await post(`/api/complaints/${freshId}/complete-work`, technician1Cookie).send({
        repairNotes: 'Quick fix attempt',
      });
      expect(invalidCompleteRes.status).toBe(400);
      expect(invalidCompleteRes.body.error).toMatch(/must be 'In Progress'/i);

      // 3. Attempting to confirm resolution directly on a Submitted ticket -> 400
      const invalidResolveRes = await post(`/api/complaints/${freshId}/confirm-resolution`, wardenCookie).send({
        notes: 'Premature resolution attempt',
      });
      expect(invalidResolveRes.status).toBe(400);
      expect(invalidResolveRes.body.error).toMatch(/must be 'Work Completed'/i);
    });

    it('enforces terminal state for Rejected complaints (cannot transition further)', async () => {
      const createRes = await post('/api/complaints', studentAlexCookie).send({
        title: 'Request for Personal Mini Fridge in Room',
        category: 'Other',
        description: 'Resident requesting personal appliance outside standard hostel guidelines.',
        roomNumber: 'A-103',
        priority: 'Low',
      });
      const ticketId = createRes.body.data.id;

      // Caretaker rejects ticket with mandatory reason
      const rejectRes = await post(`/api/complaints/${ticketId}/reject`, caretakerCookie).send({
        reason: 'Personal mini-fridges are strictly prohibited under hostel electrical safety rules.',
      });
      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.data.status).toBe('Rejected');

      // Attempting to acknowledge a Rejected ticket -> 400
      const ackRes = await post(`/api/complaints/${ticketId}/acknowledge`, caretakerCookie);
      expect(ackRes.status).toBe(400);

      // Attempting to assign a Rejected ticket -> 400 or rejects transition
      const reRejectRes = await post(`/api/complaints/${ticketId}/reject`, wardenCookie).send({
        reason: 'Double rejection attempt',
      });
      expect(reRejectRes.status).toBe(400);
      expect(reRejectRes.body.error).toMatch(/terminal status/i);
    });
  });

  // =========================================================================
  // 2. Role Permissions & Invariant Transitions
  // =========================================================================
  describe('Role Permissions & Special Invariant Transitions', () => {
    let complaintId = '';

    beforeAll(async () => {
      const res = await post('/api/complaints', studentAlexCookie).send({
        title: 'Broken Window Latch in Room A-104',
        category: 'Carpentry',
        description: 'Window sash lock is loose and rattles in the wind.',
        roomNumber: 'A-104',
        priority: 'Medium',
      });
      complaintId = res.body.data.id;
    });

    it('SPEC INVARIANT: Rejection is allowed for Caretaker and Warden ONLY (Technician gets 403)', async () => {
      // Technician attempts rejection -> 403
      const techRejectRes = await post(`/api/complaints/${complaintId}/reject`, technician1Cookie).send({
        reason: 'Technician cannot decide to reject.',
      });
      expect(techRejectRes.status).toBe(403);

      // Student attempts rejection -> 403
      const stdRejectRes = await post(`/api/complaints/${complaintId}/reject`, studentAlexCookie).send({
        reason: 'Student cannot reject.',
      });
      expect(stdRejectRes.status).toBe(403);
    });

    it('SPEC INVARIANT: Rejection requires a mandatory reason of at least 5 characters', async () => {
      const emptyReasonRes = await post(`/api/complaints/${complaintId}/reject`, caretakerCookie).send({
        reason: 'no',
      });
      expect(emptyReasonRes.status).toBe(400);
      expect(JSON.stringify(emptyReasonRes.body)).toMatch(/at least 5 characters/i);
    });

    it('SPEC INVARIANT: Work Completed -> In Progress is allowed for Warden ONLY with mandatory reason', async () => {
      // Move complaint to Work Completed
      await post(`/api/complaints/${complaintId}/acknowledge`, caretakerCookie);
      await post(`/api/complaints/${complaintId}/assign`, caretakerCookie).send({ technicianId: technician1Id });
      await post(`/api/complaints/${complaintId}/start-work`, technician1Cookie);
      await post(`/api/complaints/${complaintId}/complete-work`, technician1Cookie).send({
        repairNotes: 'Screwed in replacement latch on window frame.',
      });

      // 1. Caretaker attempts Work Completed -> In Progress -> 403
      const caretakerAttempt = await post(`/api/complaints/${complaintId}/return-in-progress`, caretakerCookie).send({
        reason: 'Caretaker trying to return to in progress.',
      });
      expect(caretakerAttempt.status).toBe(403);

      // 2. Technician attempts Work Completed -> In Progress -> 403
      const techAttempt = await post(`/api/complaints/${complaintId}/return-in-progress`, technician1Cookie).send({
        reason: 'Technician trying to return to in progress.',
      });
      expect(techAttempt.status).toBe(403);

      // 3. Warden without reason -> 400
      const wardenNoReason = await post(`/api/complaints/${complaintId}/return-in-progress`, wardenCookie).send({
        reason: '',
      });
      expect(wardenNoReason.status).toBe(400);

      // 4. Warden with mandatory reason -> 200 OK
      const wardenSuccess = await post(`/api/complaints/${complaintId}/return-in-progress`, wardenCookie).send({
        reason: 'Latch does not align properly with the catch keeper; re-mount required.',
      });
      expect(wardenSuccess.status).toBe(200);
      expect(wardenSuccess.body.data.status).toBe('In Progress');

      // Verify audit record created
      const complaint = await Complaint.findById(complaintId);
      expect(complaint?.status).toBe('In Progress');
    });

    it('SPEC INVARIANT: Confirmation of final resolution requires authorized staff (Warden or Admin)', async () => {
      // Complete work again
      await post(`/api/complaints/${complaintId}/complete-work`, technician1Cookie).send({
        repairNotes: 'Re-drilled holes and perfectly aligned catch keeper.',
      });

      // Caretaker cannot confirm resolution -> 403
      const caretakerRes = await post(`/api/complaints/${complaintId}/confirm-resolution`, caretakerCookie).send({
        notes: 'Caretaker confirming resolution attempt.',
      });
      expect(caretakerRes.status).toBe(403);

      // Technician cannot confirm resolution -> 403
      const techRes = await post(`/api/complaints/${complaintId}/confirm-resolution`, technician1Cookie).send({
        notes: 'Tech confirming resolution attempt.',
      });
      expect(techRes.status).toBe(403);

      // Warden confirms resolution -> 200
      const wardenRes = await post(`/api/complaints/${complaintId}/confirm-resolution`, wardenCookie).send({
        notes: 'Latch tested 5 times; locks securely.',
      });
      expect(wardenRes.status).toBe(200);
      expect(wardenRes.body.data.status).toBe('Resolved');
    });
  });

  // =========================================================================
  // 3. Assignment & Reassignment Records (actor, from, to, reason)
  // =========================================================================
  describe('Assignment & Reassignment Tracking Records', () => {
    let complaintId = '';

    it('creates immutable Assignment records with actor, from, to, and reason', async () => {
      // 1. Create complaint
      const createRes = await post('/api/complaints', studentAlexCookie).send({
        title: 'Geyser Heating Rod Tripping Circuit Breaker',
        category: 'Appliance',
        description: 'Turning on the water heater trips the MCB switch immediately.',
        roomNumber: 'A-105',
        priority: 'Emergency',
      });
      complaintId = createRes.body.data.id;

      // 2. Initial Assignment: Caretaker assigns to Technician 1
      const assign1Res = await post(`/api/complaints/${complaintId}/assign`, caretakerCookie).send({
        technicianId: technician1Id,
        notes: 'Initial emergency assignment for MCB trip investigation.',
      });
      expect(assign1Res.status).toBe(200);

      // Verify Assignment record
      const assignmentsAfterFirst = await Assignment.find({ complaint: complaintId });
      expect(assignmentsAfterFirst.length).toBe(1);
      expect(assignmentsAfterFirst[0].actorRole).toBe('Caretaker');
      expect(assignmentsAfterFirst[0].fromTechnician).toBeUndefined();
      expect(assignmentsAfterFirst[0].toTechnician.toString()).toBe(technician1Id);
      expect(assignmentsAfterFirst[0].toTechnicianName).toBe('Rajesh Verma');
      expect(assignmentsAfterFirst[0].reason).toContain('Initial emergency assignment');

      // 3. Reassignment: Technician 1 is busy; Caretaker reassigns to Technician 2 (Amit Singh)
      const reassignRes = await post(`/api/complaints/${complaintId}/assign`, caretakerCookie).send({
        technicianId: technician2Id,
        notes: 'Rajesh is engaged with urgent mainline repair; reassigning to Amit.',
      });
      expect(reassignRes.status).toBe(200);
      expect(reassignRes.body.data.assignedTechnicianName).toBe('Amit Singh');

      // Verify Assignment history via API endpoint
      const listAssignmentsRes = await get(`/api/complaints/${complaintId}/assignments`, caretakerCookie);
      expect(listAssignmentsRes.status).toBe(200);
      const assignments = listAssignmentsRes.body.data;
      expect(assignments.length).toBe(2);

      // Check second assignment record (from Rajesh to Amit)
      const reassignmentRecord = assignments[1];
      expect(reassignmentRecord.fromTechnician.toString()).toBe(technician1Id);
      expect(reassignmentRecord.fromTechnicianName).toBe('Rajesh Verma');
      expect(reassignmentRecord.toTechnician.toString()).toBe(technician2Id);
      expect(reassignmentRecord.toTechnicianName).toBe('Amit Singh');
      expect(reassignmentRecord.reason).toContain('Rajesh is engaged with urgent mainline repair');
    });
  });

  // =========================================================================
  // 4. Student Reopening Flow & Active Queue Return
  // =========================================================================
  describe('Student Reopen Request & Active Queue Processing', () => {
    let resolvedComplaintId = '';

    beforeAll(async () => {
      // Create and resolve a complaint
      const cRes = await post('/api/complaints', studentAlexCookie).send({
        title: 'Desk Study Lamp Socket Loose',
        category: 'Electrical',
        description: 'Plug falls out of the wall outlet easily.',
        roomNumber: 'A-106',
        priority: 'Medium',
      });
      resolvedComplaintId = cRes.body.data.id;

      await post(`/api/complaints/${resolvedComplaintId}/acknowledge`, caretakerCookie);
      await post(`/api/complaints/${resolvedComplaintId}/assign`, caretakerCookie).send({ technicianId: technician1Id });
      await post(`/api/complaints/${resolvedComplaintId}/start-work`, technician1Cookie);
      await post(`/api/complaints/${resolvedComplaintId}/complete-work`, technician1Cookie).send({
        repairNotes: 'Tightened internal brass contact spring clips.',
      });
      await post(`/api/complaints/${resolvedComplaintId}/confirm-resolution`, wardenCookie).send({
        notes: 'Tested with standard 3-pin plug.',
      });
    });

    it('allows student to submit reopen request with reason and rejects unauthorized reopeners', async () => {
      // Another student (Priya) attempts to reopen Alex's ticket -> 403
      const unauthorizedRes = await post(`/api/complaints/${resolvedComplaintId}/reopen-request`, studentPriyaCookie).send({
        reason: 'Priya trying to reopen Alex ticket.',
      });
      expect(unauthorizedRes.status).toBe(403);

      // Owner student (Alex) reopens with mandatory reason -> 200
      const reopenRes = await post(`/api/complaints/${resolvedComplaintId}/reopen-request`, studentAlexCookie).send({
        reason: 'Socket began sparking when phone charger was inserted today.',
      });
      expect(reopenRes.status).toBe(200);
      expect(reopenRes.body.data.status).toBe('Reopened');
    });

    it('SPEC INVARIANT: Approved reopen returns ticket to Assigned in active queue', async () => {
      // Caretaker approves reopen request
      const approveRes = await post(`/api/complaints/${resolvedComplaintId}/approve-reopen`, caretakerCookie);
      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe('Assigned');

      // SPEC: Returns with original technician if still active
      expect(approveRes.body.data.assignedTechnicianName).toBe('Rajesh Verma');

      // Verify StatusHistory logged return to Assigned
      const timelineRes = await get(`/api/complaints/${resolvedComplaintId}`, studentAlexCookie);
      const lastHistory = timelineRes.body.data.timeline.pop();
      expect(lastHistory.fromStatus).toBe('Reopened');
      expect(lastHistory.toStatus).toBe('Assigned');
    });

    it('SPEC INVARIANT: Rejected reopen request keeps ticket Resolved, writes audit, and notifies student', async () => {
      // Re-resolve ticket
      await post(`/api/complaints/${resolvedComplaintId}/start-work`, technician1Cookie);
      await post(`/api/complaints/${resolvedComplaintId}/complete-work`, technician1Cookie).send({
        repairNotes: 'Replaced outlet box completely.',
      });
      await post(`/api/complaints/${resolvedComplaintId}/confirm-resolution`, wardenCookie).send({
        notes: 'Final resolution confirmed.',
      });

      // Student reopens again
      await post(`/api/complaints/${resolvedComplaintId}/reopen-request`, studentAlexCookie).send({
        reason: 'Reopen request that will be evaluated as unwarranted.',
      });

      // Warden rejects reopen request with mandatory reason
      const rejectReopenRes = await post(`/api/complaints/${resolvedComplaintId}/reject-reopen`, wardenCookie).send({
        reason: 'Socket was physically verified with multimeter; reading normal 230V without faults.',
      });
      expect(rejectReopenRes.status).toBe(200);
      expect(rejectReopenRes.body.data.status).toBe('Resolved');

      // Verify notification sent to student with reason
      const notification = await Notification.findOne({
        recipient: studentAlexId,
        type: 'reopen_rejected',
      }).sort({ createdAt: -1 });

      expect(notification).not.toBeNull();
      expect(notification?.message).toContain('reading normal 230V without faults');
    });
  });

  // =========================================================================
  // 5. Deduplicated Unresolved Reports with Aggregate Counts for Staff
  // =========================================================================
  describe('Deduplicated Unresolved Reports & Staff Summary', () => {
    let complaintId = '';

    beforeAll(async () => {
      const res = await post('/api/complaints', studentAlexCookie).send({
        title: 'Common Hall Water Cooler Leaking Floor',
        category: 'Plumbing',
        description: 'Water leaking all over the corridor tiles.',
        roomNumber: 'Ground Floor Common Area',
        priority: 'High',
      });
      complaintId = res.body.data.id;
    });

    it('deduplicates unresolved reports per (complaint, student) with 409 on duplicate report', async () => {
      // 1. Student Alex reports unresolved -> 200
      const report1 = await post(`/api/community/${complaintId}/unresolved`, studentAlexCookie).send({
        remarks: 'Water is still pooling near the main door.',
      });
      expect(report1.status).toBe(200);
      expect(report1.body.data.unresolvedReportsCount).toBe(1);

      // 2. Student Alex reports SAME complaint again -> 409 Conflict
      const reportDup = await post(`/api/community/${complaintId}/unresolved`, studentAlexCookie).send({
        remarks: 'Duplicate click attempt.',
      });
      expect(reportDup.status).toBe(409);
      expect(reportDup.body.error).toMatch(/already reported/i);

      // 3. Different student (Priya) reports unresolved -> 200, count increments to 2
      const report2 = await post(`/api/community/${complaintId}/unresolved`, studentPriyaCookie).send({
        remarks: 'Confirmed, puddle is slipping hazard.',
      });
      expect(report2.status).toBe(200);
      expect(report2.body.data.unresolvedReportsCount).toBe(2);

      // Verify DB count
      const complaint = await Complaint.findById(complaintId);
      expect(complaint?.unresolvedReportsCount).toBe(2);
    });

    it('provides deduplicated aggregate summary of unresolved reports to staff only', async () => {
      // Student cannot access staff summary -> 403
      const studentAccess = await get('/api/community/unresolved-summary', studentAlexCookie);
      expect(studentAccess.status).toBe(403);

      // Staff (Caretaker) can access aggregate summary -> 200
      const staffAccess = await get('/api/community/unresolved-summary', caretakerCookie);
      expect(staffAccess.status).toBe(200);
      expect(staffAccess.body.data.totalUnresolvedReports).toBeGreaterThanOrEqual(2);

      const targetComplaint = staffAccess.body.data.complaints.find((c: any) => c.id === complaintId);
      expect(targetComplaint).toBeDefined();
      expect(targetComplaint.unresolvedReportsCount).toBe(2);
      expect(targetComplaint.reports.length).toBe(2);
    });
  });

  // =========================================================================
  // 6. Escalation Scheduler, Configurable Deadlines & Idempotent Execution
  // =========================================================================
  describe('Escalation Scheduler, Deadline Math & Idempotent Background Runs', () => {
    let ackBreachedComplaint: any;
    let resBreachedComplaint: any;

    beforeAll(async () => {
      // Create a complaint for Acknowledgment SLA testing (older than deadline, status: Submitted)
      ackBreachedComplaint = await Complaint.create({
        referenceId: 'HCT-2026-88001',
        student: new Types.ObjectId(studentAlexId),
        studentName: 'Alex Sharma',
        hostelName: 'C.V.R Hostel',
        roomNumber: 'A-108',
        category: 'Electrical',
        title: 'Exhaust Fan Burning Smell',
        description: 'Smoke and burning smell from exhaust fan in bathroom.',
        priority: 'Emergency',
        status: 'Submitted',
        createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago (Emergency ack limit is 30m)
      });

      // Create a complaint for Resolution SLA testing (older than resolution deadline, status: In Progress)
      resBreachedComplaint = await Complaint.create({
        referenceId: 'HCT-2026-88002',
        student: new Types.ObjectId(studentAlexId),
        studentName: 'Alex Sharma',
        hostelName: 'Kalam Hostel',
        roomNumber: 'A-109',
        category: 'Plumbing',
        title: 'Main Sewer Backflow',
        description: 'Sewage backflow in ground floor wing.',
        priority: 'Emergency',
        status: 'In Progress',
        assignedTechnician: new Types.ObjectId(technician1Id),
        assignedTechnicianName: 'Rajesh Verma',
        createdAt: new Date(Date.now() - 300 * 60 * 1000), // 300 minutes ago (Emergency res limit is 240m)
      });
    });

    it('allows Admin to inspect and configure SLA deadlines', async () => {
      // 1. Get current SLA configuration
      const getCfg = await get('/api/escalations/sla-config', adminCookie);
      expect(getCfg.status).toBe(200);
      expect(getCfg.body.data.Emergency).toBeDefined();
      expect(getCfg.body.data.Emergency.acknowledgmentDeadlineMinutes).toBe(30);

      // 2. Non-admin cannot patch SLA config -> 403
      const nonAdminPatch = await request(app)
        .patch('/api/escalations/sla-config')
        .set('x-csrf-token', csrfToken)
        .set('Cookie', [csrfCookie, caretakerCookie].join('; '))
        .send({
          priority: 'Emergency',
          config: { acknowledgmentDeadlineMinutes: 20 },
        });
      expect(nonAdminPatch.status).toBe(403);

      // 3. Admin patches SLA config -> 200
      const adminPatch = await request(app)
        .patch('/api/escalations/sla-config')
        .set('x-csrf-token', csrfToken)
        .set('Cookie', [csrfCookie, adminCookie].join('; '))
        .send({
          priority: 'Emergency',
          config: { acknowledgmentDeadlineMinutes: 25 },
        });
      expect(adminPatch.status).toBe(200);
      expect(adminPatch.body.data.acknowledgmentDeadlineMinutes).toBe(25);

      // Reset to defaults for standard tests
      escalationService.resetSLAConfig();
    });

    it('evaluates acknowledgment deadline: escalates Tier 1 to Warden if ticket is in Submitted state', async () => {
      const evalResult = await escalationService.evaluateEscalations();
      expect(evalResult.checkedComplaints).toBeGreaterThanOrEqual(2);

      // Verify Tier 1 escalation created for ackBreachedComplaint
      const esc = await Escalation.findOne({
        complaint: ackBreachedComplaint._id,
        slaType: 'acknowledgment',
        escalationTier: 'tier1_warden',
      });

      expect(esc).not.toBeNull();
      expect(esc?.targetRole).toBe('Warden');
      expect(esc?.reason).toContain('Acknowledgment SLA breached');

      // Verify complaint escalation level updated
      const updatedComplaint = await Complaint.findById(ackBreachedComplaint._id);
      expect(updatedComplaint?.escalationLevel).toBe('tier1_warden');

      // Verify notification sent to Warden
      const notif = await Notification.findOne({
        type: 'escalation',
      });
      expect(notif).not.toBeNull();
    });

    it('stops Acknowledgment SLA clock once complaint reaches Seen status', async () => {
      // Caretaker acknowledges the ticket -> moves to Seen
      const ackRes = await post(`/api/complaints/${ackBreachedComplaint._id}/acknowledge`, caretakerCookie);
      expect(ackRes.status).toBe(200);

      const countBefore = await Escalation.countDocuments({
        complaint: ackBreachedComplaint._id,
        slaType: 'acknowledgment',
      });

      // Advance time by 3 hours into the future
      const futureDate = new Date(Date.now() + 3 * 60 * 60 * 1000);
      await escalationService.evaluateEscalations(futureDate);

      // Verify NO further acknowledgment escalation triggered because clock stopped at Seen!
      const countAfter = await Escalation.countDocuments({
        complaint: ackBreachedComplaint._id,
        slaType: 'acknowledgment',
      });
      expect(countAfter).toBe(countBefore);
    });

    it('evaluates resolution deadline and triggers Tier 2 escalation to Hostel Admin after grace period', async () => {
      // Create dedicated complaint for resolution SLA timeline
      const resComplaint = await Complaint.create({
        referenceId: 'HCT-2026-88099',
        student: new Types.ObjectId(studentAlexId),
        studentName: 'Alex Sharma',
        hostelName: 'C.V.R Hostel',
        roomNumber: 'A-110',
        category: 'Plumbing',
        title: 'Main Sewer Leak',
        description: 'Sewage leak in ground floor wing.',
        priority: 'Emergency',
        status: 'In Progress',
        assignedTechnician: new Types.ObjectId(technician1Id),
        assignedTechnicianName: 'Rajesh Verma',
        createdAt: new Date(Date.now() - 250 * 60 * 1000), // 250 minutes ago (Emergency res limit is 240m)
      });

      // 1. Initial evaluation triggers Tier 1 resolution escalation for resComplaint
      const eval1 = await escalationService.evaluateEscalations();
      const resTier1 = await Escalation.findOne({
        complaint: resComplaint._id,
        slaType: 'resolution',
        escalationTier: 'tier1_warden',
      });
      expect(resTier1).not.toBeNull();
      expect(resTier1?.targetRole).toBe('Warden');

      // 2. Before grace period (Emergency grace is 60m) has elapsed: Tier 2 does NOT trigger
      const thirtyMinsLater = new Date(resTier1!.triggeredAt.getTime() + 30 * 60 * 1000);
      await escalationService.evaluateEscalations(thirtyMinsLater);
      const tier2Premature = await Escalation.findOne({
        complaint: resComplaint._id,
        slaType: 'resolution',
        escalationTier: 'tier2_admin',
      });
      expect(tier2Premature).toBeNull();

      // 3. After grace period has elapsed (65 minutes later): Tier 2 triggers to Hostel Admin
      const sixtyFiveMinsLater = new Date(resTier1!.triggeredAt.getTime() + 65 * 60 * 1000);
      await escalationService.evaluateEscalations(sixtyFiveMinsLater);

      const tier2Esc = await Escalation.findOne({
        complaint: resComplaint._id,
        slaType: 'resolution',
        escalationTier: 'tier2_admin',
      });
      expect(tier2Esc).not.toBeNull();
      expect(tier2Esc?.targetRole).toBe('Hostel Admin');
      expect(tier2Esc?.reason).toContain('Hostel Admin');

      // Verify complaint escalation level updated to tier2_admin
      const updatedComplaint = await Complaint.findById(resComplaint._id);
      expect(updatedComplaint?.escalationLevel).toBe('tier2_admin');
    });

    it('SPEC INVARIANT & CRITICAL REQUIREMENT: repeated scheduler runs are strictly idempotent (ZERO duplicate escalations)', async () => {
      // Record initial count of all escalations in database
      const initialCount = await Escalation.countDocuments({});

      // Run scheduler 5 consecutive times simulated across various timestamps
      for (let i = 0; i < 5; i++) {
        const runRes = await escalationService.evaluateEscalations(new Date());
        expect(runRes.newEscalations.length).toBe(0);
      }

      // Assert total count in database is completely unchanged!
      const finalCount = await Escalation.countDocuments({});
      expect(finalCount).toBe(initialCount);

      // Verify unique compound index in MongoDB directly
      const indexes = await Escalation.collection.getIndexes();
      expect(indexes['complaint_1_slaType_1_escalationTier_1']).toBeDefined();
    });
  });
});
