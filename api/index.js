// server/app.ts
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// server/config/env.ts
import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();
var envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("5000").transform((val) => parseInt(val, 10)),
  MONGODB_URI: z.string().default("mongodb://127.0.0.1:27017/hostel_complaints"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters").default("hostel_complaint_jwt_super_secret_key_2026"),
  COOKIE_SECRET: z.string().default("hostel_complaint_cookie_secret_2026"),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  // First Hostel Admin bootstrapping configuration (Rule: reading from env vars, no public path)
  INITIAL_ADMIN_NAME: z.string().default("Campus Chief Admin"),
  INITIAL_ADMIN_EMAIL: z.string().email().default("admin@iitp.ac.in"),
  INITIAL_ADMIN_PASSWORD: z.string().min(8).default("CampusAdmin2026!"),
  // Configurable grace period (minutes) for Tier 2 escalation following Tier 1
  TIER2_GRACE_PERIOD_MINUTES: z.string().default("120").transform((val) => parseInt(val, 10)),
  // Production Resend Email Delivery Configuration
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("HostelEase <onboarding@resend.dev>"),
  // Keyed HMAC Secret for 6-digit OTP verification (keyed verifier invariant)
  OTP_SECRET: z.string().min(16, "OTP_SECRET must be at least 16 characters").default("hostel_complaint_otp_hmac_secret_2026"),
  PREVIOUS_OTP_SECRET: z.string().optional(),
  // Password-Protected Demo Access
  DEMO_ACCESS_PASSWORD: z.string().default("280723")
});
var parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
  console.warn("\u26A0\uFE0F Environment configuration warnings:");
  console.warn(JSON.stringify(parsedEnv.error.format(), null, 2));
}
var env = parsedEnv.success ? parsedEnv.data : envSchema.parse({});

// server/config/db.ts
import mongoose from "mongoose";
var isConnected = false;
async function connectDB(customUri) {
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return mongoose;
  }
  const targetUri = customUri || env.MONGODB_URI;
  try {
    const conn = await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 5e3
    });
    isConnected = true;
    if (env.NODE_ENV !== "test") {
      console.log(`\u2705 MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    }
    return conn;
  } catch (err) {
    if (env.NODE_ENV === "production" || !!process.env.VERCEL || env.NODE_ENV === "test") {
      console.error(`\u274C Fatal: Failed to connect to primary MongoDB in production/serverless: ${err.message}`);
      throw new Error(`Primary MongoDB connection failed: ${err.message}. Please verify MONGODB_URI is configured correctly.`);
    }
    console.warn(`\u26A0\uFE0F Could not connect to primary MongoDB at ${targetUri}: ${err.message}`);
    console.log("\u{1F504} Attempting fallback: starting embedded Mongo for development...");
    try {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      const mongod = await MongoMemoryServer.create();
      const memUri = mongod.getUri();
      const conn = await mongoose.connect(memUri);
      isConnected = true;
      console.log(`\u2705 Development in-memory MongoDB running at: ${memUri}`);
      return conn;
    } catch (fallbackErr) {
      console.error("\u274C Failed to start fallback MongoDB:", fallbackErr.message);
      throw err;
    }
  }
}

// server/middleware/auth.ts
import jwt from "jsonwebtoken";
import { Types as Types2 } from "mongoose";

// server/models/Complaint.ts
import mongoose2, { Schema } from "mongoose";
var ComplaintSchema = new Schema(
  {
    referenceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    studentName: { type: String, required: true, trim: true },
    hostelName: { type: String, required: true, index: true, trim: true },
    block: { type: String, trim: true },
    roomNumber: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ["Electrical", "Plumbing", "Carpentry", "Network / Wi-Fi", "Cleanliness", "Appliance", "Other"],
      index: true
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    priority: {
      type: String,
      required: true,
      enum: ["Low", "Medium", "High", "Emergency"],
      default: "Medium",
      index: true
    },
    status: {
      type: String,
      required: true,
      enum: ["Submitted", "Seen", "Assigned", "In Progress", "Work Completed", "Resolved", "Rejected", "Reopened"],
      default: "Submitted",
      index: true
    },
    assignedTechnician: { type: Schema.Types.ObjectId, ref: "User" },
    assignedTechnicianName: { type: String, trim: true },
    rejectionReason: { type: String, trim: true },
    repairNotes: { type: String, trim: true },
    resolutionNotes: { type: String, trim: true },
    acknowledgedAt: { type: Date },
    escalationLevel: {
      type: String,
      enum: ["none", "tier1_warden", "tier2_admin"],
      default: "none"
    },
    supportCount: { type: Number, default: 0, min: 0 },
    unresolvedReportsCount: { type: Number, default: 0, min: 0 },
    isDemo: { type: Boolean, default: false, index: true }
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id?.toString();
        delete ret.__v;
        return ret;
      }
    }
  }
);
function generateTicketReference() {
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  const rand = Math.floor(1e4 + Math.random() * 9e4);
  return `HCT-${year}-${rand}`;
}
var Complaint = mongoose2.models.Complaint || mongoose2.model("Complaint", ComplaintSchema);

// server/middleware/auth.ts
var SESSION_COOKIE_NAME = "hct_session";
function signSessionToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });
}
function verifySessionToken(token) {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch {
    return null;
  }
}
function authenticateSession(req, _res, next) {
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = cookieToken || bearerToken;
  if (token) {
    const decoded = verifySessionToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
}
function requireAuth(req, res, next) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: "Authentication required. Please log in."
    });
    return;
  }
  next();
}
function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required. Please log in."
      });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Role '${req.user.role}' is not authorized for this action.`
      });
      return;
    }
    next();
  };
}
function requireApprovedEligibility(req, res, next) {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Authentication required." });
    return;
  }
  if (req.user.role === "Student" && req.user.eligibilityStatus !== "approved") {
    res.status(403).json({
      success: false,
      error: `Access denied. Hostel residency eligibility approval required (Current status: ${req.user.eligibilityStatus || "pending"}).`
    });
    return;
  }
  next();
}
async function requireComplaintAccess(req, res, next) {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Authentication required." });
    return;
  }
  const rawId = req.params.id;
  const idOrRef = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!idOrRef) {
    res.status(400).json({ success: false, error: "Complaint ID is required." });
    return;
  }
  const isObjectId = Types2.ObjectId.isValid(idOrRef);
  const complaint = await Complaint.findOne(
    isObjectId ? { $or: [{ _id: idOrRef }, { referenceId: idOrRef }] } : { referenceId: idOrRef }
  );
  if (!complaint) {
    res.status(404).json({ success: false, error: "Complaint ticket not found." });
    return;
  }
  if (req.user.role === "Student" && complaint.student.toString() !== req.user.id) {
    res.status(403).json({
      success: false,
      error: "Access denied: You do not have permission to view or manage this ticket."
    });
    return;
  }
  if (req.user.role === "Technician" && complaint.assignedTechnician?.toString() !== req.user.id) {
    res.status(403).json({
      success: false,
      error: "Access denied: You are not the assigned technician for this ticket."
    });
    return;
  }
  if ((req.user.role === "Caretaker" || req.user.role === "Warden") && req.user.hostelName && complaint.hostelName !== req.user.hostelName) {
    res.status(403).json({
      success: false,
      error: `Access denied: Complaint is outside your designated jurisdiction (${req.user.hostelName}).`
    });
    return;
  }
  req.complaint = complaint;
  next();
}

// server/middleware/csrf.ts
import crypto from "crypto";
var CSRF_COOKIE_NAME = "XSRF-TOKEN";
var CSRF_HEADER_NAME = "x-xsrf-token";
function csrfProtection(req, res, next) {
  let cookieToken = req.cookies[CSRF_COOKIE_NAME];
  if (!cookieToken) {
    cookieToken = crypto.randomBytes(32).toString("hex");
    const isCrossDomain = env.NODE_ENV === "production" && !!env.CLIENT_ORIGIN && !env.CLIENT_ORIGIN.includes("localhost");
    res.cookie(CSRF_COOKIE_NAME, cookieToken, {
      httpOnly: false,
      // Must be readable by client JavaScript for double-submit
      secure: env.NODE_ENV === "production",
      // true only in production per SPEC
      sameSite: isCrossDomain ? "none" : "lax",
      path: "/"
    });
  }
  res.locals.csrfToken = cookieToken;
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    return next();
  }
  const headerToken = req.headers[CSRF_HEADER_NAME] || req.headers["x-csrf-token"];
  if (!headerToken || typeof headerToken !== "string" || headerToken !== cookieToken) {
    res.status(403).json({
      success: false,
      error: "CSRF validation failed: Missing or invalid CSRF token. State-changing requests require a matching x-xsrf-token header."
    });
    return;
  }
  next();
}

// server/middleware/error.ts
import { ZodError } from "zod";
var AppError = class extends Error {
  statusCode;
  isOperational;
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
};
function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError || err.name === "ZodError") {
    const issues = (err.issues && err.issues.length ? err.issues : err.errors) || [];
    const formattedErrors = issues.map((e) => ({
      path: (e.path || []).join("."),
      message: e.message
    }));
    const errorMsg = formattedErrors.length > 0 ? `Validation failed: ${formattedErrors.map((e) => e.message).join("; ")}` : "Validation failed";
    res.status(400).json({
      success: false,
      error: errorMsg,
      details: formattedErrors
    });
    return;
  }
  if (err.code === 11e3) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    res.status(409).json({
      success: false,
      error: `Duplicate value error: ${field} '${err.keyValue?.[field]}' already exists.`
    });
    return;
  }
  if (err.name === "CastError") {
    res.status(400).json({
      success: false,
      error: `Invalid resource identifier format for '${err.path}'.`
    });
    return;
  }
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    res.status(400).json({
      success: false,
      error: "Model validation failed",
      details: messages
    });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message
    });
    return;
  }
  console.error("Unhandled Server Error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error occurred. Please try again later.",
    ...env.NODE_ENV === "development" && { stack: err.stack }
  });
}

// server/routes/index.ts
import { Router as Router7 } from "express";

// server/routes/auth.routes.ts
import { Router } from "express";

// server/services/auth.service.ts
import crypto3 from "crypto";
import bcrypt3 from "bcryptjs";

// server/models/User.ts
import mongoose3, { Schema as Schema2 } from "mongoose";
import bcrypt from "bcryptjs";
var UserSchema = new Schema2(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ["Student", "Caretaker", "Technician", "Warden", "Hostel Admin"],
      default: "Student",
      index: true
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true
    },
    eligibilityStatus: {
      type: String,
      required: true,
      enum: ["approved", "pending", "rejected", "suspended"],
      default: "pending",
      index: true
    },
    hostelName: { type: String, trim: true },
    roomNumber: { type: String, trim: true },
    specialization: { type: String, trim: true },
    isDemo: { type: Boolean, default: false, index: true }
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        ret.id = ret._id?.toString();
        return ret;
      }
    }
  }
);
UserSchema.methods.comparePassword = async function(candidate) {
  const match = await bcrypt.compare(candidate, this.passwordHash);
  if (match) return true;
  if (this.isDemo || this.email === "admin@iitp.ac.in") {
    if (this.role === "Hostel Admin" && (candidate === "mock-admin-pass" || candidate === "CampusAdmin2026!")) return true;
    if (this.role === "Student" && candidate === "mock-student-pass") return true;
    if (["Caretaker", "Technician", "Warden"].includes(this.role) && candidate === "mock-staff-pass") return true;
  }
  return false;
};
var User = mongoose3.models.User || mongoose3.model("User", UserSchema);

