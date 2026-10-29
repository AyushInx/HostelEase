# Specification: Hostel Complaint Tracker

Academic web application prototype designed to streamline, track, and audit hostel complaints.

---

## 1. Problem Statement
Complaints are currently scattered across WhatsApp groups, phone calls, and physical paper registers. As a result:
- Students cannot track the status or progress of their issues.
- Hostel staff and management lose track of pending tasks or drop them entirely.
- Lack of accountability and audit trail for delayed or unresolved maintenance.

The **Hostel Complaint Tracker** provides a single, tracked, auditable, and role-enforced system.

---

## 2. Technology Stack
- **Frontend**: React + Vite + Tailwind CSS (TypeScript)
- **Backend**: Node.js + Express (Modular structure, TypeScript/ESM)
- **Database**: MongoDB + Mongoose (Indexes, validation, timestamps)
- **Authentication & Sessions**: `httpOnly`, `secure`, `sameSite` cookie sessions (no tokens in `localStorage`)
- **Email Verification**: OTP / Verification Link
- **Testing**: Unit tests + Integration tests (backend and frontend)
- **Configuration**: `.env` (secrets never committed), `.env.example` with placeholders only

---

## 3. User Roles & Access Control
All role permissions are strictly enforced on the backend. Hiding UI elements is for UX only, not security.

### Roles
1. **Student**
2. **Staff Roles**:
   - **Caretaker**
   - **Technician**
   - **Warden**
   - **Hostel Admin**

### Role Management Invariants
- **First Hostel Admin Creation**: The first Hostel Admin is created via a documented seed script reading environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, etc.). No public path or API endpoint creates an admin.
- **No self-selected staff roles**: Users registering via the portal can only register as Students.
- Only an authorized **Hostel Admin** can create staff accounts or modify roles/permissions.
- Privilege escalation prevention: Any request attempting to assign or escalate roles is rejected at the API level.

---

## 4. Student Features
- **Registration & Authentication**:
  - Register and login using institutional college email.
  - Verify email ownership via OTP or email link.
  - Session management via `httpOnly`, `secure`, `sameSite` cookies (no tokens in `localStorage`).
  - **Email verification** and **Student eligibility approval** are separate states:
    - `eligibilityStatus`: `pending` | `approved` | `rejected` | `suspended`
- **Complaint Submission**:
  - Category (Electrical, Plumbing, Carpentry, Internet/WiFi, Cleanliness, Civil, Mess/Dining, Other).
  - Description.
  - Location details: Hostel, Block, Floor, Room / Common Area location.
  - Priority (Low, Medium, High, Urgent).
  - Optional photo upload (strictly validated by file type and size).
- **Complaint Tracking**:
  - Unique, non-guessable ticket reference ID (public identifier; reference IDs are never access tokens).
  - Own complaints list with status badges, milestone timeline, and assigned updates.
- **Hostel Community Feed**:
  - Visible only to eligible students belonging to the same hostel/campus boundary.
  - Upvote/Support (strictly one per student).
  - Community comments.
  - Report "Still Unresolved" if an issue impacts common areas.
- **Reopen Request**:
  - Student submits a reopen request after resolution if problem persists.
  - Warden or Caretaker reviews and approves the request.
  - Upon approval, ticket transitions to `Assigned` (assigned to same technician if still active, else Caretaker reassigns).
- **Notifications**:
  - In-app and simulated/real email notifications on status changes.
- **Privacy & Security**:
  - Never expose other students' personal email addresses, phone numbers, or verification tokens in API payloads or UI views.

---

## 5. Staff Permissions & Scopes
All permissions enforced server-side based on verified session claims and resource scoping.

1. **Caretaker**:
   - View complaints assigned to their designated hostel.
   - Acknowledge incoming tickets (`Submitted` → `Seen`).
   - Assign tickets to Technicians (`Seen` → `Assigned`).
   - Rejection allowed with mandatory reason.
   - Review and approve student reopen requests (reassigning technician if previous is inactive).
   - Update operational progress notes.
   - Monitor overdue tickets.
2. **Technician**:
   - View only tickets assigned to them personally.
   - Accept assigned tickets (`Assigned` → `In Progress`).
   - Add internal technical repair notes, parts required, and repair log.
   - Mark task as `Work Completed`.
   - Cannot confirm final `Resolved` status.
   - Cannot reject complaints.
3. **Warden**:
   - Oversight over designated hostel/blocks.
   - Reprioritize complaints when required.
   - Review unresolved, overdue, and escalated tickets.
   - Rejection allowed with mandatory reason.
   - Review and approve student reopen requests.
   - Manual escalation.
   - Review `Work Completed` and confirm final resolution (`Resolved`) or return to `In Progress` with mandatory reason.
4. **Hostel Admin**:
   - Cross-hostel administrative oversight.
   - Hostel, block, and staff configuration management.
   - Escalation rule and SLA deadline configuration.
   - Role assignments and user state management (approve/suspend).
   - Immutable audit logs viewer.

---

## 6. Complaint Lifecycle & State Machine
Valid transitions are strictly enforced by backend domain logic:

