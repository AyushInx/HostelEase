import type { UserRole } from '../types/auth';

/**
 * =========================================================================
 * CENTRALIZED PERMISSION MATRIX & AUTHORIZATION ADAPTER
 * =========================================================================
 * NOTICE: [FRONTEND MOCK AUTHORIZATION ADAPTER - FRONTEND DEMO, NOT SECURITY]
 * Per AGENTS.md Invariant 4: No fake security controls.
 * Client-side button hiding or route disabling is strictly for UX/UI guidance.
 * All access checks, role permissions, and ownership verification MUST BE
 * and WILL BE genuinely enforced on the server in Phase 4.
 * 
 * ALL components must query this single centralized permission engine.
 * No ad-hoc scattered role checks (e.g. `role === 'Warden'`) in UI components.
 * =========================================================================
 */

export type AppPermission =
  // Scoping & Visibility
  | 'complaints:view_all_hostels'
  | 'complaints:view_designated_hostel'
  | 'complaints:view_assigned_only'
  // Caretaker Actions
  | 'complaints:acknowledge'          // Submitted -> Seen
  | 'complaints:assign_technician'     // Seen -> Assigned or reassign
  // Technician Actions
  | 'complaints:start_work'            // Assigned -> In Progress
  | 'complaints:add_repair_notes'      // In Progress repair log
  | 'complaints:mark_work_completed'   // In Progress -> Work Completed
  // Warden Actions
  | 'complaints:confirm_resolution'    // Work Completed -> Resolved
  | 'complaints:reprioritize'          // Change ticket priority
  | 'complaints:manual_escalate'       // Manual escalation tier
  // Shared Authorized Actions (Caretaker & Warden only per SPEC)
  | 'complaints:reject'                // Mandatory reason required
  | 'complaints:approve_reopen'        // Returns to Assigned
  // Admin Capabilities
  | 'admin:manage_hostels'
  | 'admin:manage_staff'
  | 'admin:view_audit_logs'
  | 'admin:configure_sla';

/**
 * Single Canonical Permission Map
 * Defined strictly according to /docs/SPEC.md and /AGENTS.md
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly AppPermission[]> = {
  Student: [
    // Students interact via Student Portal only
  ],

  Caretaker: [
    'complaints:view_designated_hostel',
    'complaints:acknowledge',
    'complaints:assign_technician',
    'complaints:reject',
    'complaints:approve_reopen',
  ],

  Technician: [
    'complaints:view_assigned_only',
    'complaints:start_work',
    'complaints:add_repair_notes',
    'complaints:mark_work_completed',
    // Invariant: Technicians CANNOT confirm final resolution and CANNOT reject
  ],

  Warden: [
    'complaints:view_designated_hostel',
    'complaints:confirm_resolution',
    'complaints:reprioritize',
    'complaints:manual_escalate',
    'complaints:reject',
    'complaints:approve_reopen',
  ],

  'Hostel Admin': [
    'complaints:view_all_hostels',
    'complaints:view_designated_hostel',
    'complaints:confirm_resolution',
    'complaints:reject',
    'complaints:approve_reopen',
    'admin:manage_hostels',
    'admin:manage_staff',
    'admin:view_audit_logs',
    'admin:configure_sla',
  ],
} as const;

/**
 * Centralized authorization query function.
 * Evaluates whether a role is authorized for a specific action.
 */
export function hasPermission(role: UserRole | undefined, permission: AppPermission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
}

/**
 * Hook or helper to inspect multiple permissions for an active role.
 */
export function getPermissionsForRole(role: UserRole | undefined) {
  return {
    canViewAllHostels: hasPermission(role, 'complaints:view_all_hostels'),
    canViewDesignatedHostel: hasPermission(role, 'complaints:view_designated_hostel'),
    canViewAssignedOnly: hasPermission(role, 'complaints:view_assigned_only'),
    canAcknowledge: hasPermission(role, 'complaints:acknowledge'),
    canAssignTechnician: hasPermission(role, 'complaints:assign_technician'),
    canStartWork: hasPermission(role, 'complaints:start_work'),
    canAddRepairNotes: hasPermission(role, 'complaints:add_repair_notes'),
    canMarkWorkCompleted: hasPermission(role, 'complaints:mark_work_completed'),
    canConfirmResolution: hasPermission(role, 'complaints:confirm_resolution'),
    canReject: hasPermission(role, 'complaints:reject'),
    canApproveReopen: hasPermission(role, 'complaints:approve_reopen'),
    canReprioritize: hasPermission(role, 'complaints:reprioritize'),
    canEscalate: hasPermission(role, 'complaints:manual_escalate'),
    canManageHostels: hasPermission(role, 'admin:manage_hostels'),
    canManageStaff: hasPermission(role, 'admin:manage_staff'),
    canViewAuditLogs: hasPermission(role, 'admin:view_audit_logs'),
    canConfigureSla: hasPermission(role, 'admin:configure_sla'),
  };
}