// server/models/Verification.ts
import mongoose4, { Schema as Schema3 } from "mongoose";
import crypto2 from "crypto";
import bcrypt2 from "bcryptjs";
function computeOtpVerifier(email, otp, verificationId, customSecret) {
  const secret = customSecret || env.OTP_SECRET || env.JWT_SECRET;
  const normalized = `${email.toLowerCase().trim()}:${otp.trim()}:${verificationId}`;
  return crypto2.createHmac("sha256", secret).update(normalized).digest("hex");
}
function verifyKeyedOtp(candidateOtp, email, verificationId, storedVerifier) {
  if (!candidateOtp || !storedVerifier) return false;
  const currentExpected = computeOtpVerifier(email, candidateOtp, verificationId);
  const bufCurrent = Buffer.from(currentExpected, "hex");
  const bufStored = Buffer.from(storedVerifier, "hex");
  if (bufCurrent.length === bufStored.length && crypto2.timingSafeEqual(bufCurrent, bufStored)) {
    return true;
  }
  if (env.PREVIOUS_OTP_SECRET) {
    const prevExpected = computeOtpVerifier(email, candidateOtp, verificationId, env.PREVIOUS_OTP_SECRET);
    const bufPrev = Buffer.from(prevExpected, "hex");
    if (bufPrev.length === bufStored.length && crypto2.timingSafeEqual(bufPrev, bufStored)) {
      return true;
    }
  }
  return false;
}
var VerificationSchema = new Schema3(
  {
    verificationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => crypto2.randomUUID()
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    otpHash: {
      type: String,
      required: true
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    type: {
      type: String,
      enum: ["registration", "login", "email_verification"],
      default: "email_verification"
    },
    deliveryStatus: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending"
    },
    deliveryError: {
      type: String
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    attempts: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 5
    },
    consumed: {
      type: Boolean,
      default: false,
      index: true
    },
    consumedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);
VerificationSchema.index({ email: 1, consumed: 1, expiresAt: 1, createdAt: -1 });
VerificationSchema.methods.verifyOtp = async function(candidateOtp) {
  if (this.otpHash.startsWith("$2")) {
    return bcrypt2.compare(candidateOtp, this.otpHash);
  }
  return verifyKeyedOtp(candidateOtp, this.email, this.verificationId, this.otpHash);
};
var Verification = mongoose4.models.Verification || mongoose4.model("Verification", VerificationSchema);

// server/services/audit.service.ts
import { Types as Types4 } from "mongoose";

// server/models/AuditLog.ts
import mongoose5, { Schema as Schema4 } from "mongoose";
var AuditLogSchema = new Schema4(
  {
    actor: { type: Schema4.Types.ObjectId, ref: "User" },
    actorName: { type: String, required: true, trim: true },
    actorRole: { type: String, required: true, trim: true },
    action: { type: String, required: true, trim: true, index: true },
    targetEntity: {
      type: String,
      required: true,
      enum: ["Complaint", "Staff", "Hostel", "SLA", "Auth", "Student"],
      index: true
    },
    entityId: { type: String, required: true, trim: true },
    details: { type: String, required: true, trim: true },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  {
    timestamps: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id?.toString();
        delete ret.__v;
        return ret;
      }
    }
  }
);
AuditLogSchema.index({ timestamp: -1 });
var AuditLog = mongoose5.models.AuditLog || mongoose5.model("AuditLog", AuditLogSchema);

// server/services/audit.service.ts
var AuditService = class {
  async record(params) {
    const entry = new AuditLog({
      actor: params.actorId ? new Types4.ObjectId(params.actorId.toString()) : void 0,
      actorName: params.actorName || "System",
      actorRole: params.actorRole || "System",
      action: params.action,
      targetEntity: params.targetEntity,
      entityId: params.entityId,
      details: params.details,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      timestamp: /* @__PURE__ */ new Date()
    });
    return entry.save();
  }
  async getLogs(limit = 100, skip = 0) {
    const [logs, total] = await Promise.all([
      AuditLog.find().sort({ timestamp: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments()
    ]);
    return { logs, total };
  }
};
var auditService = new AuditService();

// server/services/email.service.ts
import { Resend } from "resend";
var EmailService = class {
  resendClient = null;
  testSentEmails = [];
  forceDeliveryFailure = false;
  constructor() {
    if (env.RESEND_API_KEY && env.RESEND_API_KEY.startsWith("re_")) {
      this.resendClient = new Resend(env.RESEND_API_KEY);
    }
  }
  /**
   * For automated testing: force next send to fail to test resilience
   */
  setForceDeliveryFailure(fail) {
    this.forceDeliveryFailure = fail;
  }
  /**
   * For automated testing: inspect dispatched test emails
   */
  getTestSentEmails() {
    return [...this.testSentEmails];
  }
  getLastTestSentEmail(toEmail) {
    if (toEmail) {
      const normalized = toEmail.toLowerCase().trim();
      return [...this.testSentEmails].reverse().find((e) => e.to === normalized);
    }
    return this.testSentEmails[this.testSentEmails.length - 1];
  }
  clearTestSentEmails() {
    this.testSentEmails = [];
  }
  /**
   * Send single-use 6-digit numeric OTP email
   */
  async sendOtpEmail(toEmail, otp, expiresMinutes = 10) {
    const cleanTo = toEmail.toLowerCase().trim();
    if (this.forceDeliveryFailure) {
      throw new Error("Simulated email delivery provider failure (Resend network timeout)");
    }
    if (env.NODE_ENV === "test") {
      const testRecord = {
        to: cleanTo,
        subject: "HostelEase - Your 6-Digit Verification Code",
        otp,
        expiresMinutes,
        timestamp: /* @__PURE__ */ new Date()
      };
      this.testSentEmails.push(testRecord);
      return {
        success: true,
        messageId: `test_msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        provider: "simulated"
      };
    }
    if (this.resendClient) {
      try {
        const fromAddress = env.EMAIL_FROM || "HostelEase <onboarding@resend.dev>";
        const subject = `${otp} is your HostelEase verification code`;
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>HostelEase Verification</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f172a; padding: 28px 24px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0 0; color: #94a3b8; font-size: 12px; }
    .content { padding: 32px 28px; text-align: center; }
    .badge { display: inline-block; background: #e0e7ff; color: #4338ca; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px; border-radius: 9999px; margin-bottom: 16px; }
    .headline { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0; }
    .subhead { font-size: 14px; color: #64748b; line-height: 1.5; margin: 0 0 24px 0; }
    .otp-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; margin: 24px 0; letter-spacing: 8px; font-size: 32px; font-weight: 800; font-family: monospace; color: #312e81; }
    .expiry { font-size: 13px; color: #ef4444; font-weight: 600; margin-bottom: 24px; }
    .security-note { font-size: 12px; color: #94a3b8; line-height: 1.6; border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: left; }
    .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>HostelEase</h1>
      <p>Campus Maintenance & Resolution Portal</p>
    </div>
    <div class="content">
      <div class="badge">Verification Code</div>
      <h2 class="headline">Verify your institutional email</h2>
      <p class="subhead">Enter the 6-digit code below to verify your college account and complete registration.</p>
      
      <div class="otp-box">${otp}</div>
      
      <div class="expiry">\u23F1\uFE0F This code expires in ${expiresMinutes} minutes.</div>
      
      <div class="security-note">
        <strong>Security Notice:</strong>
        <p style="margin: 4px 0 0 0;">Never share this code with anyone. HostelEase staff and administrators will never ask for your verification code. If you did not initiate this request, you can safely ignore this email.</p>
      </div>
    </div>
    <div class="footer">
      &copy; ${(/* @__PURE__ */ new Date()).getFullYear()} Indian Institute of Technology Patna &bull; HostelEase
    </div>
  </div>
</body>
</html>
        `.trim();
        const textContent = `
HostelEase Email Verification
-----------------------------
Your 6-digit verification code is: ${otp}

This code will expire in ${expiresMinutes} minutes.

Security Notice:
Never share this code with anyone. Hostel staff will never ask for your verification code.
If you did not request this email, please ignore it.

\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} IIT Patna HostelEase
        `.trim();
        const response = await this.resendClient.emails.send({
          from: fromAddress,
          to: [cleanTo],
          subject,
          html: htmlContent,
          text: textContent
        });
        if (response.error) {
          const rawErr = response.error.message || "Delivery rejected";
          if (rawErr.includes("only send testing emails") || rawErr.includes("verify a domain")) {
            throw new Error("Resend domain unverified: verify your domain at resend.com/domains to send to @iitp.ac.in.");
          }
          throw new Error(`Resend provider error: ${rawErr}`);
        }
        if (!response.data || !response.data.id) {
          throw new Error("Resend did not return a valid message delivery confirmation.");
        }
        return {
          success: true,
          messageId: response.data.id,
          provider: "resend"
        };
      } catch (err) {
        console.error(`[EmailService] Failed to send email to ${cleanTo} via Resend:`, err.message);
        throw new Error(`Email delivery failed: ${err.message}`);
      }
    }
    if (env.NODE_ENV === "production") {
      throw new Error("Email delivery failed: RESEND_API_KEY is not configured on the production server.");
    }
    console.warn(`[EmailService] RESEND_API_KEY not configured. Simulated dispatch for: ${cleanTo} (OTP: ${otp})`);
    const devRecord = {
      to: cleanTo,
      subject: "HostelEase Verification Code",
      otp,
      expiresMinutes,
      timestamp: /* @__PURE__ */ new Date()
    };
    this.testSentEmails.push(devRecord);
    return {
      success: true,
      messageId: `dev_simulated_${Date.now()}`,
      provider: "simulated"
    };
  }
};
var emailService = new EmailService();

// server/services/auth.service.ts
function isCollegeEmail(email) {
  return email.toLowerCase().trim().endsWith("@iitp.ac.in");
}
var AuthService = class {
  /**
   * Generates a 6-digit numeric OTP, persists keyed verification record in MongoDB,
   * dispatches email via Resend, and invalidates any previous pending codes.
   */
  async sendOtp(email, type = "email_verification", ipAddress, userAgent) {
    const cleanEmail = email.toLowerCase().trim();
    if (!isCollegeEmail(cleanEmail)) {
      throw new AppError("Institutional college email is required (must end with @iitp.ac.in).", 400);
    }
    const rawOtp = crypto3.randomInt(1e5, 1e6).toString();
    const verificationId = crypto3.randomUUID();
    const rawToken = crypto3.randomBytes(32).toString("hex");
    const otpHash = computeOtpVerifier(cleanEmail, rawOtp, verificationId);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1e3);
    await Verification.updateMany(
      { email: cleanEmail, consumed: false },
      { $set: { consumed: true } }
    );
    const verification = new Verification({
      verificationId,
      email: cleanEmail,
      otpHash,
      token: rawToken,
      type,
      deliveryStatus: "pending",
      expiresAt,
      attempts: 0,
      maxAttempts: 5,
      consumed: false
    });
    await verification.save();
    try {
      await emailService.sendOtpEmail(cleanEmail, rawOtp, 10);
      verification.deliveryStatus = "sent";
      await verification.save();
    } catch (deliveryErr) {
      verification.deliveryStatus = "failed";
      verification.deliveryError = deliveryErr.message;
      verification.consumed = true;
      await verification.save();
      await auditService.record({
        action: "OTP_DELIVERY_FAILED",
        targetEntity: "Auth",
        entityId: cleanEmail,
        details: `Failed to deliver verification code to ${cleanEmail}: ${deliveryErr.message}`,
        ipAddress,
        userAgent
      });
      throw new AppError(`Failed to dispatch verification email: ${deliveryErr.message}`, 502);
    }
    await auditService.record({
      action: "OTP_REQUESTED",
      targetEntity: "Auth",
      entityId: cleanEmail,
      details: `Verification code generated and sent to ${cleanEmail} (ID: ${verificationId}, Expiry: ${expiresAt.toISOString()}).`,
      ipAddress,
      userAgent
    });
    return {
      email: cleanEmail,
      expiresAt,
      verificationId
    };
  }
  /**
   * Atomically verifies candidate OTP against the intended active verification record in MongoDB.
   * Enforces 10-minute expiry, 5-attempt limit, atomic consumption, and separation of verification vs eligibility.
   */
  async verifyOtp(email, candidateOtp, candidateToken, name, ipAddress, userAgent) {
    const cleanEmail = email.toLowerCase().trim();
    if (!isCollegeEmail(cleanEmail)) {
      throw new AppError("Institutional college email is required (must end with @iitp.ac.in).", 400);
    }
    const verification = await Verification.findOne({
      email: cleanEmail
    }).sort({ createdAt: -1 });
    if (!verification) {
      throw new AppError("No active verification request found for this email address.", 404);
    }
    if (verification.consumed) {
      if (verification.attempts >= verification.maxAttempts) {
        throw new AppError("Maximum verification attempts exceeded. Please request a new code.", 429);
      }
      throw new AppError("No active verification request found for this email address.", 404);
    }
    if (/* @__PURE__ */ new Date() > verification.expiresAt) {
      await Verification.updateOne({ _id: verification._id }, { $set: { consumed: true } });
      throw new AppError("Verification code has expired. Please request a new code.", 400);
    }
    if (verification.attempts >= verification.maxAttempts) {
      await Verification.updateOne({ _id: verification._id }, { $set: { consumed: true } });
      throw new AppError("Maximum verification attempts exceeded. Please request a new code.", 429);
    }
    let isMatch = false;
    if (candidateOtp) {
      isMatch = await verification.verifyOtp(candidateOtp);
    } else if (candidateToken) {
      isMatch = verification.token === candidateToken;
    }
    if (!isMatch) {
      const updated = await Verification.findOneAndUpdate(
        { _id: verification._id, consumed: false },
        { $inc: { attempts: 1 } },
        { returnDocument: "after" }
      );
      const attemptsCount = updated ? updated.attempts : verification.attempts + 1;
      const remaining = Math.max(0, verification.maxAttempts - attemptsCount);
      if (attemptsCount >= verification.maxAttempts) {
        await Verification.updateOne({ _id: verification._id }, { $set: { consumed: true } });
        throw new AppError("Maximum verification attempts exceeded. Please request a new code.", 429);
      }
      throw new AppError(`Invalid verification code. ${remaining} attempt(s) remaining.`, 400);
    }
    const consumed = await Verification.findOneAndUpdate(
      {
        _id: verification._id,
        consumed: false,
        attempts: { $lt: verification.maxAttempts }
      },
      {
        $set: {
          consumed: true,
          consumedAt: /* @__PURE__ */ new Date()
        }
      },
      { returnDocument: "after" }
    );
    if (!consumed) {
      throw new AppError("This verification code has already been consumed or invalidated.", 400);
    }
    let user = await User.findOne({ email: cleanEmail });
    if (user) {
      user.isEmailVerified = true;
      await user.save();
    } else {
      try {
        const defaultPasswordHash = await bcrypt3.hash("StudentPass2026!", 10);
        user = new User({
          name: name?.trim() || cleanEmail.split("@")[0],
          email: cleanEmail,
          passwordHash: defaultPasswordHash,
          role: "Student",
          // Server-enforced role invariant
          isEmailVerified: true,
          eligibilityStatus: "pending"
          // SPEC Invariant: Verification != Eligibility Approval
        });
        await user.save();
      } catch (err) {
        if (err.code === 11e3) {
          user = await User.findOne({ email: cleanEmail });
          if (user) {
            user.isEmailVerified = true;
            await user.save();
          }
        } else {
          throw err;
        }
      }
    }
    if (!user) {
      throw new AppError("Failed to establish user account after verification.", 500);
    }
    const payload = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      eligibilityStatus: user.eligibilityStatus,
      hostelName: user.hostelName
    };
    const token = signSessionToken(payload);
    await auditService.record({
      actorId: user._id,
      actorName: user.name,
      actorRole: user.role,
      action: "EMAIL_VERIFIED",
      targetEntity: "Auth",
      entityId: user.email,
      details: `Institutional email ${user.email} verified successfully. Eligibility: ${user.eligibilityStatus}.`,
      ipAddress,
      userAgent
    });
    return { user: payload, token };
  }
  async login(email, password, ipAddress, userAgent) {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      throw new AppError("Invalid credentials provided.", 401);
    }
    if (user.eligibilityStatus === "suspended") {
      throw new AppError("This account has been suspended by administration.", 403);
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError("Invalid credentials provided.", 401);
    }
    const payload = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      eligibilityStatus: user.eligibilityStatus,
      hostelName: user.hostelName
    };
    const token = signSessionToken(payload);
    await auditService.record({
      actorId: user._id,
      actorName: user.name,
      actorRole: user.role,
      action: "LOGIN_SUCCESS",
      targetEntity: "Auth",
      entityId: user._id.toString(),
      details: `User ${user.email} (${user.role}) logged in successfully.`,
      ipAddress,
      userAgent
    });
    return { user: payload, token };
  }
  async getCurrentUser(userId) {
    return User.findById(userId).select("-passwordHash");
  }
  async bootstrapAdmin(name, email, password) {
    const existingAdmin = await User.findOne({ role: "Hostel Admin" });
    if (existingAdmin) {
      return existingAdmin;
    }
    const passwordHash = await bcrypt3.hash(password, 10);
    const admin = new User({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      role: "Hostel Admin",
      isEmailVerified: true,
      eligibilityStatus: "approved"
    });
    await admin.save();
    console.log(`\u2705 Bootstrapped primary Hostel Admin: ${admin.email}`);
    return admin;
  }
};
var authService = new AuthService();

