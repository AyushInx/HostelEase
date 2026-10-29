import { describe, it, expect } from 'vitest';
import { complaintService } from '../services/mockComplaintService';

describe('mockComplaintService (Phase 2)', () => {
  const studentId = 'usr_mock_std_001'; // Alex Sharma
  const hostelName = 'C.V.R Hostel';

  it('calculates overview metric counts correctly', async () => {
    const stats = await complaintService.getOverviewStats(studentId, hostelName);
    expect(stats.total).toBeGreaterThanOrEqual(4);
    expect(stats.submitted).toBeGreaterThanOrEqual(1);
    expect(stats.inProgress).toBeGreaterThanOrEqual(1);
    expect(stats.resolved).toBeGreaterThanOrEqual(1);
    expect(stats.reopened).toBeGreaterThanOrEqual(1);
  });

  it('filters student complaints by search query and category', async () => {
    // Search by partial ticket reference
    const byRef = await complaintService.getMyComplaints(studentId, { search: 'HCT-2026-84912' });
    expect(byRef.length).toBe(1);
    expect(byRef[0].title).toContain('Ceiling Fan');

    // Filter by category
    const electrical = await complaintService.getMyComplaints(studentId, { category: 'Electrical' });
    expect(electrical.length).toBeGreaterThanOrEqual(1);
    expect(electrical.every((c) => c.category === 'Electrical')).toBe(true);

    // Filter by status
    const resolved = await complaintService.getMyComplaints(studentId, { status: 'Resolved' });
    expect(resolved.every((c) => c.status === 'Resolved')).toBe(true);
  });

  it('creates a new complaint with generated ticket reference and initial audit entry', async () => {
    const newComplaint = await complaintService.createComplaint(studentId, 'Alex Sharma', {
      title: 'Water filter cartridge leaking',
      category: 'Plumbing',
      priority: 'High',
      hostelName: 'C.V.R Hostel',
      block: 'B Block',
      roomNumber: 'B-304',
      description: 'Under-sink RO filter is leaking clean water onto floor.',
    });

    expect(newComplaint.id).toBeDefined();
    expect(newComplaint.referenceId).toMatch(/^HCT-2026-\d{5}$/);
    expect(newComplaint.status).toBe('Submitted');
    expect(newComplaint.history.length).toBe(1);
    expect(newComplaint.history[0].actorRole).toBe('Student');
    expect(newComplaint.history[0].toStatus).toBe('Submitted');
  });

  it('strictly scopes community feed to student designated hostel', async () => {
    const feed = await complaintService.getCommunityFeed('C.V.R Hostel');
    expect(feed.length).toBeGreaterThan(0);
    // Every complaint in feed must belong to C.V.R Hostel
    expect(feed.every((c) => c.hostelName === 'C.V.R Hostel')).toBe(true);

    // Verify Kalam Hostel complaint is excluded
    expect(feed.some((c) => c.referenceId === 'HCT-2026-11842')).toBe(false);
  });

  it('allows single support per student and toggles cleanly', async () => {
    const myComplaints = await complaintService.getMyComplaints(studentId);
    const target = myComplaints[0];

    // Toggle on or off
    const initialSupported = target.supportedByStudentIds.includes(studentId);
    const res1 = await complaintService.toggleSupport(target.id, studentId);
    expect(res1.supported).toBe(!initialSupported);

    // Toggle back
    const res2 = await complaintService.toggleSupport(target.id, studentId);
    expect(res2.supported).toBe(initialSupported);
  });

  it('adds community comments without exposing student emails or private details', async () => {
    const myComplaints = await complaintService.getMyComplaints(studentId);
    const target = myComplaints[0];

    const comment = await complaintService.addComment(
      target.id,
      studentId,
      'Alex Sharma',
      'Student',
      'Maintenance team visited today and took photos.'
    );

    expect(comment.id).toBeDefined();
    expect(comment.authorName).toBe('Alex Sharma');
    expect(comment.authorRole).toBe('Student');
    expect(comment.content).toContain('Maintenance team visited');
    // Ensure no email property exists on comment
    expect((comment as any).email).toBeUndefined();
  });

  it('enforces unique index constraint on (complaint, student) for unresolved reports', async () => {
    const myComplaints = await complaintService.getMyComplaints(studentId);
    const target = myComplaints.find((c) => c.unresolvedReportStudentIds.length === 0) || myComplaints[0];

    // First unresolved report should succeed
    const firstReport = await complaintService.reportUnresolved(
      target.id,
      'usr_new_test_student',
      'Issue recurring'
    );
    expect(firstReport.success).toBe(true);

    // Duplicate report by same student on same complaint must be rejected
    const duplicateReport = await complaintService.reportUnresolved(
      target.id,
      'usr_new_test_student',
      'Trying to report again'
    );
    expect(duplicateReport.success).toBe(false);
    expect(duplicateReport.message).toContain('already reported');
  });

  it('handles student reopen request on resolved complaint and records audit entry', async () => {
    const myComplaints = await complaintService.getMyComplaints(studentId);
    const resolved = myComplaints.find((c) => c.status === 'Resolved');
    expect(resolved).toBeDefined();

    if (resolved) {
      const updated = await complaintService.requestReopen(
        resolved.id,
        studentId,
        'AP-04 started dropping packets again after 5 PM.'
      );

      expect(updated.reopenRequest).toBeDefined();
      expect(updated.reopenRequest?.status).toBe('pending_approval');
      expect(updated.reopenRequest?.reason).toContain('started dropping packets');
      
      const lastHistory = updated.history[updated.history.length - 1];
      expect(lastHistory.remarks).toContain('Reopen requested by student');
    }
  });
});
