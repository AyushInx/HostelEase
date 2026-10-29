import { Resend } from 'resend';
import { env } from '../config/env';

export interface EmailDispatchResult {
  success: boolean;
  messageId: string;
  provider: 'resend' | 'simulated';
}

export interface TestSentEmail {
  to: string;
  subject: string;
  otp: string;
  expiresMinutes: number;
  timestamp: Date;
}

export class EmailService {
  private resendClient: Resend | null = null;
  private testSentEmails: TestSentEmail[] = [];
  private forceDeliveryFailure = false;

  constructor() {
    if (env.RESEND_API_KEY && env.RESEND_API_KEY.startsWith('re_')) {
      this.resendClient = new Resend(env.RESEND_API_KEY);
    }
  }

  /**
   * For automated testing: force next send to fail to test resilience
   */
  public setForceDeliveryFailure(fail: boolean): void {
    this.forceDeliveryFailure = fail;
  }

  /**
   * For automated testing: inspect dispatched test emails
   */
  public getTestSentEmails(): TestSentEmail[] {
    return [...this.testSentEmails];
  }

  public getLastTestSentEmail(toEmail?: string): TestSentEmail | undefined {
    if (toEmail) {
      const normalized = toEmail.toLowerCase().trim();
      return [...this.testSentEmails].reverse().find((e) => e.to === normalized);
    }
    return this.testSentEmails[this.testSentEmails.length - 1];
  }

  public clearTestSentEmails(): void {
    this.testSentEmails = [];
  }

  /**
   * Send single-use 6-digit numeric OTP email
   */
  async sendOtpEmail(
    toEmail: string,
    otp: string,
    expiresMinutes = 10
  ): Promise<EmailDispatchResult> {
    const cleanTo = toEmail.toLowerCase().trim();

    // Check if test failure simulation is active
    if (this.forceDeliveryFailure) {
      throw new Error('Simulated email delivery provider failure (Resend network timeout)');
    }

    // In automated testing environment, record without making live HTTP requests
    if (env.NODE_ENV === 'test') {
      const testRecord: TestSentEmail = {
        to: cleanTo,
        subject: 'HostelEase - Your 6-Digit Verification Code',
        otp,
        expiresMinutes,
        timestamp: new Date(),
      };
      this.testSentEmails.push(testRecord);
      return {
        success: true,
        messageId: `test_msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        provider: 'simulated',
      };
    }

    // Real Resend delivery
    if (this.resendClient) {
      try {
        const fromAddress = env.EMAIL_FROM || 'HostelEase <onboarding@resend.dev>';
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
      
      <div class="expiry">⏱️ This code expires in ${expiresMinutes} minutes.</div>
      
      <div class="security-note">
        <strong>Security Notice:</strong>
        <p style="margin: 4px 0 0 0;">Never share this code with anyone. HostelEase staff and administrators will never ask for your verification code. If you did not initiate this request, you can safely ignore this email.</p>
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Indian Institute of Technology Patna &bull; HostelEase
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

© ${new Date().getFullYear()} IIT Patna HostelEase
        `.trim();

        const response = await this.resendClient.emails.send({
          from: fromAddress,
          to: [cleanTo],
          subject,
          html: htmlContent,
          text: textContent,
        });

        if (response.error) {
          const rawErr = response.error.message || 'Delivery rejected';
          if (rawErr.includes('only send testing emails') || rawErr.includes('verify a domain')) {
            throw new Error('Resend domain unverified: verify your domain at resend.com/domains to send to @iitp.ac.in.');
          }
          throw new Error(`Resend provider error: ${rawErr}`);
        }

        if (!response.data || !response.data.id) {
          throw new Error('Resend did not return a valid message delivery confirmation.');
        }

        return {
          success: true,
          messageId: response.data.id,
          provider: 'resend',
        };
      } catch (err: any) {
        console.error(`[EmailService] Failed to send email to ${cleanTo} via Resend:`, err.message);
        throw new Error(`Email delivery failed: ${err.message}`);
      }
    }

    // In production, require live Resend email provider configuration
    if (env.NODE_ENV === 'production') {
      throw new Error('Email delivery failed: RESEND_API_KEY is not configured on the production server.');
    }

    // Development mode fallback when RESEND_API_KEY is not yet supplied
    console.warn(`[EmailService] RESEND_API_KEY not configured. Simulated dispatch for: ${cleanTo} (OTP: ${otp})`);
    const devRecord: TestSentEmail = {
      to: cleanTo,
      subject: 'HostelEase Verification Code',
      otp,
      expiresMinutes,
      timestamp: new Date(),
    };
    this.testSentEmails.push(devRecord);

    return {
      success: true,
      messageId: `dev_simulated_${Date.now()}`,
      provider: 'simulated',
    };
  }
}

export const emailService = new EmailService();