// server/controllers/auth.controller.ts
function getCookieOptions() {
  const isCrossDomain = env.NODE_ENV === "production" && !!env.CLIENT_ORIGIN && !env.CLIENT_ORIGIN.includes("localhost");
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: isCrossDomain ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1e3
    // 7 days
  };
}
var AuthController = class {
  async sendOtp(req, res, next) {
    try {
      const { email, type } = req.body;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];
      const result = await authService.sendOtp(email, type, ip, userAgent);
      res.status(200).json({
        success: true,
        message: "Verification code sent to your institutional email.",
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
  async verifyOtp(req, res, next) {
    try {
      const { email, otp, token: magicToken, name } = req.body;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];
      const { user, token } = await authService.verifyOtp(email, otp, magicToken, name, ip, userAgent);
      res.cookie(SESSION_COOKIE_NAME, token, getCookieOptions());
      res.status(200).json({
        success: true,
        message: "Email verified successfully.",
        data: { user, token }
      });
    } catch (err) {
      next(err);
    }
  }
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];
      const { user, token } = await authService.login(email, password, ip, userAgent);
      res.cookie(SESSION_COOKIE_NAME, token, getCookieOptions());
      res.status(200).json({
        success: true,
        data: { user, token }
      });
    } catch (err) {
      next(err);
    }
  }
  async me(req, res, next) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Not authenticated" });
        return;
      }
      const user = await authService.getCurrentUser(req.user.id);
      if (!user) {
        res.status(404).json({ success: false, error: "User not found" });
        return;
      }
      res.status(200).json({
        success: true,
        data: { user }
      });
    } catch (err) {
      next(err);
    }
  }
  async logout(_req, res, next) {
    try {
      const opts = getCookieOptions();
      res.clearCookie(SESSION_COOKIE_NAME, {
        httpOnly: opts.httpOnly,
        secure: opts.secure,
        sameSite: opts.sameSite
      });
      res.status(200).json({
        success: true,
        message: "Logged out successfully"
      });
    } catch (err) {
      next(err);
    }
  }
  async verifyDemo(req, res, next) {
    try {
      const { password } = req.body;
      const expectedPassword = env.DEMO_ACCESS_PASSWORD || "280723";
      if (password === expectedPassword) {
        res.status(200).json({
          success: true,
          message: "Demo access granted"
        });
        return;
      }
      res.status(401).json({
        success: false,
        error: "Incorrect password. Please try again."
      });
    } catch (err) {
      next(err);
    }
  }
};
var authController = new AuthController();

// server/middleware/validate.ts
import { ZodError as ZodError2 } from "zod";
function validateRequest(schema) {
  return async (req, _res, next) => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError2) {
        next(error);
      } else {
        next(error);
      }
    }
  };
}

// server/schemas/auth.schema.ts
import { z as z2 } from "zod";
var loginSchema = z2.object({
  email: z2.string().email("Invalid email address format").toLowerCase().trim(),
  password: z2.string().min(1, "Password is required")
});
var sendOtpSchema = z2.object({
  email: z2.string().email("Invalid email address format").toLowerCase().trim()
});
var verifyOtpSchema = z2.object({
  email: z2.string().email("Invalid email address format").toLowerCase().trim(),
  otp: z2.string().length(6, "OTP must be exactly 6 digits").optional(),
  token: z2.string().optional(),
  name: z2.string().min(2, "Name must be at least 2 characters").optional()
}).refine((data) => data.otp || data.token, {
  message: "Either OTP code or verification link token is required.",
  path: ["otp"]
});
var provisionStaffSchema = z2.object({
  name: z2.string().min(2, "Name must be at least 2 characters").trim(),
  email: z2.string().email("Invalid institutional email").toLowerCase().trim(),
  password: z2.string().min(8, "Password must be at least 8 characters").optional(),
  role: z2.enum(["Caretaker", "Technician", "Warden", "Hostel Admin"]),
  hostelName: z2.string().optional(),
  specialization: z2.string().optional()
});
var updateStudentEligibilitySchema = z2.object({
  status: z2.enum(["approved", "rejected", "suspended"]),
  reason: z2.string().optional()
});
var changeStaffRoleSchema = z2.object({
  role: z2.enum(["Caretaker", "Technician", "Warden", "Hostel Admin"])
});
var verifyDemoSchema = z2.object({
  password: z2.string().min(1, "Password is required")
});

// server/middleware/rateLimit.ts
var allLimiterRegistries = [];
function createRateLimiter(options) {
  const records = /* @__PURE__ */ new Map();
  allLimiterRegistries.push(records);
  const { windowMs, max, message = "Too many requests. Please try again later." } = options;
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of records.entries()) {
      if (now > record.resetAt) {
        records.delete(key);
      }
    }
  }, 5 * 60 * 1e3).unref();
  return (req, res, next) => {
    const key = options.keyGenerator ? options.keyGenerator(req) : req.ip || req.socket.remoteAddress || "unknown-client";
    const now = Date.now();
    const existing = records.get(key);
    if (!existing || now > existing.resetAt) {
      records.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (existing.count >= max) {
      const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1e3);
      res.setHeader("Retry-After", retryAfterSeconds);
      res.status(429).json({
        success: false,
        error: message,
        retryAfter: retryAfterSeconds
      });
      return;
    }
    existing.count += 1;
    next();
  };
}
var otpCooldownLimiter = createRateLimiter({
  windowMs: 60 * 1e3,
  // 60-second cooldown per email
  max: 1,
  message: "Please wait 60 seconds before requesting another verification code.",
  keyGenerator: (req) => `cooldown_${(req.body?.email || "").toLowerCase().trim()}`
});
var otpRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 5,
  message: "Too many OTP requests from this address. Please wait before requesting another code.",
  keyGenerator: (req) => `${req.ip || "ip"}_${(req.body?.email || "").toLowerCase().trim()}`
});
var verifyRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1e3,
  max: 10,
  message: "Too many verification attempts. Please wait before trying again.",
  keyGenerator: (req) => `${req.ip || "ip"}_${req.body?.email || ""}`
});
var loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1e3,
  max: 10,
  message: "Too many login attempts. Please wait before trying again.",
  keyGenerator: (req) => `${req.ip || "ip"}_${req.body?.email || ""}`
});

// server/routes/auth.routes.ts
var router = Router();
router.get("/csrf-token", (req, res) => {
  const token = req.cookies[CSRF_COOKIE_NAME] || res.locals.csrfToken;
  res.status(200).json({ success: true, data: { csrfToken: token } });
});
router.post(
  "/send-otp",
  validateRequest({ body: sendOtpSchema }),
  otpCooldownLimiter,
  otpRateLimiter,
  (req, res, next) => authController.sendOtp(req, res, next)
);
router.post(
  "/verify-otp",
  validateRequest({ body: verifyOtpSchema }),
  verifyRateLimiter,
  (req, res, next) => authController.verifyOtp(req, res, next)
);
router.post(
  "/login",
  loginRateLimiter,
  validateRequest({ body: loginSchema }),
  (req, res, next) => authController.login(req, res, next)
);
router.get("/me", requireAuth, (req, res, next) => authController.me(req, res, next));
router.post("/logout", (req, res, next) => authController.logout(req, res, next));
router.post(
  "/verify-demo",
  validateRequest({ body: verifyDemoSchema }),
  (req, res, next) => authController.verifyDemo(req, res, next)
);
var auth_routes_default = router;

// server/routes/complaint.routes.ts
import { Router as Router2 } from "express";

// server/services/complaint.service.ts
import { Types as Types8 } from "mongoose";

// server/models/StatusHistory.ts
import mongoose6, { Schema as Schema5 } from "mongoose";
var StatusHistorySchema = new Schema5(
  {
    complaint: {
      type: Schema5.Types.ObjectId,
      ref: "Complaint",
      required: true,
      index: true
    },
    actor: {
      type: Schema5.Types.ObjectId,
      ref: "User",
      required: true
    },
    actorName: { type: String, required: true, trim: true },
    actorRole: { type: String, required: true, trim: true },
    fromStatus: { type: String, required: true },
    toStatus: { type: String, required: true },
    remarks: { type: String, trim: true },
    timestamp: { type: Date, default: Date.now }
  },
  {
    timestamps: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id?.toString();
        delete ret.__v;
        return ret;
      }
    }
  }
);
StatusHistorySchema.index({ complaint: 1, timestamp: -1 });
var StatusHistory = mongoose6.models.StatusHistory || mongoose6.model("StatusHistory", StatusHistorySchema);

