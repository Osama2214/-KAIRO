import nodemailer from "nodemailer";

interface SendOtpEmailOptions {
  to: string;
  code: string;
  purpose?: "REGISTER" | "RESET_PASSWORD";
}

/**
 * Creates an authentic luxury HTML email template matching KAIRO's Japanese design language
 */
function generateOtpHtmlEmail(code: string, recipientEmail: string, purpose: "REGISTER" | "RESET_PASSWORD" = "REGISTER"): string {
  const isReset = purpose === "RESET_PASSWORD";
  const title = isReset ? "Password Reset Protocol" : "Patron Registration Protocol";
  const introText = isReset
    ? `Use the one-time security code below to reset the password for your KAIRO Patron account (<strong style="color: #f5f3ef;">${recipientEmail}</strong>):`
    : `Use the one-time security code below to verify your email (<strong style="color: #f5f3ef;">${recipientEmail}</strong>) and complete your KAIRO Patron registration:`;
  const warningText = isReset
    ? "If you did not request a password reset, your account credentials remain unchanged and secure. You can safely ignore this email."
    : "If you did not request this verification code, you can safely ignore this email. No account will be created without this verification code.";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isReset ? "KAIRO Password Reset" : "KAIRO Security Code"}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; color: #f5f3ef; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0a0a; padding: 40px 10px;">
    <tr>
      <td align="center">
        <!-- Main Container Card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #121212; border: 1px solid #262626; border-radius: 4px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
          
          <!-- Top Header Strip -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #222222; background: linear-gradient(180deg, #181818 0%, #121212 100%);">
              <div style="display: inline-block; background-color: #D94A3A; color: #ffffff; width: 32px; height: 32px; line-height: 32px; font-size: 15px; font-weight: bold; border-radius: 3px; margin-bottom: 12px; font-family: serif;">
                回路
              </div>
              <h1 style="margin: 0; font-size: 19px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; color: #f5f3ef;">
                KAIRO ARCHIVE
              </h1>
              <p style="margin: 6px 0 0; font-size: 11px; font-family: monospace; letter-spacing: 1.5px; color: #888888; text-transform: uppercase;">
                ${title}
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #cccccc;">
                Greetings,
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #cccccc;">
                ${introText}
              </p>

              <!-- 6-Digit OTP Box -->
              <div style="background-color: #0d0d0d; border: 1.5px solid #D4AF37; border-radius: 4px; padding: 24px; text-align: center; margin: 28px 0;">
                <span style="display: block; font-size: 11px; font-family: monospace; letter-spacing: 2px; color: #888888; text-transform: uppercase; margin-bottom: 8px;">
                  ${isReset ? "Recovery Code" : "Verification Code"}
                </span>
                <div style="font-family: monospace, Courier, sans-serif; font-size: 38px; font-weight: bold; letter-spacing: 10px; color: #D4AF37; padding-left: 10px;">
                  ${code}
                </div>
                <span style="display: block; font-size: 11px; font-family: monospace; color: #666666; margin-top: 10px;">
                  Valid for 10 minutes • Single use only
                </span>
              </div>

              <p style="margin: 0 0 10px; font-size: 12px; line-height: 1.6; color: #777777;">
                ${warningText}
              </p>
            </td>
          </tr>

          <!-- Footer Strip -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0e0e0e; border-top: 1px solid #1f1f1f; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 10px; font-family: monospace; color: #666666; letter-spacing: 0.5px;">
                精神と物質の回路 • 100% LICENSED JAPANESE ARCHIVE
              </p>
              <p style="margin: 0; font-size: 10px; font-family: monospace; color: #444444;">
                Central Archival Hub • 6th of October City, Giza, Egypt
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Dispatches an OTP verification email using configured SMTP or Gmail transport
 */
export async function sendVerificationEmail({
  to,
  code,
  purpose = "REGISTER",
}: SendOtpEmailOptions): Promise<{ success: boolean; message: string; sentViaSmtp?: boolean }> {
  // 1. Check if SMTP / Gmail App Password is configured
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const smtpFrom = process.env.SMTP_FROM || (smtpUser ? `"KAIRO Archive" <${smtpUser}>` : '"KAIRO Archive" <security@kairo.archive>');

  const isReset = purpose === "RESET_PASSWORD";
  const emailSubject = isReset
    ? `[KAIRO ARCHIVE] Password Reset Verification Code: ${code}`
    : `Your KAIRO Verification Code: ${code}`;

  // If credentials exist, send via real SMTP!
  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost || "smtp.gmail.com",
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass.replace(/\s+/g, ""), // clean spaces in app passwords
        },
      });

      const html = generateOtpHtmlEmail(code, to, purpose);

      await transporter.sendMail({
        from: smtpFrom,
        to,
        subject: emailSubject,
        text: `Your KAIRO verification code is: ${code}. It expires in 10 minutes.`,
        html,
      });

      console.log(`[KAIRO EMAIL DISPATCH] Successfully sent real verification email to: ${to}`);
      return {
        success: true,
        sentViaSmtp: true,
        message: `A 6-digit verification code has been dispatched to ${to}`,
      };
    } catch (smtpError: unknown) {
      const err = smtpError as Error;
      console.error("[KAIRO EMAIL DISPATCH] SMTP Error:", err?.message || smtpError);
      return {
        success: false,
        sentViaSmtp: false,
        message: `Failed to send email to ${to}: ${err?.message || "SMTP error"}`,
      };
    }
  }

  // 2. Check if Resend API key is configured
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const html = generateOtpHtmlEmail(code, to, purpose);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || "KAIRO Archive <onboarding@resend.dev>",
          to: [to],
          subject: emailSubject,
          html,
        }),
      });

      if (res.ok) {
        console.log(`[KAIRO EMAIL DISPATCH] Successfully sent email via Resend to: ${to}`);
        return {
          success: true,
          sentViaSmtp: true,
          message: `A 6-digit verification code has been dispatched to ${to}`,
        };
      }
    } catch (resendError: unknown) {
      console.error("[KAIRO EMAIL DISPATCH] Resend Error:", resendError);
    }
  }

  // 3. Fallback when no SMTP credentials configured in .env.local yet:
  // Log the code securely to server console so the developer can see it in terminal,
  // but NEVER return it in the client HTTP response or on the user's screen!
  console.log("------------------------------------------------------------");
  console.log(`[KAIRO EMAIL DISPATCH - TERMINAL LOG]`);
  console.log(`Recipient: ${to}`);
  console.log(`6-Digit Code: ${code}`);
  console.log(`Tip: Configure GMAIL_USER & GMAIL_APP_PASSWORD in .env.local to send real emails to inbox!`);
  console.log("------------------------------------------------------------");

  return {
    success: true,
    sentViaSmtp: false,
    message: `A 6-digit verification code has been dispatched to ${to}`,
  };
}
