# AGENTS.md: Working Rules & Operating Guidelines

This repository follows strict, verified engineering phases. Every AI agent or developer contributing to this codebase must adhere to the rules below.

---

## 1. Core Working Rules
1. **Phase Discipline**:
   - Do **ONLY** the phase requested by the user.
   - Stop and wait after finishing the requested phase. Never run ahead into unapproved phases.
2. **Codebase Preservation**:
   - Reuse existing code and patterns.
   - Do not overwrite configuration or code that you have not thoroughly inspected and understood.
3. **Mock Data Separation**:
   - Any mock data used for development/testing must be clearly labeled as mock.
   - Mock data must sit strictly behind an explicit service/repository interface that real API/database calls can replace without changing consumer code.
4. **Authentic Security Controls**:
   - No fake security controls. All access checks, role permissions, and ownership verification must be genuinely enforced on the server.
   - Never rely on client-side button hiding or route disabling as a substitute for backend authorization.
5. **Verification Before Claim**:
   - Never claim a feature works unless verified by running tests, executing commands, or checking verifiable output.
6. **Handling Blockers**:
   - If blocked or facing architectural ambiguity, ask at most 3 focused questions.
   - Otherwise, explicitly state reasonable assumptions and proceed.

---

## 2. End-of-Phase Reporting Template
At the conclusion of EVERY phase, provide a report containing these 5 sections:

1. **Files created / changed**:
   - Complete list of files with GitHub-style file links.
2. **Commands to run**:
   - Exact commands for setting up, running, seeding, or developing the application.
3. **Tests + build results**:
   - Exact output and status of test suites and builds (clearly stating anything not run or mocked).
4. **What works / what's incomplete**:
   - Verifiable feature checklist highlighting what has been built vs what remains for future phases.
5. **Suggested git commit message**:
   - Conventional commit message summarizing the work completed in the phase.

---

## 3. Architecture & Security Invariants
- **Backend Enforced**: Roles (`Student`, `Caretaker`, `Technician`, `Warden`, `Hostel Admin`) are strictly checked via backend middleware.
- **Admin Bootstrapping**: First Hostel Admin is created via a documented seed script reading env vars. No public path creates an admin.
- **Session & Auth Security**: Auth must use `httpOnly`, `secure`, `sameSite` cookie sessions (no tokens in `localStorage`).
- **Reference Codes vs Access Tokens**: Complaint reference numbers (e.g., `HCT-2026-XXXXX`) are tracking references, never authorization bearer tokens.
- **Data Privacy**: Endpoints must never leak other students' institutional email addresses, phone numbers, or verification tokens.
- **Lifecycle Auditing & Transitions**:
  - Rejection is allowed for Caretaker and Warden only, with mandatory reason.
  - Reopened returns to `Assigned` (same technician if still active, else Caretaker reassigns). Student submits a reopen request; Warden or Caretaker approves it.
  - Every status transition must generate an append-only status history and audit record with actor identity and timestamp.
- **Unresolved Reports**: Enforce unique index on `(complaint, student)`.
- **Escalation Service**: Escalation logic runs server-side, driven by background workers, and must be strictly idempotent across restarts. Evaluates two SLA types per priority/category: acknowledgment deadline and resolution deadline. Each has Tier 1 (→ Warden) and Tier 2 (→ Hostel Admin).
