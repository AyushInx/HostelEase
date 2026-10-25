import { describe, it, expect } from 'vitest';
import { hasPermission, getPermissionsForRole } from '../auth/permissions';

describe('Centralized Permission Map (Phase 3)', () => {
  it('enforces Caretaker authorized and unauthorized permissions per SPEC', () => {
    // Authorized:
    expect(hasPermission('Caretaker', 'complaints:acknowledge')).toBe(true);
    expect(hasPermission('Caretaker', 'complaints:assign_technician')).toBe(true);
    expect(hasPermission('Caretaker', 'complaints:reject')).toBe(true);
    expect(hasPermission('Caretaker', 'complaints:approve_reopen')).toBe(true);
    expect(hasPermission('Caretaker', 'complaints:view_designated_hostel')).toBe(true);

    // Unauthorized:
    expect(hasPermission('Caretaker', 'complaints:confirm_resolution')).toBe(false);
    expect(hasPermission('Caretaker', 'complaints:start_work')).toBe(false);
    expect(hasPermission('Caretaker', 'complaints:mark_work_completed')).toBe(false);
    expect(hasPermission('Caretaker', 'admin:manage_staff')).toBe(false);
  });

  it('enforces Technician authorized and unauthorized permissions per SPEC', () => {
    // Authorized:
    expect(hasPermission('Technician', 'complaints:view_assigned_only')).toBe(true);
    expect(hasPermission('Technician', 'complaints:start_work')).toBe(true);
    expect(hasPermission('Technician', 'complaints:add_repair_notes')).toBe(true);
    expect(hasPermission('Technician', 'complaints:mark_work_completed')).toBe(true);

    // STRICT INVARIANTS: Technicians cannot confirm resolution and cannot reject
    expect(hasPermission('Technician', 'complaints:confirm_resolution')).toBe(false);
    expect(hasPermission('Technician', 'complaints:reject')).toBe(false);
    expect(hasPermission('Technician', 'complaints:acknowledge')).toBe(false);
    expect(hasPermission('Technician', 'complaints:assign_technician')).toBe(false);
  });

  it('enforces Warden authorized and unauthorized permissions per SPEC', () => {
    // Authorized:
    expect(hasPermission('Warden', 'complaints:confirm_resolution')).toBe(true);
    expect(hasPermission('Warden', 'complaints:reprioritize')).toBe(true);
    expect(hasPermission('Warden', 'complaints:manual_escalate')).toBe(true);
    expect(hasPermission('Warden', 'complaints:reject')).toBe(true);
    expect(hasPermission('Warden', 'complaints:approve_reopen')).toBe(true);

    // Unauthorized:
    expect(hasPermission('Warden', 'complaints:start_work')).toBe(false);
    expect(hasPermission('Warden', 'complaints:mark_work_completed')).toBe(false);
    expect(hasPermission('Warden', 'admin:manage_staff')).toBe(false);
  });

  it('enforces Hostel Admin permissions per SPEC', () => {
    expect(hasPermission('Hostel Admin', 'complaints:view_all_hostels')).toBe(true);
    expect(hasPermission('Hostel Admin', 'admin:manage_hostels')).toBe(true);
    expect(hasPermission('Hostel Admin', 'admin:manage_staff')).toBe(true);
    expect(hasPermission('Hostel Admin', 'admin:view_audit_logs')).toBe(true);
    expect(hasPermission('Hostel Admin', 'admin:configure_sla')).toBe(true);
  });

  it('returns complete boolean map via getPermissionsForRole', () => {
    const caretakerPerms = getPermissionsForRole('Caretaker');
    expect(caretakerPerms.canAcknowledge).toBe(true);
    expect(caretakerPerms.canAssignTechnician).toBe(true);
    expect(caretakerPerms.canConfirmResolution).toBe(false);
    expect(caretakerPerms.canManageStaff).toBe(false);

    const techPerms = getPermissionsForRole('Technician');
    expect(techPerms.canStartWork).toBe(true);
    expect(techPerms.canMarkWorkCompleted).toBe(true);
    expect(techPerms.canReject).toBe(false);
  });
});