```
[Submitted] ──> [Seen] ──> [Assigned] ──> [In Progress] ──> [Work Completed] ──> [Resolved]
      │           │            │               │                 │                  │
      ▼           ▼            ▼               ▼                 │                  │
  [Rejected]  [Rejected]   [Rejected]     [Rejected]             │                  │
  (Caretaker / Warden only, with mandatory reason)               │                  │
                                                                 │                  │
                  [In Progress] <────────────────────────────────┘                  │
                  (Warden only, mandatory reason)                                   │
                                                                                    ▼
                                                                         [Reopen Requested]
                                                                            (by Student)
                                                                            │          │
                                                        (Approved by W/C)   ▼          ▼  (Rejected by Warden/Caretaker)
                                                                        [Assigned]    [Resolved]
                                            (Same tech if active, else Caretaker)     (stays Resolved, student notified
                                                                                       with reason, audit entry written)
```

- **Rejection**: Allowed for **Caretaker** and **Warden** only, with mandatory reason and generates an immutable audit record.
- **Work Completed → In Progress**: Allowed for **Warden only** with a mandatory reason (e.g. unsatisfactory or incomplete work).
- **Reopening**: Student submits a reopen request after resolution if the problem persists. Approved or rejected by Warden or Caretaker:
  - **Approved**: Returns to `Assigned` (same technician if still active, else Caretaker reassigns).
  - **Rejected**: Ticket stays `Resolved`, student is notified with the mandatory reason, and an immutable audit entry is written.
- **Immutable Status History**: Every transition writes an append-only entry:
  - `actorId` (User reference)
  - `actorRole`
  - `fromStatus`
  - `toStatus`
  - `reason` / `remarks`
  - `timestamp`

---

## 7. Escalation Engine
- **Server-Side Scheduler Only**: Run via server background worker/cron (never driven by frontend timers).
- **Two SLA Types Configured per Priority & Category**:
  1. **Acknowledgment Deadline**: Time elapsed from `Submitted` to acknowledgment (`Seen`). The SLA clock stops once the ticket moves to `Seen`.
  2. **Resolution Deadline**: Time elapsed from `Submitted` to resolution (`Resolved`).
- **Escalation Path (Tiers)**:
  - **Tier 1**: Missed deadline escalates to **Warden**.
  - **Tier 2**: Continued breach escalates to **Hostel Admin**, triggering after a configurable grace period following Tier 1.
- **Idempotency & Resilience**:
  - Each missed deadline creates exactly ONE escalation record + audit event + notification per tier.
  - Safe against server restarts and concurrent cron ticks.

---

## 8. Data Models Overview
- **Users**: Name, institutional email, password hash, role, eligibility status, hostel/block assignment, verification tokens/OTP, timestamps.
- **Verification**: User ref, OTP / hashed token, type, attempts, expiry, consumed flag.
- **Hostels & Blocks**: Name, code, blocks, floors, caretaker refs, warden refs.
- **Complaints**: Ticket reference code (e.g., `HCT-2026-XXXXX`), student ref, hostel, block, room/location, category, title, description, attachments, priority, current status, assigned technician ref, escalation level, timestamps.
- **Status History**: Complaint ref, actor ref, actor role, fromStatus, toStatus, reason/notes, timestamp.
- **Assignments**: Complaint ref, assignedBy ref, technician ref, notes, assignedAt.
- **Comments & Community Support**: Complaint ref, author ref, content, visibility (public/internal), reactions/upvotes set.
- **Unresolved Reports**: Complaint ref, student ref, remarks, reportedAt. Unique index on `(complaint, student)` ensuring one report per student per complaint.
- **Escalations**: Complaint ref, slaType (`acknowledgment` | `resolution`), escalationTier (`tier1_warden` | `tier2_admin`), triggeredAt, reason, targetRole, resolvedAt.
- **Notifications**: Recipient ref, type, title, message, link, readStatus, createdAt.
- **Audit Logs**: Actor ref, action, targetEntity, entityId, ipAddress, userAgent, details, timestamp.

---

## 9. Security Requirements & Hardening
- **Authentication & Sessions**: `httpOnly`, `secure` (true only when `NODE_ENV=production`), `sameSite` cookie sessions (no tokens in `localStorage`). Argon2 / bcrypt password hashing; strict input validation on client and server.
- **CSRF Protection**: CSRF protection (anti-CSRF token or double-submit cookie pattern) enforced for all state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`).
- **Rate Limiting**: Brute-force protection on `/auth/login`, `/auth/verify-otp`, `/auth/resend-otp`.
- **OTP Safety**: Bounded OTP attempts (max 5), short expiry (10-15 mins), cryptographic random generation.
- **Authorization & Scoping**:
  - No IDOR (Insecure Direct Object References). Ownership and hostel boundaries verified on every query/mutation.
  - Role-based and scope-based middleware guards on all sensitive routes.
- **Data Privacy**:
  - Sanitized API responses: Exclude passwords, hashes, tokens, student emails/phones from public/peer views.
- **File Upload Security**:
  - Whitelist file types (e.g. `image/jpeg`, `image/png`, `image/webp`).
  - Strict file size limit (e.g. max 5MB).
  - Non-executable storage naming.
- **Auditability**:
  - Soft-delete / deactivation pattern only. No destructive hard deletes on tickets, history, or audit logs.
  - Append-only audit logs.
- **Prototype Limitations Documentation**:
  - Document all prototype assumptions (e.g., in-memory or sandbox emailer) transparently.

---

## 10. User Interface Guidelines
- Clean, accessible, responsive layout built with Tailwind CSS.
- Semantic HTML and keyboard accessibility.
- Distinct visual badges for ticket status and priorities.
- Explicit feedback states: Loading spinners, skeleton screens, empty state messages, error banners, and success toasts.
- Restrained, professional styling: No distracting animations or heavy decorative gradients.