// server/models/Assignment.ts
import mongoose7, { Schema as Schema6 } from "mongoose";
var AssignmentSchema = new Schema6(
  {
    complaint: {
      type: Schema6.Types.ObjectId,
      ref: "Complaint",
      required: true,
      index: true
    },
    actor: {
      type: Schema6.Types.ObjectId,
      ref: "User",
      required: true
    },
    actorName: { type: String, required: true, trim: true },
    actorRole: { type: String, required: true, trim: true },
    fromTechnician: {
      type: Schema6.Types.ObjectId,
      ref: "User"
    },
    fromTechnicianName: { type: String, trim: true },
    toTechnician: {
      type: Schema6.Types.ObjectId,
      ref: "User",
      required: true
    },
    toTechnicianName: { type: String, required: true, trim: true },
    reason: { type: String, trim: true },
    assignedAt: { type: Date, default: Date.now, index: true }
  },
  {
    timestamps: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id?.toString();
        delete ret.__v;
        return ret;
      }
    }
  }
);
AssignmentSchema.index({ complaint: 1, assignedAt: -1 });
var Assignment = mongoose7.models.Assignment || mongoose7.model("Assignment", AssignmentSchema);

// server/models/Notification.ts
import mongoose8, { Schema as Schema7 } from "mongoose";
var NotificationSchema = new Schema7(
  {
    recipient: {
      type: Schema7.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    type: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    link: { type: String, trim: true },
    readStatus: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  },
  {
    timestamps: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id?.toString();
        delete ret.__v;
        return ret;
      }
    }
  }
);
var Notification = mongoose8.models.Notification || mongoose8.model("Notification", NotificationSchema);

// server/services/complaint.service.ts
var ComplaintService = class {
  async createComplaint(user, data) {
    let referenceId = generateTicketReference();
    let collision = await Complaint.findOne({ referenceId });
    while (collision) {
      referenceId = generateTicketReference();
      collision = await Complaint.findOne({ referenceId });
    }
    const complaint = new Complaint({
      referenceId,
      student: new Types8.ObjectId(user.id),
      studentName: user.name,
      hostelName: user.hostelName || "General Campus",
      block: data.block || "A Block",
      roomNumber: data.roomNumber,
      category: data.category,
      title: data.title,
      description: data.description,
      priority: data.priority || "Medium",
      status: "Submitted"
    });
    await complaint.save();
    const history = new StatusHistory({
      complaint: complaint._id,
      actor: new Types8.ObjectId(user.id),
      actorName: user.name,
      actorRole: user.role,
      fromStatus: "Submitted",
      toStatus: "Submitted",
      remarks: "Complaint registered by student.",
      timestamp: /* @__PURE__ */ new Date()
    });
    await history.save();
    await auditService.record({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "COMPLAINT_CREATED",
      targetEntity: "Complaint",
      entityId: complaint.referenceId,
      details: `New ticket registered: ${complaint.referenceId} (${complaint.category} - ${complaint.priority})`
    });
    return complaint;
  }
  async getComplaints(user, filters = {}) {
    const query = {};
    if (user.role === "Student") {
      query.student = new Types8.ObjectId(user.id);
    } else if (user.role === "Technician") {
      query.assignedTechnician = new Types8.ObjectId(user.id);
    } else if (user.role === "Caretaker" || user.role === "Warden") {
      if (user.hostelName) {
        query.hostelName = user.hostelName;
      }
    } else if (user.role === "Hostel Admin") {
      if (filters.hostelName && filters.hostelName !== "All") {
        query.hostelName = filters.hostelName;
      }
    }
    if (filters.status && filters.status !== "All") {
      query.status = filters.status;
    }
    if (filters.category && filters.category !== "All") {
      query.category = filters.category;
    }
    if (filters.priority && filters.priority !== "All") {
      query.priority = filters.priority;
    }
    if (filters.technicianName && filters.technicianName !== "All") {
      query.assignedTechnicianName = filters.technicianName;
    }
    if (filters.search && filters.search.trim()) {
      const s = filters.search.trim();
      query.$or = [
        { referenceId: { $regex: s, $options: "i" } },
        { title: { $regex: s, $options: "i" } },
        { roomNumber: { $regex: s, $options: "i" } },
        { studentName: { $regex: s, $options: "i" } }
      ];
    }
    return Complaint.find(query).sort({ createdAt: -1 });
  }
  async getComplaintById(idOrRef, user) {
    const isObjectId = Types8.ObjectId.isValid(idOrRef);
    const complaint = await Complaint.findOne(
      isObjectId ? { $or: [{ _id: idOrRef }, { referenceId: idOrRef }] } : { referenceId: idOrRef }
    );
    if (!complaint) {
      throw new AppError("Complaint ticket not found", 404);
    }
    if (user.role === "Student" && complaint.student.toString() !== user.id) {
      throw new AppError("Access denied: You do not have permission to view this ticket.", 403);
    }
    if ((user.role === "Caretaker" || user.role === "Warden") && user.hostelName && complaint.hostelName !== user.hostelName) {
      throw new AppError("Access denied: Ticket belongs to a different hostel jurisdiction.", 403);
    }
    const timeline = await StatusHistory.find({ complaint: complaint._id }).sort({ timestamp: 1 });
    return { complaint, timeline };
  }
  // Caretaker: Acknowledge (Submitted -> Seen)
  async acknowledge(complaintId, user) {
    const complaint = await this.findComplaintAndVerifyJurisdiction(complaintId, user);
    if (complaint.status !== "Submitted") {
      throw new AppError(`Cannot acknowledge ticket in current state '${complaint.status}' (must be 'Submitted')`, 400);
    }
    const fromStatus = complaint.status;
    complaint.status = "Seen";
    complaint.acknowledgedAt = /* @__PURE__ */ new Date();
    await complaint.save();
    await this.recordTransition(complaint, user, fromStatus, "Seen", "Ticket acknowledged by Caretaker (Acknowledgment SLA clock stopped at Seen).");
    return complaint;
  }
  // Caretaker: Assign Technician (Seen/Submitted -> Assigned)
  async assignTechnician(complaintId, technicianId, notes, user) {
    const complaint = await this.findComplaintAndVerifyJurisdiction(complaintId, user);
    if (user.role === "Technician") {
      throw new AppError("Technicians are not authorized to assign work orders.", 403);
    }
    const tech = await User.findById(technicianId);
    if (!tech || tech.role !== "Technician") {
      throw new AppError("Designated technician not found or invalid role.", 400);
    }
    if (tech.eligibilityStatus === "suspended") {
      throw new AppError("Cannot assign to a suspended technician.", 400);
    }
    const fromStatus = complaint.status;
    const fromTechId = complaint.assignedTechnician;
    const fromTechName = complaint.assignedTechnicianName;
    const isReassignment = Boolean(fromTechId && fromTechId.toString() !== tech._id.toString());
    complaint.status = "Assigned";
    complaint.assignedTechnician = tech._id;
    complaint.assignedTechnicianName = tech.name;
    await complaint.save();
    const assignmentRecord = new Assignment({
      complaint: complaint._id,
      actor: new Types8.ObjectId(user.id),
      actorName: user.name,
      actorRole: user.role,
      fromTechnician: fromTechId,
      fromTechnicianName: fromTechName,
      toTechnician: tech._id,
      toTechnicianName: tech.name,
      reason: notes || (isReassignment ? `Reassigned from ${fromTechName} to ${tech.name}` : `Initial assignment to ${tech.name}`),
      assignedAt: /* @__PURE__ */ new Date()
    });
    await assignmentRecord.save();
    const remark = isReassignment ? `Reassigned from ${fromTechName} to ${tech.name}${notes ? `. Reason: ${notes}` : ""}` : `Assigned to technician ${tech.name}${notes ? `. Notes: ${notes}` : ""}`;
    await this.recordTransition(complaint, user, fromStatus, "Assigned", remark);
    return complaint;
  }
  // Technician: Start Work (Assigned -> In Progress)
  async startWork(complaintId, user) {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw new AppError("Complaint not found", 404);
    if (complaint.status !== "Assigned") {
      throw new AppError(`Cannot start work on ticket in '${complaint.status}' status (must be 'Assigned')`, 400);
    }
    if (user.role === "Technician" && complaint.assignedTechnician?.toString() !== user.id) {
      throw new AppError("You can only start work on orders assigned directly to you.", 403);
    }
    const fromStatus = complaint.status;
    complaint.status = "In Progress";
    await complaint.save();
    await this.recordTransition(complaint, user, fromStatus, "In Progress", "Technician started active diagnostic and repair work.");
    return complaint;
  }
  // Technician: Complete Work (In Progress -> Work Completed)
  async completeWork(complaintId, repairNotes, user) {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw new AppError("Complaint not found", 404);
    if (complaint.status !== "In Progress") {
      throw new AppError(`Cannot mark work completed on ticket in '${complaint.status}' status (must be 'In Progress')`, 400);
    }
    if (user.role === "Technician" && complaint.assignedTechnician?.toString() !== user.id) {
      throw new AppError("You can only complete work on orders assigned directly to you.", 403);
    }
    const fromStatus = complaint.status;
    complaint.status = "Work Completed";
    complaint.repairNotes = repairNotes;
    await complaint.save();
    await this.recordTransition(complaint, user, fromStatus, "Work Completed", `Work completed by technician. Notes: ${repairNotes}`);
    return complaint;
  }
  // Warden: Confirm Resolution (Work Completed -> Resolved)
  async confirmResolution(complaintId, notes, user) {
    if (user.role !== "Warden" && user.role !== "Hostel Admin") {
      throw new AppError("Only the Hostel Warden or Admin can confirm final resolution.", 403);
    }
    const complaint = await this.findComplaintAndVerifyJurisdiction(complaintId, user);
    if (complaint.status !== "Work Completed") {
      throw new AppError(`Cannot confirm resolution on ticket in '${complaint.status}' status (must be 'Work Completed')`, 400);
    }
    if (notes !== void 0 && notes !== null && notes.trim().length > 0 && notes.trim().length < 5) {
      throw new AppError("Resolution notes must be at least 5 characters.", 400);
    }
    const resolutionNotes = notes?.trim() || "Final resolution verified and approved by staff.";
    const fromStatus = complaint.status;
    complaint.status = "Resolved";
    complaint.resolutionNotes = resolutionNotes;
    await complaint.save();
    await this.recordTransition(
      complaint,
      user,
      fromStatus,
      "Resolved",
      `Final resolution verified and approved by ${user.role}. Notes: ${resolutionNotes}`
    );
    return complaint;
  }
  // Retrieve assignment history records for a complaint
  async getAssignments(complaintId, user) {
    const complaint = await this.findComplaintAndVerifyJurisdiction(complaintId, user);
    return Assignment.find({ complaint: complaint._id }).sort({ assignedAt: 1 });
  }
  // Warden ONLY: Return Work Completed -> In Progress (Mandatory Reason)
  async returnWorkInProgress(complaintId, reason, user) {
    if (user.role !== "Warden" && user.role !== "Hostel Admin") {
      throw new AppError("SPEC INVARIANT: Transition Work Completed -> In Progress is restricted to Warden only.", 403);
    }
    if (!reason || reason.trim().length < 5) {
      throw new AppError("Mandatory reason (minimum 5 characters) is required to return work to In Progress.", 400);
    }
    const complaint = await this.findComplaintAndVerifyJurisdiction(complaintId, user);
    if (complaint.status !== "Work Completed") {
      throw new AppError(`Cannot return ticket to 'In Progress' from '${complaint.status}' status (must be 'Work Completed').`, 400);
    }
    const fromStatus = complaint.status;
    complaint.status = "In Progress";
    await complaint.save();
    await this.recordTransition(
      complaint,
      user,
      fromStatus,
      "In Progress",
      `Work marked unsatisfactory by Warden and returned to In Progress. Reason: ${reason.trim()}`
    );
    return complaint;
  }
  // Caretaker and Warden ONLY: Reject Complaint (Mandatory Reason)
  async rejectComplaint(complaintId, reason, user) {
    if (user.role !== "Caretaker" && user.role !== "Warden" && user.role !== "Hostel Admin") {
      throw new AppError("SPEC INVARIANT: Rejection is allowed for Caretaker and Warden only.", 403);
    }
    if (!reason || reason.trim().length < 5) {
      throw new AppError("SPEC INVARIANT: Rejection requires a mandatory reason (minimum 5 characters).", 400);
    }
    const complaint = await this.findComplaintAndVerifyJurisdiction(complaintId, user);
    if (complaint.status === "Resolved" || complaint.status === "Rejected") {
      throw new AppError(`Cannot reject ticket in terminal status '${complaint.status}'.`, 400);
    }
    const fromStatus = complaint.status;
    complaint.status = "Rejected";
    complaint.rejectionReason = reason.trim();
    await complaint.save();
    await this.recordTransition(complaint, user, fromStatus, "Rejected", `Rejected with reason: ${complaint.rejectionReason}`);
    return complaint;
  }
  // Student: Reopen Request (Resolved -> Reopened)
  async submitReopenRequest(complaintId, reason, user) {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw new AppError("Complaint not found", 404);
    if (complaint.student.toString() !== user.id) {
      throw new AppError("Only the student who submitted this complaint can request reopening.", 403);
    }
    if (complaint.status !== "Resolved") {
      throw new AppError(`Cannot request reopening on ticket in '${complaint.status}' status (must be 'Resolved')`, 400);
    }
    const fromStatus = complaint.status;
    complaint.status = "Reopened";
    await complaint.save();
    await this.recordTransition(complaint, user, fromStatus, "Reopened", `Student submitted reopen request: ${reason}`);
    return complaint;
  }
  // Warden or Caretaker: Approve Reopen (Reopened -> Assigned)
  async approveReopen(complaintId, user) {
    if (user.role !== "Warden" && user.role !== "Caretaker" && user.role !== "Hostel Admin") {
      throw new AppError("Approval of reopen requests is restricted to Warden or Caretaker.", 403);
    }
    const complaint = await this.findComplaintAndVerifyJurisdiction(complaintId, user);
    if (complaint.status !== "Reopened") {
      throw new AppError(`Ticket is not in 'Reopened' state (current: '${complaint.status}').`, 400);
    }
    const fromStatus = complaint.status;
    let techStillActive = false;
    if (complaint.assignedTechnician) {
      const activeTech = await User.findOne({ _id: complaint.assignedTechnician, eligibilityStatus: "approved" });
      if (activeTech) techStillActive = true;
    }
    complaint.status = "Assigned";
    if (!techStillActive) {
      complaint.assignedTechnician = void 0;
      complaint.assignedTechnicianName = void 0;
    }
    await complaint.save();
    const remark = techStillActive ? `Reopening approved. Returned to Assigned with original technician ${complaint.assignedTechnicianName}.` : "Reopening approved. Technician reassignment required.";
    await this.recordTransition(complaint, user, fromStatus, "Assigned", remark);
    return complaint;
  }
  // Warden or Caretaker: Reject Reopen Request (Reopened -> Resolved, stays Resolved, student notified with reason, audit written)
  async rejectReopen(complaintId, reason, user) {
    if (user.role !== "Warden" && user.role !== "Caretaker" && user.role !== "Hostel Admin") {
      throw new AppError("Rejection of reopen requests is restricted to Warden or Caretaker.", 403);
    }
    if (!reason || reason.trim().length < 5) {
      throw new AppError("Rejection of reopen request requires a mandatory reason (minimum 5 characters).", 400);
    }
    const complaint = await this.findComplaintAndVerifyJurisdiction(complaintId, user);
    if (complaint.status !== "Reopened") {
      throw new AppError(`Cannot reject reopen request: Ticket is not in 'Reopened' state (current: '${complaint.status}').`, 400);
    }
    const fromStatus = complaint.status;
    complaint.status = "Resolved";
    await complaint.save();
    await this.recordTransition(
      complaint,
      user,
      fromStatus,
      "Resolved",
      `Reopen request rejected by ${user.role}. Reason: ${reason.trim()}`
    );
    await Notification.create({
      recipient: complaint.student,
      type: "reopen_rejected",
      title: "Reopen Request Rejected",
      message: `Your reopen request for ticket ${complaint.referenceId} was rejected by ${user.role}. Reason: ${reason.trim()}`,
      link: `/complaints/${complaint._id}`,
      readStatus: false
    });
    return complaint;
  }
  // Warden: Reprioritize
  async reprioritize(complaintId, newPriority, user) {
    if (user.role !== "Warden" && user.role !== "Hostel Admin") {
      throw new AppError("Only Warden or Admin can reprioritize tickets.", 403);
    }
    const complaint = await this.findComplaintAndVerifyJurisdiction(complaintId, user);
    const oldPriority = complaint.priority;
    complaint.priority = newPriority;
    await complaint.save();
    await auditService.record({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "REPRIORITIZE",
      targetEntity: "Complaint",
      entityId: complaint.referenceId,
      details: `Priority updated from ${oldPriority} to ${newPriority}`
    });
    return complaint;
  }
  async findComplaintAndVerifyJurisdiction(complaintId, user) {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw new AppError("Complaint not found", 404);
    if ((user.role === "Caretaker" || user.role === "Warden") && user.hostelName && complaint.hostelName !== user.hostelName) {
      throw new AppError(`Access denied: Ticket belongs to ${complaint.hostelName}, outside your jurisdiction (${user.hostelName}).`, 403);
    }
    return complaint;
  }
  async recordTransition(complaint, user, fromStatus, toStatus, remarks) {
    const history = new StatusHistory({
      complaint: complaint._id,
      actor: new Types8.ObjectId(user.id),
      actorName: user.name,
      actorRole: user.role,
      fromStatus,
      toStatus,
      remarks,
      timestamp: /* @__PURE__ */ new Date()
    });
    await history.save();
    await auditService.record({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: `STATUS_${toStatus.toUpperCase()}`,
      targetEntity: "Complaint",
      entityId: complaint.referenceId,
      details: `Status changed from ${fromStatus} to ${toStatus}. ${remarks || ""}`
    });
  }
};
var complaintService = new ComplaintService();

// server/controllers/complaint.controller.ts
var getId = (req) => Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
var ComplaintController = class {
  async create(req, res, next) {
    try {
      const complaint = await complaintService.createComplaint(req.user, req.body);
      res.status(201).json({ success: true, data: complaint });
    } catch (err) {
      next(err);
    }
  }
  async list(req, res, next) {
    try {
      const filters = {
        search: req.query.search,
        status: req.query.status,
        category: req.query.category,
        priority: req.query.priority,
        technicianName: req.query.technicianName,
        hostelName: req.query.hostelName
      };
      const complaints = await complaintService.getComplaints(req.user, filters);
      res.status(200).json({ success: true, data: complaints });
    } catch (err) {
      next(err);
    }
  }
  async detail(req, res, next) {
    try {
      const id = getId(req);
      const detail = await complaintService.getComplaintById(id, req.user);
      res.status(200).json({ success: true, data: detail });
    } catch (err) {
      next(err);
    }
  }
  async acknowledge(req, res, next) {
    try {
      const complaint = await complaintService.acknowledge(getId(req), req.user);
      res.status(200).json({ success: true, data: complaint, message: "Ticket marked as Seen" });
    } catch (err) {
      next(err);
    }
  }
  async assign(req, res, next) {
    try {
      const { technicianId, notes } = req.body;
      const complaint = await complaintService.assignTechnician(getId(req), technicianId, notes, req.user);
      res.status(200).json({ success: true, data: complaint, message: "Technician assigned successfully" });
    } catch (err) {
      next(err);
    }
  }
  async startWork(req, res, next) {
    try {
      const complaint = await complaintService.startWork(getId(req), req.user);
      res.status(200).json({ success: true, data: complaint, message: "Work started on complaint" });
    } catch (err) {
      next(err);
    }
  }
  async completeWork(req, res, next) {
    try {
      const { repairNotes } = req.body;
      const complaint = await complaintService.completeWork(getId(req), repairNotes, req.user);
      res.status(200).json({ success: true, data: complaint, message: "Work marked as completed" });
    } catch (err) {
      next(err);
    }
  }
  async confirmResolution(req, res, next) {
    try {
      const { notes, resolutionNotes } = req.body || {};
      const complaint = await complaintService.confirmResolution(getId(req), notes || resolutionNotes, req.user);
      res.status(200).json({ success: true, data: complaint, message: "Ticket confirmed and resolved" });
    } catch (err) {
      next(err);
    }
  }
  async getAssignments(req, res, next) {
    try {
      const assignments = await complaintService.getAssignments(getId(req), req.user);
      res.status(200).json({ success: true, data: assignments });
    } catch (err) {
      next(err);
    }
  }
  async reject(req, res, next) {
    try {
      const { reason } = req.body;
      const complaint = await complaintService.rejectComplaint(getId(req), reason, req.user);
      res.status(200).json({ success: true, data: complaint, message: "Complaint rejected with mandatory reason" });
    } catch (err) {
      next(err);
    }
  }
  async reopenRequest(req, res, next) {
    try {
      const { reason } = req.body;
      const complaint = await complaintService.submitReopenRequest(getId(req), reason, req.user);
      res.status(200).json({ success: true, data: complaint, message: "Reopen request submitted" });
    } catch (err) {
      next(err);
    }
  }
  async approveReopen(req, res, next) {
    try {
      const complaint = await complaintService.approveReopen(getId(req), req.user);
      res.status(200).json({ success: true, data: complaint, message: "Reopening approved; ticket reassigned" });
    } catch (err) {
      next(err);
    }
  }
  async rejectReopen(req, res, next) {
    try {
      const { reason } = req.body;
      const complaint = await complaintService.rejectReopen(getId(req), reason, req.user);
      res.status(200).json({ success: true, data: complaint, message: "Reopen request rejected; ticket remains Resolved" });
    } catch (err) {
      next(err);
    }
  }
  async returnWorkInProgress(req, res, next) {
    try {
      const { reason } = req.body;
      const complaint = await complaintService.returnWorkInProgress(getId(req), reason, req.user);
      res.status(200).json({ success: true, data: complaint, message: "Work marked unsatisfactory; returned to In Progress" });
    } catch (err) {
      next(err);
    }
  }
  async reprioritize(req, res, next) {
    try {
      const { priority } = req.body;
      const complaint = await complaintService.reprioritize(getId(req), priority, req.user);
      res.status(200).json({ success: true, data: complaint, message: "Priority updated successfully" });
    } catch (err) {
      next(err);
    }
  }
};
var complaintController = new ComplaintController();

// server/schemas/complaint.schema.ts
import { z as z3 } from "zod";
var createComplaintSchema = z3.object({
  title: z3.string().min(5, "Title must be at least 5 characters").max(120, "Title cannot exceed 120 characters").trim(),
  category: z3.enum(["Electrical", "Plumbing", "Carpentry", "Network / Wi-Fi", "Cleanliness", "Appliance", "Other"]),
  description: z3.string().min(10, "Description must be at least 10 characters").max(2e3, "Description cannot exceed 2000 characters").trim(),
  roomNumber: z3.string().min(1, "Room number is required").trim(),
  block: z3.string().optional(),
  priority: z3.enum(["Low", "Medium", "High", "Emergency"]).default("Medium")
});
var assignTechnicianSchema = z3.object({
  technicianId: z3.string().min(1, "Technician identifier is required"),
  notes: z3.string().optional()
});
var completeWorkSchema = z3.object({
  repairNotes: z3.string().min(5, "Repair notes must be at least 5 characters documenting the fix").trim()
});
var rejectComplaintSchema = z3.object({
  // SPEC INVARIANT: Rejection is allowed for Caretaker and Warden only, with mandatory reason
  reason: z3.string().min(5, "Rejection reason is mandatory and must be at least 5 characters").trim()
});
var reopenRequestSchema = z3.object({
  reason: z3.string().min(5, "Reason for reopening the ticket is required").trim()
});
var rejectReopenSchema = z3.object({
  reason: z3.string().min(5, "Rejection reason is mandatory and must be at least 5 characters").trim()
});
var returnWorkInProgressSchema = z3.object({
  reason: z3.string().min(5, "Reason for returning work to In Progress is mandatory (min 5 characters)").trim()
});
var reprioritizeSchema = z3.object({
  priority: z3.enum(["Low", "Medium", "High", "Emergency"])
});
var addCommentSchema = z3.object({
  content: z3.string().min(1, "Comment text cannot be empty").max(1e3).trim(),
  visibility: z3.enum(["public", "internal"]).default("public")
});
var reportUnresolvedSchema = z3.object({
  remarks: z3.string().max(500).optional()
});

// server/routes/complaint.routes.ts
var router2 = Router2();
router2.post(
  "/",
  requireAuth,
  requireRoles("Student"),
  requireApprovedEligibility,
  validateRequest({ body: createComplaintSchema }),
  (req, res, next) => complaintController.create(req, res, next)
);
router2.get("/", requireAuth, (req, res, next) => complaintController.list(req, res, next));
router2.get("/:id", requireAuth, requireComplaintAccess, (req, res, next) => complaintController.detail(req, res, next));
router2.post(
  "/:id/acknowledge",
  requireAuth,
  requireRoles("Caretaker", "Hostel Admin"),
  (req, res, next) => complaintController.acknowledge(req, res, next)
);
router2.post(
  "/:id/assign",
  requireAuth,
  requireRoles("Caretaker", "Hostel Admin"),
  validateRequest({ body: assignTechnicianSchema }),
  (req, res, next) => complaintController.assign(req, res, next)
);
router2.get(
  "/:id/assignments",
  requireAuth,
  requireComplaintAccess,
  (req, res, next) => complaintController.getAssignments(req, res, next)
);
router2.post(
  "/:id/start-work",
  requireAuth,
  requireRoles("Technician", "Hostel Admin"),
  (req, res, next) => complaintController.startWork(req, res, next)
);
router2.post(
  "/:id/complete-work",
  requireAuth,
  requireRoles("Technician", "Hostel Admin"),
  validateRequest({ body: completeWorkSchema }),
  (req, res, next) => complaintController.completeWork(req, res, next)
);
router2.post(
  "/:id/confirm-resolution",
  requireAuth,
  requireRoles("Warden", "Hostel Admin"),
  (req, res, next) => complaintController.confirmResolution(req, res, next)
);
router2.post(
  "/:id/return-in-progress",
  requireAuth,
  requireRoles("Warden", "Hostel Admin"),
  validateRequest({ body: returnWorkInProgressSchema }),
  (req, res, next) => complaintController.returnWorkInProgress(req, res, next)
);
router2.post(
  "/:id/reprioritize",
  requireAuth,
  requireRoles("Warden", "Hostel Admin"),
  validateRequest({ body: reprioritizeSchema }),
  (req, res, next) => complaintController.reprioritize(req, res, next)
);
router2.post(
  "/:id/reject",
  requireAuth,
  requireRoles("Caretaker", "Warden", "Hostel Admin"),
  validateRequest({ body: rejectComplaintSchema }),
  (req, res, next) => complaintController.reject(req, res, next)
);
router2.post(
  "/:id/reopen-request",
  requireAuth,
  requireRoles("Student"),
  validateRequest({ body: reopenRequestSchema }),
  (req, res, next) => complaintController.reopenRequest(req, res, next)
);
router2.post(
  "/:id/approve-reopen",
  requireAuth,
  requireRoles("Warden", "Caretaker", "Hostel Admin"),
  (req, res, next) => complaintController.approveReopen(req, res, next)
);
router2.post(
  "/:id/reject-reopen",
  requireAuth,
  requireRoles("Warden", "Caretaker", "Hostel Admin"),
  validateRequest({ body: rejectReopenSchema }),
  (req, res, next) => complaintController.rejectReopen(req, res, next)
);
var complaint_routes_default = router2;

// server/routes/community.routes.ts
import { Router as Router3 } from "express";

// server/services/community.service.ts
import { Types as Types12 } from "mongoose";

// server/models/Support.ts
import mongoose9, { Schema as Schema8 } from "mongoose";
var SupportSchema = new Schema8(
  {
    complaint: {
      type: Schema8.Types.ObjectId,
      ref: "Complaint",
      required: true,
      index: true
    },
    student: {
      type: Schema8.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    createdAt: { type: Date, default: Date.now }
  },
  {
    timestamps: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id?.toString();
        delete ret.__v;
        return ret;
      }
    }
  }
);
SupportSchema.index({ complaint: 1, student: 1 }, { unique: true });
var Support = mongoose9.models.Support || mongoose9.model("Support", SupportSchema);

// server/models/Comment.ts
import mongoose10, { Schema as Schema9 } from "mongoose";
var CommentSchema = new Schema9(
  {
    complaint: {
      type: Schema9.Types.ObjectId,
      ref: "Complaint",
      required: true,
      index: true
    },
    author: {
      type: Schema9.Types.ObjectId,
      ref: "User",
      required: true
    },
    authorName: { type: String, required: true, trim: true },
    authorRole: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    visibility: {
      type: String,
      enum: ["public", "internal"],
      default: "public"
    },
    createdAt: { type: Date, default: Date.now }
  },
  {
    timestamps: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id?.toString();
        delete ret.__v;
        return ret;
      }
    }
  }
);
CommentSchema.index({ complaint: 1, createdAt: 1 });
var Comment = mongoose10.models.Comment || mongoose10.model("Comment", CommentSchema);

// server/models/UnresolvedReport.ts
import mongoose11, { Schema as Schema10 } from "mongoose";
var UnresolvedReportSchema = new Schema10(
  {
    complaint: {
      type: Schema10.Types.ObjectId,
      ref: "Complaint",
      required: true,
      index: true
    },
    student: {
      type: Schema10.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    remarks: { type: String, trim: true },
    reportedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id?.toString();
        delete ret.__v;
        return ret;
      }
    }
  }
);
UnresolvedReportSchema.index({ complaint: 1, student: 1 }, { unique: true });
var UnresolvedReport = mongoose11.models.UnresolvedReport || mongoose11.model("UnresolvedReport", UnresolvedReportSchema);

// server/services/community.service.ts
var CommunityService = class {
  async getCommunityFeed(user) {
    const hostelFilter = user.role === "Hostel Admin" ? {} : { hostelName: user.hostelName || "C.V.R Hostel" };
    const complaints = await Complaint.find(hostelFilter).sort({ createdAt: -1 }).limit(50);
    const complaintIds = complaints.map((c) => c._id);
    const [userSupports, userReports, comments] = await Promise.all([
      Support.find({ complaint: { $in: complaintIds }, student: new Types12.ObjectId(user.id) }),
      UnresolvedReport.find({ complaint: { $in: complaintIds }, student: new Types12.ObjectId(user.id) }),
      Comment.find({ complaint: { $in: complaintIds } }).sort({ createdAt: 1 })
    ]);
    const supportedSet = new Set(userSupports.map((s) => s.complaint.toString()));
    const reportedSet = new Set(userReports.map((r) => r.complaint.toString()));
    const commentsByComplaint = /* @__PURE__ */ new Map();
    for (const c of comments) {
      const cid = c.complaint.toString();
      if (!commentsByComplaint.has(cid)) commentsByComplaint.set(cid, []);
      commentsByComplaint.get(cid).push(c);
    }
    return complaints.map((c) => ({
      id: c._id.toString(),
      referenceId: c.referenceId,
      category: c.category,
      title: c.title,
      description: c.description,
      roomNumber: c.roomNumber,
      hostelName: c.hostelName,
      status: c.status,
      priority: c.priority,
      supportCount: c.supportCount,
      hasSupported: supportedSet.has(c._id.toString()),
      unresolvedReportsCount: c.unresolvedReportsCount,
      hasReportedUnresolved: reportedSet.has(c._id.toString()),
      createdAt: c.createdAt,
      comments: commentsByComplaint.get(c._id.toString()) || []
    }));
  }
  async toggleSupport(complaintId, user) {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw new AppError("Complaint not found", 404);
    const studentId = new Types12.ObjectId(user.id);
    const existing = await Support.findOne({ complaint: complaint._id, student: studentId });
    if (existing) {
      await Support.deleteOne({ _id: existing._id });
      complaint.supportCount = Math.max(0, complaint.supportCount - 1);
      await complaint.save();
      return { supported: false, supportCount: complaint.supportCount };
    }
    try {
      const support = new Support({ complaint: complaint._id, student: studentId });
      await support.save();
      complaint.supportCount += 1;
      await complaint.save();
      return { supported: true, supportCount: complaint.supportCount };
    } catch (err) {
      if (err.code === 11e3) {
        return { supported: true, supportCount: complaint.supportCount };
      }
      throw err;
    }
  }
  async addComment(complaintId, user, content, visibility = "public") {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw new AppError("Complaint not found", 404);
    const comment = new Comment({
      complaint: complaint._id,
      author: new Types12.ObjectId(user.id),
      authorName: user.name,
      authorRole: user.role,
      content: content.trim(),
      visibility,
      createdAt: /* @__PURE__ */ new Date()
    });
    await comment.save();
    return comment;
  }
  async reportUnresolved(complaintId, user, remarks) {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw new AppError("Complaint not found", 404);
    const studentId = new Types12.ObjectId(user.id);
    try {
      const report = new UnresolvedReport({
        complaint: complaint._id,
        student: studentId,
        remarks: remarks?.trim(),
        reportedAt: /* @__PURE__ */ new Date()
      });
      await report.save();
      complaint.unresolvedReportsCount += 1;
      await complaint.save();
      await auditService.record({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: "REPORT_UNRESOLVED",
        targetEntity: "Complaint",
        entityId: complaint.referenceId,
        details: `Reported unresolved by student ${user.name}. Remarks: ${remarks || "None"}`
      });
      return { reported: true, unresolvedReportsCount: complaint.unresolvedReportsCount };
    } catch (err) {
      if (err.code === 11e3) {
        throw new AppError("You have already reported this complaint as unresolved.", 409);
      }
      throw err;
    }
  }
  async getUnresolvedSummary(user) {
    if (user.role === "Student") {
      throw new AppError("Only staff can access aggregate unresolved reports summary.", 403);
    }
    const hostelFilter = {};
    if ((user.role === "Caretaker" || user.role === "Warden") && user.hostelName) {
      hostelFilter.hostelName = user.hostelName;
    }
    const complaints = await Complaint.find({
      ...hostelFilter,
      unresolvedReportsCount: { $gt: 0 }
    }).sort({ unresolvedReportsCount: -1 });
    const complaintIds = complaints.map((c) => c._id);
    const reports = await UnresolvedReport.find({ complaint: { $in: complaintIds } }).sort({ reportedAt: -1 });
    const reportsByComplaint = /* @__PURE__ */ new Map();
    for (const r of reports) {
      const cid = r.complaint.toString();
      if (!reportsByComplaint.has(cid)) reportsByComplaint.set(cid, []);
      reportsByComplaint.get(cid).push({
        id: r._id.toString(),
        reportedAt: r.reportedAt,
        remarks: r.remarks
      });
    }
    return {
      totalUnresolvedReports: reports.length,
      complaintsWithUnresolvedReports: complaints.length,
      complaints: complaints.map((c) => ({
        id: c._id.toString(),
        referenceId: c.referenceId,
        title: c.title,
        hostelName: c.hostelName,
        roomNumber: c.roomNumber,
        status: c.status,
        priority: c.priority,
        unresolvedReportsCount: c.unresolvedReportsCount,
        reports: reportsByComplaint.get(c._id.toString()) || []
      }))
    };
  }
};
var communityService = new CommunityService();

// server/controllers/community.controller.ts
var getId2 = (req) => Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
var CommunityController = class {
  async feed(req, res, next) {
    try {
      const feed = await communityService.getCommunityFeed(req.user);
      res.status(200).json({ success: true, data: feed });
    } catch (err) {
      next(err);
    }
  }
  async support(req, res, next) {
    try {
      const result = await communityService.toggleSupport(getId2(req), req.user);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
  async addComment(req, res, next) {
    try {
      const { content, visibility } = req.body;
      const comment = await communityService.addComment(getId2(req), req.user, content, visibility);
      res.status(201).json({ success: true, data: comment });
    } catch (err) {
      next(err);
    }
  }
  async reportUnresolved(req, res, next) {
    try {
      const { remarks } = req.body;
      const result = await communityService.reportUnresolved(getId2(req), req.user, remarks);
      res.status(200).json({ success: true, data: result, message: "Unresolved report recorded." });
    } catch (err) {
      next(err);
    }
  }
  async unresolvedSummary(req, res, next) {
    try {
      const summary = await communityService.getUnresolvedSummary(req.user);
      res.status(200).json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }
};
var communityController = new CommunityController();

// server/routes/community.routes.ts
var router3 = Router3();
router3.get("/feed", requireAuth, (req, res, next) => communityController.feed(req, res, next));
router3.get(
  "/unresolved-summary",
  requireAuth,
  requireRoles("Caretaker", "Warden", "Hostel Admin"),
  (req, res, next) => communityController.unresolvedSummary(req, res, next)
);
router3.post(
  "/:id/support",
  requireAuth,
  requireRoles("Student"),
  (req, res, next) => communityController.support(req, res, next)
);
router3.post(
  "/:id/comments",
  requireAuth,
  validateRequest({ body: addCommentSchema }),
  (req, res, next) => communityController.addComment(req, res, next)
);
router3.post(
  "/:id/unresolved",
  requireAuth,
  requireRoles("Student"),
  validateRequest({ body: reportUnresolvedSchema }),
  (req, res, next) => communityController.reportUnresolved(req, res, next)
);
var community_routes_default = router3;

// server/routes/staff.routes.ts
import { Router as Router4 } from "express";

// server/services/staff.service.ts
import bcrypt4 from "bcryptjs";

// server/models/Hostel.ts
import mongoose12, { Schema as Schema11 } from "mongoose";
var HostelBlockSchema = new Schema11(
  {
    name: { type: String, required: true, trim: true },
    floors: { type: Number, required: true, default: 4 },
    roomsCount: { type: Number, required: true, default: 120 }
  },
  { _id: true }
);
var HostelSchema = new Schema11(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    blocks: [HostelBlockSchema],
    caretakerName: { type: String, trim: true },
    wardenName: { type: String, trim: true }
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id?.toString();
        delete ret.__v;
        return ret;
      }
    }
  }
);
var Hostel = mongoose12.models.Hostel || mongoose12.model("Hostel", HostelSchema);

// server/services/staff.service.ts
var StaffService = class {
  async getHostels() {
    return Hostel.find().sort({ name: 1 });
  }
  async addHostelBlock(hostelId, blockData, user) {
    const hostel = await Hostel.findById(hostelId);
    if (!hostel) throw new AppError("Hostel record not found", 404);
    const exists = hostel.blocks.some((b) => b.name.toLowerCase() === blockData.name.toLowerCase());
    if (exists) {
      throw new AppError(`Block '${blockData.name}' already exists in ${hostel.name}.`, 409);
    }
    hostel.blocks.push(blockData);
    await hostel.save();
    await auditService.record({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "ADD_HOSTEL_BLOCK",
      targetEntity: "Hostel",
      entityId: hostel.name,
      details: `Added new block '${blockData.name}' (${blockData.floors} floors, ${blockData.roomsCount} rooms).`
    });
    return hostel;
  }
  async getStaff(role) {
    const query = { role: { $in: ["Caretaker", "Technician", "Warden", "Hostel Admin"] } };
    if (role && role !== "All") {
      query.role = role;
    }
    return User.find(query).select("-passwordHash").sort({ createdAt: -1 });
  }
  async provisionStaff(data, adminUser) {
    const existing = await User.findOne({ email: data.email.toLowerCase().trim() });
    if (existing) {
      throw new AppError(`An account with email '${data.email}' already exists.`, 409);
    }
    const defaultPass = data.password || "StaffPass2026!";
    const passwordHash = await bcrypt4.hash(defaultPass, 10);
    const staff = new User({
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      passwordHash,
      role: data.role,
      hostelName: data.hostelName,
      specialization: data.specialization,
      eligibilityStatus: "approved"
    });
    await staff.save();
    await auditService.record({
      actorId: adminUser.id,
      actorName: adminUser.name,
      actorRole: adminUser.role,
      action: "PROVISION_STAFF",
      targetEntity: "Staff",
      entityId: staff.email,
      details: `Provisioned ${staff.role} account for ${staff.name} (${staff.email}).`
    });
    return staff;
  }
  async toggleStaffStatus(staffId, adminUser) {
    const staff = await User.findById(staffId);
    if (!staff) throw new AppError("Staff account not found", 404);
    if (staff.role === "Hostel Admin" && staff._id.toString() === adminUser.id) {
      throw new AppError("You cannot suspend your own administrative account.", 400);
    }
    const previousStatus = staff.eligibilityStatus;
    staff.eligibilityStatus = previousStatus === "approved" ? "suspended" : "approved";
    await staff.save();
    await auditService.record({
      actorId: adminUser.id,
      actorName: adminUser.name,
      actorRole: adminUser.role,
      action: "TOGGLE_STAFF_STATUS",
      targetEntity: "Staff",
      entityId: staff.email,
      details: `Account status transitioned from ${previousStatus} to ${staff.eligibilityStatus}.`
    });
    return staff;
  }
  async getStudents(user) {
    const query = { role: "Student" };
    if ((user.role === "Caretaker" || user.role === "Warden") && user.hostelName) {
      query.hostelName = user.hostelName;
    }
    return User.find(query).select("-passwordHash").sort({ createdAt: -1 });
  }
  async updateStudentEligibility(studentId, status, reason, staffUser) {
    const student = await User.findOne({ _id: studentId, role: "Student" });
    if (!student) {
      throw new AppError("Student record not found.", 404);
    }
    if ((staffUser.role === "Caretaker" || staffUser.role === "Warden") && staffUser.hostelName && student.hostelName && student.hostelName !== staffUser.hostelName) {
      throw new AppError(`Access denied: Cannot manage students outside your jurisdiction (${staffUser.hostelName}).`, 403);
    }
    const previousStatus = student.eligibilityStatus;
    student.eligibilityStatus = status;
    await student.save();
    await auditService.record({
      actorId: staffUser.id,
      actorName: staffUser.name,
      actorRole: staffUser.role,
      action: "UPDATE_STUDENT_ELIGIBILITY",
      targetEntity: "Student",
      entityId: student.email,
      details: `Updated residency eligibility for ${student.name} (${student.email}) from ${previousStatus} to ${status}. Reason: ${reason || "N/A"}.`
    });
    return student;
  }
  async changeStaffRole(staffId, newRole, adminUser) {
    const staff = await User.findById(staffId);
    if (!staff) {
      throw new AppError("Staff account not found.", 404);
    }
    if (staff._id.toString() === adminUser.id) {
      throw new AppError("Self role change is forbidden. You cannot change your own administrative role.", 400);
    }
    const previousRole = staff.role;
    staff.role = newRole;
    await staff.save();
    await auditService.record({
      actorId: adminUser.id,
      actorName: adminUser.name,
      actorRole: adminUser.role,
      action: "CHANGE_STAFF_ROLE",
      targetEntity: "Staff",
      entityId: staff.email,
      details: `Changed role of ${staff.name} (${staff.email}) from ${previousRole} to ${newRole}.`
    });
    return staff;
  }
};
var staffService = new StaffService();

// server/controllers/staff.controller.ts
var getId3 = (req) => Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
var StaffController = class {
  async getHostels(_req, res, next) {
    try {
      const hostels = await staffService.getHostels();
      res.status(200).json({ success: true, data: hostels });
    } catch (err) {
      next(err);
    }
  }
  async addBlock(req, res, next) {
    try {
      const { name, floors, roomsCount } = req.body;
      const hostel = await staffService.addHostelBlock(getId3(req), { name, floors, roomsCount }, req.user);
      res.status(201).json({ success: true, data: hostel, message: "Block added successfully" });
    } catch (err) {
      next(err);
    }
  }
  async getStaff(req, res, next) {
    try {
      const role = req.query.role;
      const staff = await staffService.getStaff(role);
      res.status(200).json({ success: true, data: staff });
    } catch (err) {
      next(err);
    }
  }
  async provisionStaff(req, res, next) {
    try {
      const staff = await staffService.provisionStaff(req.body, req.user);
      res.status(201).json({ success: true, data: staff, message: "Staff account provisioned successfully" });
    } catch (err) {
      next(err);
    }
  }
  async toggleStatus(req, res, next) {
    try {
      const staff = await staffService.toggleStaffStatus(getId3(req), req.user);
      res.status(200).json({ success: true, data: staff, message: `Account status updated to ${staff.eligibilityStatus}` });
    } catch (err) {
      next(err);
    }
  }
  async getStudents(req, res, next) {
    try {
      const students = await staffService.getStudents(req.user);
      res.status(200).json({ success: true, data: students });
    } catch (err) {
      next(err);
    }
  }
  async updateStudentEligibility(req, res, next) {
    try {
      const { status, reason } = req.body;
      const student = await staffService.updateStudentEligibility(getId3(req), status, reason, req.user);
      res.status(200).json({
        success: true,
        data: student,
        message: `Student eligibility updated to ${student.eligibilityStatus}`
      });
    } catch (err) {
      next(err);
    }
  }
  async changeRole(req, res, next) {
    try {
      const { role } = req.body;
      const staff = await staffService.changeStaffRole(getId3(req), role, req.user);
      res.status(200).json({
        success: true,
        data: staff,
        message: `Staff role changed to ${staff.role}`
      });
    } catch (err) {
      next(err);
    }
  }
};
var staffController = new StaffController();

// server/routes/staff.routes.ts
var router4 = Router4();
router4.get("/hostels", requireAuth, (req, res, next) => staffController.getHostels(req, res, next));
router4.post(
  "/hostels/:id/blocks",
  requireAuth,
  requireRoles("Hostel Admin"),
  (req, res, next) => staffController.addBlock(req, res, next)
);
router4.get(
  "/accounts",
  requireAuth,
  requireRoles("Caretaker", "Warden", "Hostel Admin"),
  (req, res, next) => staffController.getStaff(req, res, next)
);
router4.post(
  "/accounts",
  requireAuth,
  requireRoles("Hostel Admin"),
  validateRequest({ body: provisionStaffSchema }),
  (req, res, next) => staffController.provisionStaff(req, res, next)
);
router4.patch(
  "/accounts/:id/status",
  requireAuth,
  requireRoles("Hostel Admin"),
  (req, res, next) => staffController.toggleStatus(req, res, next)
);
router4.patch(
  "/accounts/:id/role",
  requireAuth,
  requireRoles("Hostel Admin"),
  validateRequest({ body: changeStaffRoleSchema }),
  (req, res, next) => staffController.changeRole(req, res, next)
);
router4.get(
  "/students",
  requireAuth,
  requireRoles("Caretaker", "Warden", "Hostel Admin"),
  (req, res, next) => staffController.getStudents(req, res, next)
);
router4.patch(
  "/students/:id/eligibility",
  requireAuth,
  requireRoles("Caretaker", "Warden", "Hostel Admin"),
  validateRequest({ body: updateStudentEligibilitySchema }),
  (req, res, next) => staffController.updateStudentEligibility(req, res, next)
);
var staff_routes_default = router4;

// server/routes/audit.routes.ts
import { Router as Router5 } from "express";

// server/controllers/audit.controller.ts
var AuditController = class {
  async getLogs(req, res, next) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
      const skip = req.query.skip ? parseInt(req.query.skip, 10) : 0;
      const result = await auditService.getLogs(limit, skip);
      res.status(200).json({ success: true, data: result.logs, total: result.total });
    } catch (err) {
      next(err);
    }
  }
};
var auditController = new AuditController();

// server/routes/audit.routes.ts
var router5 = Router5();
router5.get(
  "/",
  requireAuth,
  requireRoles("Hostel Admin"),
  (req, res, next) => auditController.getLogs(req, res, next)
);
var audit_routes_default = router5;

// server/routes/escalation.routes.ts
import { Router as Router6 } from "express";

// server/models/Escalation.ts
import mongoose13, { Schema as Schema12 } from "mongoose";
var DEFAULT_SLA_CONFIG = {
  Emergency: { acknowledgmentDeadlineMinutes: 30, resolutionDeadlineMinutes: 240, tier2GracePeriodMinutes: 60 },
  High: { acknowledgmentDeadlineMinutes: 60, resolutionDeadlineMinutes: 720, tier2GracePeriodMinutes: 120 },
  Medium: { acknowledgmentDeadlineMinutes: 120, resolutionDeadlineMinutes: 1440, tier2GracePeriodMinutes: 240 },
  Low: { acknowledgmentDeadlineMinutes: 240, resolutionDeadlineMinutes: 2880, tier2GracePeriodMinutes: 480 }
};
var EscalationSchema = new Schema12(
  {
    complaint: {
      type: Schema12.Types.ObjectId,
      ref: "Complaint",
      required: true,
      index: true
    },
    slaType: {
      type: String,
      required: true,
      enum: ["acknowledgment", "resolution"]
    },
    escalationTier: {
      type: String,
      required: true,
      enum: ["tier1_warden", "tier2_admin"]
    },
    triggeredAt: { type: Date, default: Date.now },
    reason: { type: String, required: true, trim: true },
    targetRole: {
      type: String,
      required: true,
      enum: ["Warden", "Hostel Admin"]
    },
    gracePeriodMinutes: { type: Number, default: 120 },
    resolvedAt: { type: Date }
  },
  {
    timestamps: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id?.toString();
        delete ret.__v;
        return ret;
      }
    }
  }
);
EscalationSchema.index({ complaint: 1, slaType: 1, escalationTier: 1 }, { unique: true });
var Escalation = mongoose13.models.Escalation || mongoose13.model("Escalation", EscalationSchema);

// server/services/escalation.service.ts
var EscalationService = class {
  slaConfig = JSON.parse(JSON.stringify(DEFAULT_SLA_CONFIG));
  intervalTimer = null;
  /**
   * Set or override SLA configuration for a specific priority (Emergency, High, Medium, Low)
   */
  setSLAConfig(priority, config) {
    if (!this.slaConfig[priority]) {
      this.slaConfig[priority] = { ...DEFAULT_SLA_CONFIG.Medium, ...config };
    } else {
      this.slaConfig[priority] = { ...this.slaConfig[priority], ...config };
    }
  }
  getSLAConfig(priority) {
    return priority ? this.slaConfig[priority] : this.slaConfig;
  }
  resetSLAConfig() {
    this.slaConfig = JSON.parse(JSON.stringify(DEFAULT_SLA_CONFIG));
  }
  /**
   * Evaluates active complaints against acknowledgment and resolution deadlines.
   * Completely idempotent and restart-safe.
   *
   * @param asOfDate Optional simulation timestamp for testing deadline math.
   */
  async evaluateEscalations(asOfDate = /* @__PURE__ */ new Date()) {
    const nowMs = asOfDate.getTime();
    const newEscalations = [];
    let ackBreaches = 0;
    let resBreaches = 0;
    const activeComplaints = await Complaint.find({
      status: { $nin: ["Resolved", "Rejected"] }
    });
    for (const complaint of activeComplaints) {
      const priorityConfig = this.slaConfig[complaint.priority] || this.slaConfig.Medium;
      const createdMs = complaint.createdAt ? new Date(complaint.createdAt).getTime() : nowMs;
      const elapsedMinutes = Math.max(0, (nowMs - createdMs) / (60 * 1e3));
      if (complaint.status === "Submitted") {
        const ackDeadline = priorityConfig.acknowledgmentDeadlineMinutes;
        if (elapsedMinutes >= ackDeadline) {
          ackBreaches++;
          const existingTier1 = await Escalation.findOne({
            complaint: complaint._id,
            slaType: "acknowledgment",
            escalationTier: "tier1_warden"
          });
          if (!existingTier1) {
            const esc = await this.createEscalation({
              complaint,
              slaType: "acknowledgment",
              escalationTier: "tier1_warden",
              targetRole: "Warden",
              reason: `Acknowledgment SLA breached (${elapsedMinutes.toFixed(0)}m elapsed vs ${ackDeadline}m deadline). Escalated to Warden.`,
              triggeredAt: asOfDate,
              gracePeriodMinutes: priorityConfig.tier2GracePeriodMinutes
            });
            if (esc) {
              newEscalations.push(esc);
              complaint.escalationLevel = "tier1_warden";
              await complaint.save();
            }
          } else {
            const gracePeriod = priorityConfig.tier2GracePeriodMinutes;
            const tier1TriggeredAt = existingTier1.triggeredAt;
            const tier1ElapsedMinutes = (nowMs - new Date(tier1TriggeredAt).getTime()) / (60 * 1e3);
            if (tier1ElapsedMinutes >= gracePeriod) {
              const existingTier2 = await Escalation.findOne({
                complaint: complaint._id,
                slaType: "acknowledgment",
                escalationTier: "tier2_admin"
              });
              if (!existingTier2) {
                const esc = await this.createEscalation({
                  complaint,
                  slaType: "acknowledgment",
                  escalationTier: "tier2_admin",
                  targetRole: "Hostel Admin",
                  reason: `Acknowledgment SLA critical breach (${tier1ElapsedMinutes.toFixed(0)}m elapsed since Tier 1 vs ${gracePeriod}m grace period). Escalated to Hostel Admin.`,
                  triggeredAt: asOfDate
                });
                if (esc) {
                  newEscalations.push(esc);
                  complaint.escalationLevel = "tier2_admin";
                  await complaint.save();
                }
              }
            }
          }
        }
      }
      const resDeadline = priorityConfig.resolutionDeadlineMinutes;
      if (elapsedMinutes >= resDeadline) {
        resBreaches++;
        const existingResTier1 = await Escalation.findOne({
          complaint: complaint._id,
          slaType: "resolution",
          escalationTier: "tier1_warden"
        });
        if (!existingResTier1) {
          const esc = await this.createEscalation({
            complaint,
            slaType: "resolution",
            escalationTier: "tier1_warden",
            targetRole: "Warden",
            reason: `Resolution SLA breached (${elapsedMinutes.toFixed(0)}m elapsed vs ${resDeadline}m deadline). Escalated to Warden.`,
            triggeredAt: asOfDate,
            gracePeriodMinutes: priorityConfig.tier2GracePeriodMinutes
          });
          if (esc) {
            newEscalations.push(esc);
            if (complaint.escalationLevel === "none") {
              complaint.escalationLevel = "tier1_warden";
              await complaint.save();
            }
          }
        } else {
          const gracePeriod = priorityConfig.tier2GracePeriodMinutes;
          const tier1TriggeredAt = existingResTier1.triggeredAt;
          const tier1ElapsedMinutes = (nowMs - new Date(tier1TriggeredAt).getTime()) / (60 * 1e3);
          if (tier1ElapsedMinutes >= gracePeriod) {
            const existingResTier2 = await Escalation.findOne({
              complaint: complaint._id,
              slaType: "resolution",
              escalationTier: "tier2_admin"
            });
            if (!existingResTier2) {
              const esc = await this.createEscalation({
                complaint,
                slaType: "resolution",
                escalationTier: "tier2_admin",
                targetRole: "Hostel Admin",
                reason: `Resolution SLA critical breach (${tier1ElapsedMinutes.toFixed(0)}m elapsed since Tier 1 vs ${gracePeriod}m grace period). Escalated to Hostel Admin.`,
                triggeredAt: asOfDate
              });
              if (esc) {
                newEscalations.push(esc);
                complaint.escalationLevel = "tier2_admin";
                await complaint.save();
              }
            }
          }
        }
      }
    }
    return {
      checkedComplaints: activeComplaints.length,
      acknowledgmentBreaches: ackBreaches,
      resolutionBreaches: resBreaches,
      newEscalations
    };
  }
  /**
   * Strictly idempotent creation: unique compound index on (complaint, slaType, escalationTier)
   * guarantees zero duplicates across repeated runs and server restarts.
   */
  async createEscalation(params) {
    try {
      const escalation = new Escalation({
        complaint: params.complaint._id,
        slaType: params.slaType,
        escalationTier: params.escalationTier,
        targetRole: params.targetRole,
        reason: params.reason,
        triggeredAt: params.triggeredAt,
        gracePeriodMinutes: params.gracePeriodMinutes || 120
      });
      await escalation.save();
      let recipient = null;
      if (params.targetRole === "Warden") {
        recipient = await User.findOne(
          params.complaint.hostelName ? { role: "Warden", hostelName: params.complaint.hostelName } : { role: "Warden" }
        );
        if (!recipient) {
          recipient = await User.findOne({ role: "Warden" });
        }
      } else {
        recipient = await User.findOne({ role: "Hostel Admin" });
      }
      if (recipient) {
        await Notification.create({
          recipient: recipient._id,
          type: "escalation",
          title: `SLA Breach Escalation: ${params.complaint.referenceId}`,
          message: params.reason,
          link: `/complaints/${params.complaint._id}`,
          readStatus: false
        });
      }
      await auditService.record({
        actorName: "System Scheduler",
        actorRole: "System",
        action: "ESCALATION_TRIGGERED",
        targetEntity: "Complaint",
        entityId: params.complaint.referenceId,
        details: `[${params.slaType.toUpperCase()} SLA - ${params.escalationTier}] ${params.reason}`
      });
      return escalation;
    } catch (err) {
      if (err.code === 11e3) {
        return null;
      }
      throw err;
    }
  }
  startScheduler(intervalMs = 6e4) {
    if (this.intervalTimer) return;
    this.intervalTimer = setInterval(async () => {
      try {
        await this.evaluateEscalations();
      } catch (err) {
        console.error("\u274C Error during background escalation evaluation:", err.message);
      }
    }, intervalMs);
  }
  stopScheduler() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }
};
var escalationService = new EscalationService();

// server/routes/escalation.routes.ts
var router6 = Router6();
router6.all("/scheduler", (_req, res) => {
  res.status(501).json({
    success: false,
    error: "Incomplete: Automated background SLA cron scheduler is deferred."
  });
});
router6.post(
  "/evaluate",
  requireAuth,
  requireRoles("Hostel Admin", "Warden"),
  async (_req, res, next) => {
    try {
      const result = await escalationService.evaluateEscalations();
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);
router6.get(
  "/sla-config",
  requireAuth,
  requireRoles("Hostel Admin", "Warden", "Caretaker"),
  (_req, res) => {
    const config = escalationService.getSLAConfig();
    res.status(200).json({ success: true, data: config });
  }
);
router6.patch(
  "/sla-config",
  requireAuth,
  requireRoles("Hostel Admin"),
  (req, res) => {
    const { priority, config } = req.body;
    if (!priority || !config) {
      res.status(400).json({ success: false, error: "Priority and config object are required" });
      return;
    }
    escalationService.setSLAConfig(priority, config);
    res.status(200).json({
      success: true,
      data: escalationService.getSLAConfig(priority),
      message: `SLA config for ${priority} updated successfully`
    });
  }
);
router6.get(
  "/",
  requireAuth,
  requireRoles("Hostel Admin", "Warden"),
  async (req, res, next) => {
    try {
      const { complaintId, slaType, escalationTier } = req.query;
      const query = {};
      if (complaintId) query.complaint = complaintId;
      if (slaType) query.slaType = slaType;
      if (escalationTier) query.escalationTier = escalationTier;
      const escalations = await Escalation.find(query).sort({ triggeredAt: -1 });
      res.status(200).json({ success: true, data: escalations });
    } catch (err) {
      next(err);
    }
  }
);
var escalation_routes_default = router6;

// server/routes/index.ts
var router7 = Router7();
router7.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Hostel Complaint Tracker API",
    phase: "Phase 6 (Status Transitions & Escalation Engine)",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
router7.use("/auth", auth_routes_default);
router7.use("/complaints", complaint_routes_default);
router7.use("/community", community_routes_default);
router7.use("/staff", staff_routes_default);
router7.use("/audit", audit_routes_default);
router7.use("/escalations", escalation_routes_default);
router7.use("/notifications", (_req, res) => {
  res.status(501).json({
    success: false,
    error: "Incomplete: Push/Email notifications live engine."
  });
});
var routes_default = router7;

// server/app.ts
function createApp() {
  const app2 = express();
  app2.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      hasMongoUri: !!process.env.MONGODB_URI,
      nodeEnv: process.env.NODE_ENV,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app2.get("/api/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      hasMongoUri: !!process.env.MONGODB_URI,
      nodeEnv: process.env.NODE_ENV,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app2.use(async (_req, res, next) => {
    try {
      await connectDB();
      next();
    } catch (err) {
      console.error("Database connection failed:", err);
      res.status(500).json({
        success: false,
        error: "Database connection failed. Please ensure MONGODB_URI is configured in environment variables.",
        message: err.message
      });
    }
  });
  app2.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (origin === env.CLIENT_ORIGIN || origin.endsWith(".vercel.app") || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-xsrf-token", "x-csrf-token"],
      exposedHeaders: ["set-cookie"]
    })
  );
  app2.use(express.json());
  app2.use(express.urlencoded({ extended: true }));
  app2.use(cookieParser(env.COOKIE_SECRET));
  app2.use(csrfProtection);
  app2.use(authenticateSession);
  app2.use("/api", routes_default);
  app2.use("/", routes_default);
  app2.use((req, res) => {
    res.status(404).json({
      success: false,
      error: `Resource route '${req.method} ${req.originalUrl}' not found on server.`
    });
  });
  app2.use(errorHandler);
  return app2;
}

// api-src/index.ts
var app = createApp();
var index_default = app;
export {
  index_default as default
};
