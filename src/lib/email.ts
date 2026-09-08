import nodemailer from "nodemailer";
import { ServerOrder } from "./orderStore";

function appUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const vercelHost = process.env.VERCEL_URL?.trim();
  if (vercelHost) return `https://${vercelHost.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}

function adminNotificationRecipients(): string[] {
  const configured = [
    process.env.ADMIN_EMAIL,
    process.env.ADMIN_EMAILS,
    process.env.GMAIL_USER,
    process.env.SMTP_USER,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((email) => email.trim().toLowerCase())
    .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

  return [...new Set(configured)];
}

interface SendOtpEmailOptions {
  to: string;
  code: string;
  purpose?: "REGISTER" | "RESET_PASSWORD";
}

/**
 * Creates or reuses an SMTP transporter from environment variables
 */
function createSmtpTransporter() {
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (!smtpUser || !smtpPass) return null;

  return {
    transporter: nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass.replace(/\s+/g, ""),
      },
    }),
    from: process.env.SMTP_FROM || `"KAIRO Archive" <${smtpUser}>`,
    user: smtpUser,
  };
}

/**
 * Generic internal dispatcher supporting SMTP, Resend, and Dev Fallback
 */
async function dispatchGenericEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}): Promise<{ success: boolean; message: string; sentViaSmtp?: boolean }> {
  const recipients = Array.isArray(to) ? to.join(", ") : to;
  const smtp = createSmtpTransporter();

  // 1. SMTP / Gmail App Password
  if (smtp) {
    try {
      await smtp.transporter.sendMail({
        from: smtp.from,
        to: recipients,
        subject,
        text,
        html,
      });

      console.log(`[KAIRO EMAIL DISPATCH] Successfully sent email to: ${recipients} | Subject: ${subject}`);
      return {
        success: true,
        sentViaSmtp: true,
        message: `Email dispatched to ${recipients}`,
      };
    } catch (smtpError: unknown) {
      const err = smtpError as Error;
      console.error("[KAIRO EMAIL DISPATCH] SMTP Error:", err?.message || smtpError);
    }
  }

  // 2. Resend API Key fallback
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || "KAIRO Archive <onboarding@resend.dev>",
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
        }),
      });

      if (res.ok) {
        console.log(`[KAIRO EMAIL DISPATCH] Successfully sent email via Resend to: ${recipients}`);
        return {
          success: true,
          sentViaSmtp: true,
          message: `Email dispatched via Resend to ${recipients}`,
        };
      }
    } catch (resendError: unknown) {
      console.error("[KAIRO EMAIL DISPATCH] Resend Error:", resendError);
    }
  }

  // 3. Terminal Log Fallback for Dev
  if (process.env.NODE_ENV !== "production") {
    console.log("------------------------------------------------------------");
    console.log(`[KAIRO EMAIL DISPATCH - DEV LOG]`);
    console.log(`Recipient: ${recipients}`);
    console.log(`Subject: ${subject}`);
    console.log(`Text Preview: ${text.slice(0, 160)}...`);
    console.log("------------------------------------------------------------");
  }

  return {
    success: true,
    sentViaSmtp: false,
    message: `Email recorded in log for ${recipients}`,
  };
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
  const isReset = purpose === "RESET_PASSWORD";
  const emailSubject = isReset
    ? `[KAIRO ARCHIVE] Password Reset Verification Code: ${code}`
    : `Your KAIRO Verification Code: ${code}`;
  const html = generateOtpHtmlEmail(code, to, purpose);
  const text = `Your KAIRO verification code is: ${code}. It expires in 10 minutes.`;

  return dispatchGenericEmail({
    to,
    subject: emailSubject,
    html,
    text,
  });
}

/**
 * 1. ADMIN NOTIFICATION: Dispatched whenever a new order is registered
 */
export async function sendAdminNewOrderNotification(order: ServerOrder): Promise<void> {
  try {
    const adminRecipients = adminNotificationRecipients();

    if (adminRecipients.length === 0) return;

    const isElectronic = order.paymentMethod === "wallet" || order.paymentMethod === "instapay";
    const paymentBadge = isElectronic
      ? `<span style="display:inline-block; padding:3px 8px; background-color:#854d0e; color:#fef08a; font-size:11px; font-weight:bold; border-radius:3px;">Requires Transfer Verification (36h Hold)</span>`
      : `<span style="display:inline-block; padding:3px 8px; background-color:#14532d; color:#86efac; font-size:11px; font-weight:bold; border-radius:3px;">Cash on Delivery</span>`;

    const itemsHtml = order.items
      .map(
        (it) => `
        <tr style="border-bottom: 1px solid #222;">
          <td style="padding: 10px 8px; color: #f5f3ef; font-size: 13px;">
            <strong>${it.title || "Volume"}</strong> ${it.volumeNumber ? `(Vol. ${it.volumeNumber})` : ""}
            <div style="font-size: 11px; color: #888; font-family: monospace;">${it.format || "Tankōbon"}</div>
          </td>
          <td style="padding: 10px 8px; text-align: center; color: #d4af37; font-weight: bold; font-size: 13px;">
            ${it.quantity || 1}
          </td>
          <td style="padding: 10px 8px; text-align: right; color: #f5f3ef; font-family: monospace; font-size: 13px;">
            ${(it.price || 0) * (it.quantity || 1)} EGP
          </td>
        </tr>
      `
      )
      .join("");

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>New Order #${order.id}</title></head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; color: #f5f3ef; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0a0a; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #121212; border: 1px solid #2e2e2e; border-radius: 4px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 24px 30px; background: linear-gradient(180deg, #1f1a14 0%, #121212 100%); border-bottom: 1px solid #2e2e2e;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <span style="font-family: monospace; font-size: 11px; letter-spacing: 2px; color: #D4AF37; text-transform: uppercase;">
                    KAIRO ADMIN ARCHIVE ALERT
                  </span>
                  <h1 style="margin: 4px 0 0; font-size: 20px; font-weight: 800; color: #ffffff;">
                    New Order Received: #${order.id}
                  </h1>
                </div>
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 26px 30px;">
              <p style="margin: 0 0 18px; font-size: 14px; color: #cccccc;">
                A new archival collection order has been placed on KAIRO and registered in the central system.
              </p>

              <!-- Order Summary Card -->
              <table width="100%" style="background-color: #0d0d0d; border: 1px solid #262626; border-radius: 4px; margin-bottom: 22px; padding: 14px;">
                <tr>
                  <td style="padding: 6px; font-size: 12px; color: #888;">Customer:</td>
                  <td style="padding: 6px; font-size: 13px; color: #f5f3ef; font-weight: bold;">
                    ${order.customerName || "Collector"}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px; font-size: 12px; color: #888;">Phone / Contact:</td>
                  <td style="padding: 6px; font-size: 13px; color: #f5f3ef; font-family: monospace;">
                    <a href="tel:${order.customerPhone}" style="color: #D4AF37; text-decoration: none;">${order.customerPhone || "N/A"}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px; font-size: 12px; color: #888;">Email:</td>
                  <td style="padding: 6px; font-size: 13px; color: #cccccc; font-family: monospace;">
                    ${order.customerEmail || "N/A"}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px; font-size: 12px; color: #888;">Shipping Destination:</td>
                  <td style="padding: 6px; font-size: 13px; color: #f5f3ef;">
                    ${order.customerGovernorate || "Cairo"}, Egypt — <span style="color:#aaa;">${order.customerAddress || ""}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px; font-size: 12px; color: #888;">Payment Method:</td>
                  <td style="padding: 6px; font-size: 13px; color: #f5f3ef;">
                    ${order.paymentMethod?.toUpperCase() || "CASH"} — ${paymentBadge}
                  </td>
                </tr>
                ${
                  order.paymentSenderDetail
                    ? `<tr>
                        <td style="padding: 6px; font-size: 12px; color: #888;">Sender Reference:</td>
                        <td style="padding: 6px; font-size: 13px; color: #D4AF37; font-weight: bold; font-family: monospace;">
                          ${order.paymentSenderDetail}
                        </td>
                      </tr>`
                    : ""
                }
              </table>

              <!-- Order Items -->
              <h3 style="margin: 18px 0 10px; font-size: 13px; font-family: monospace; letter-spacing: 1px; color: #D4AF37; text-transform: uppercase;">
                Ordered Volumes (${order.items.length})
              </h3>
              <table width="100%" style="border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                  <tr style="border-bottom: 1px solid #333; font-family: monospace; font-size: 11px; color: #888; text-transform: uppercase;">
                    <th align="left" style="padding: 6px 8px;">Item</th>
                    <th align="center" style="padding: 6px 8px;">Qty</th>
                    <th align="right" style="padding: 6px 8px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <!-- Financial Totals -->
              <table width="100%" style="background-color: #171717; border-top: 1px solid #333; padding: 12px; font-family: monospace; font-size: 12px;">
                <tr>
                  <td style="color: #888;">Subtotal:</td>
                  <td align="right" style="color: #ccc;">${order.subtotal} EGP</td>
                </tr>
                ${
                  order.discountAmount
                    ? `<tr>
                        <td style="color: #4ade80;">Discount (${order.appliedCoupon || "Voucher"}):</td>
                        <td align="right" style="color: #4ade80;">-${order.discountAmount} EGP</td>
                      </tr>`
                    : ""
                }
                <tr>
                  <td style="color: #888;">Shipping (${order.customerGovernorate || "Standard"}):</td>
                  <td align="right" style="color: #ccc;">${order.shippingCost === 0 ? "FREE" : `${order.shippingCost} EGP`}</td>
                </tr>
                <tr style="border-top: 1px solid #333; font-size: 15px; font-weight: bold;">
                  <td style="padding-top: 8px; color: #ffffff;">Final Grand Total:</td>
                  <td align="right" style="padding-top: 8px; color: #D4AF37;">${order.total} EGP</td>
                </tr>
              </table>

              <!-- Call to Action -->
              <div style="text-align: center; margin-top: 26px;">
                <a href="${appUrl()}/admin" 
                   style="display: inline-block; background-color: #D4AF37; color: #0a0a0a; font-weight: bold; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; padding: 12px 24px; text-decoration: none; border-radius: 3px;">
                  Open Admin Console to Inspect Order
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 30px; background-color: #0b0b0b; border-top: 1px solid #1f1f1f; text-align: center; font-family: monospace; font-size: 10px; color: #666;">
              KAIRO CENTRAL ORDER SYSTEM • AUTOMATED DISPATCH ALERT
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const text = `KAIRO Admin Alert: New Order #${order.id} placed by ${order.customerName || "Collector"} for ${order.total} EGP. Open admin dashboard to inspect: ${appUrl()}/admin`;

    await dispatchGenericEmail({
      to: adminRecipients,
      subject: `[KAIRO ADMIN] New Order Placed: #${order.id} (${order.total} EGP - ${order.customerName || "Collector"})`,
      html,
      text,
    });
  } catch (err) {
    console.error("[KAIRO EMAIL DISPATCH] Error in sendAdminNewOrderNotification:", err);
  }
}

/**
 * 2. CUSTOMER UPDATE: Dispatched whenever an order status changes
 */
export async function sendCustomerOrderStatusUpdateEmail(
  order: ServerOrder,
  previousStatus?: string,
  updateNotes?: string
): Promise<void> {
  try {
    if (!order.customerEmail) return;
    const orderUrl = `${appUrl()}/account?tab=ORDERS&newOrder=${encodeURIComponent(order.id)}`;

    const statusTitle = order.status;
    let statusDescription = `Your order #${order.id} has been updated to: "${order.status}".`;

    if (order.status === "Confirmed") {
      statusDescription = "Your order has been officially confirmed and registered in our central archival queue.";
    } else if (order.status === "Processing") {
      statusDescription = "Our curators are carefully inspecting and preparing your manga volumes for protective dispatch.";
    } else if (order.status === "Delivered") {
      statusDescription = "Your archival package has been successfully delivered! We hope you enjoy adding these volumes to your collection.";
    } else if (order.status.toLowerCase().includes("cancelled")) {
      statusDescription = `Your order has been cancelled.${updateNotes ? ` Reason: ${updateNotes}` : ""}`;
    }

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Order Update #${order.id}</title></head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; color: #f5f3ef; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0a0a; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 550px; background-color: #121212; border: 1px solid #262626; border-radius: 4px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 28px 30px 20px; text-align: center; border-bottom: 1px solid #222; background: linear-gradient(180deg, #181818 0%, #121212 100%);">
              <div style="display: inline-block; background-color: #D94A3A; color: #ffffff; width: 30px; height: 30px; line-height: 30px; font-size: 14px; font-weight: bold; border-radius: 3px; margin-bottom: 10px; font-family: serif;">
                回路
              </div>
              <h1 style="margin: 0; font-size: 18px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #ffffff;">
                Order Status Update
              </h1>
              <p style="margin: 5px 0 0; font-size: 11px; font-family: monospace; letter-spacing: 1px; color: #888;">
                ORDER #${order.id}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 28px 30px;">
              <p style="margin: 0 0 14px; font-size: 14px; color: #cccccc;">
                Dear ${order.customerName || "Patron"},
              </p>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #cccccc;">
                ${statusDescription}
              </p>

              <!-- Current Status Banner -->
              <div style="background-color: #0d0d0d; border-left: 3px solid #D4AF37; padding: 16px 20px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                <span style="font-family: monospace; font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px;">
                  Current Status
                </span>
                <div style="font-size: 18px; font-weight: bold; color: #D4AF37; margin-top: 4px;">
                  ${statusTitle}
                </div>
                ${
                  previousStatus
                    ? `<span style="font-size: 11px; color: #666; font-family: monospace;">(Previously: ${previousStatus})</span>`
                    : ""
                }
              </div>

              <!-- Brief Details -->
              <table width="100%" style="font-size: 12px; font-family: monospace; color: #888; margin-top: 20px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0;">Total Amount:</td>
                  <td align="right" style="color: #f5f3ef; font-weight: bold;">${order.total} EGP</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0;">Payment Method:</td>
                  <td align="right" style="color: #f5f3ef;">${order.paymentMethod?.toUpperCase() || "CASH"}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0;">Delivery Destination:</td>
                  <td align="right" style="color: #f5f3ef;">${order.customerGovernorate || "Egypt"}</td>
                </tr>
              </table>

              <!-- Portal Access Button -->
              <div style="text-align: center; margin-top: 28px;">
                <a href="${orderUrl}" 
                   style="display: inline-block; background-color: #1e1e1e; border: 1px solid #D4AF37; color: #D4AF37; font-weight: bold; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; padding: 10px 22px; text-decoration: none; border-radius: 3px;">
                  View Full Order History & Timeline
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 18px 30px; background-color: #0b0b0b; border-top: 1px solid #1f1f1f; text-align: center; font-family: monospace; font-size: 10px; color: #555;">
              KAIRO Central Archival Hub • 6th of October City, Giza, Egypt
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const text = `Order #${order.id} update: Your order status is now "${order.status}". View details at: ${orderUrl}`;

    await dispatchGenericEmail({
      to: order.customerEmail,
      subject: `[KAIRO] Order #${order.id} Status Update: ${order.status}`,
      html,
      text,
    });
  } catch (err) {
    console.error("[KAIRO EMAIL DISPATCH] Error in sendCustomerOrderStatusUpdateEmail:", err);
  }
}

/**
 * 3. SHIPMENT DISPATCH: Specialized shipping email with carrier, waybill, and interactive tracking link
 */
export async function sendCustomerOrderShippedEmail(order: ServerOrder): Promise<void> {
  try {
    if (!order.customerEmail) return;

    const courier = order.courier || "Tracked Courier Express";
    const trackingNumber = order.trackingNumber || "Pending Dispatch Code";
    const trackingUrl = order.trackingUrl || "";

    const itemsSummary = order.items
      .map((it) => `${it.title || "Volume"} (x${it.quantity || 1})`)
      .join(", ");

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Your Archival Package Has Shipped! #${order.id}</title></head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; color: #f5f3ef; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0a0a; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #121212; border: 1px solid #2e2e2e; border-radius: 4px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.9);">
          
          <!-- Top Banner -->
          <tr>
            <td style="padding: 32px 30px 24px; text-align: center; border-bottom: 1px solid #2a2a2a; background: linear-gradient(180deg, #1c1810 0%, #121212 100%);">
              <span style="font-family: monospace; font-size: 11px; letter-spacing: 2.5px; color: #D4AF37; text-transform: uppercase;">
                DISPATCH PROTOCOL INITIATED
              </span>
              <h1 style="margin: 8px 0 0; font-size: 22px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #ffffff;">
                Your Order Has Shipped!
              </h1>
              <p style="margin: 6px 0 0; font-size: 12px; font-family: monospace; color: #888;">
                ORDER #${order.id} • ${order.customerGovernorate || "Egypt"}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 28px 30px;">
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #cccccc;">
                Dear <strong style="color: #ffffff;">${order.customerName || "Patron"}</strong>,
              </p>
              <p style="margin: 0 0 22px; font-size: 14px; line-height: 1.6; color: #cccccc;">
                Great news! Your archival manga volumes have departed the KAIRO fulfillment vault and are currently in transit with our logistics carrier.
              </p>

              <!-- Logistics Waybill Card -->
              <div style="background-color: #0d0d0d; border: 1.5px solid #D4AF37; border-radius: 4px; padding: 22px; margin: 22px 0;">
                <table width="100%" style="border-collapse: collapse; font-family: monospace;">
                  <tr>
                    <td style="padding-bottom: 12px; font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px;">
                      Logistics Carrier:
                    </td>
                    <td align="right" style="padding-bottom: 12px; font-size: 13px; color: #f5f3ef; font-weight: bold;">
                      ${courier}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 14px; font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px;">
                      Tracking / Waybill Number:
                    </td>
                    <td align="right" style="padding-bottom: 14px; font-size: 15px; color: #D4AF37; font-weight: bold; letter-spacing: 1px;">
                      ${trackingNumber}
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px;">
                      Estimated Arrival:
                    </td>
                    <td align="right" style="font-size: 12px; color: #38bdf8; font-weight: bold;">
                      ${order.estimatedDelivery || "24 - 48 Hours"}
                    </td>
                  </tr>
                </table>

                ${
                  trackingUrl
                    ? `
                  <div style="text-align: center; margin-top: 20px; padding-top: 18px; border-top: 1px solid #222;">
                    <a href="${trackingUrl}" 
                       target="_blank" 
                       style="display: inline-block; background-color: #D4AF37; color: #0a0a0a; font-weight: bold; font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; padding: 13px 28px; text-decoration: none; border-radius: 3px; box-shadow: 0 4px 15px rgba(212,175,55,0.3);">
                      Track Your Shipment Online
                    </a>
                    <div style="margin-top: 8px; font-size: 10px; font-family: monospace; color: #777;">
                      Direct real-time courier tracking portal
                    </div>
                  </div>
                `
                    : ""
                }
              </div>

              <!-- Package Manifest -->
              <div style="background-color: #141414; border: 1px solid #262626; border-radius: 3px; padding: 14px 16px; margin-bottom: 20px;">
                <span style="display: block; font-family: monospace; font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                  Package Manifest (${order.items.length} items):
                </span>
                <p style="margin: 0; font-size: 12px; color: #bbb; line-height: 1.5;">
                  ${itemsSummary}
                </p>
              </div>

              <!-- Delivery Destination -->
              <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #888;">
                Delivering to: <strong style="color: #eee;">${order.customerAddress || ""}, ${order.customerGovernorate || "Egypt"}</strong>. 
                Our courier will contact you at <strong style="color: #D4AF37;">${order.customerPhone || ""}</strong> prior to final delivery.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #0b0b0b; border-top: 1px solid #1f1f1f; text-align: center; font-family: monospace; font-size: 10px; color: #555;">
              精神と物質の回路 • 100% LICENSED JAPANESE ARCHIVE
              <div style="margin-top: 4px; color: #444;">Central Archival Hub • 6th of October City, Giza, Egypt</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const text = `KAIRO Order #${order.id} Shipped! Courier: ${courier}, Tracking Number: ${trackingNumber}.${trackingUrl ? ` Track online: ${trackingUrl}` : ""}`;

    await dispatchGenericEmail({
      to: order.customerEmail,
      subject: `[KAIRO] Your Order Has Shipped! Tracking #${trackingNumber} (Order #${order.id})`,
      html,
      text,
    });
  } catch (err) {
    console.error("[KAIRO EMAIL DISPATCH] Error in sendCustomerOrderShippedEmail:", err);
  }
}

/**
 * 4. AUTO-CANCELLATION: Dispatched when an electronic payment hold expires after 36 hours
 */
export async function sendCustomerOrderAutoCancelledEmail(order: ServerOrder): Promise<void> {
  try {
    if (!order.customerEmail) return;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Order Cancelled - Hold Expired #${order.id}</title></head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; color: #f5f3ef; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0a0a; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #121212; border: 1px solid #332222; border-radius: 4px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 28px 30px 20px; text-align: center; border-bottom: 1px solid #2e1e1e; background: linear-gradient(180deg, #1f1212 0%, #121212 100%);">
              <span style="font-family: monospace; font-size: 11px; letter-spacing: 2px; color: #f87171; text-transform: uppercase;">
                PAYMENT WINDOW EXPIRED (36 HOURS)
              </span>
              <h1 style="margin: 6px 0 0; font-size: 20px; font-weight: 800; color: #ffffff;">
                Order Cancelled: #${order.id}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 26px 30px;">
              <p style="margin: 0 0 14px; font-size: 14px; color: #cccccc;">
                Dear ${order.customerName || "Patron"},
              </p>
              <p style="margin: 0 0 18px; font-size: 14px; line-height: 1.6; color: #cccccc;">
                This is to notify you that Order <strong style="color: #fff;">#${order.id}</strong> has been automatically cancelled because the payment transfer was not completed or verified within our standard 36-hour (1.5 days) hold window.
              </p>
              <p style="margin: 0 0 20px; font-size: 13px; line-height: 1.6; color: #999;">
                The reserved manga volumes have been returned to the central catalog for other collectors. If you have already transferred the funds or believe this is an error, please reach out to our team immediately with your transfer reference number.
              </p>

              <div style="text-align: center; margin-top: 24px;">
                <a href="${appUrl()}" 
                   style="display: inline-block; background-color: #D4AF37; color: #0a0a0a; font-weight: bold; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; padding: 11px 22px; text-decoration: none; border-radius: 3px;">
                  Re-order from Catalog
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 30px; background-color: #0b0b0b; border-top: 1px solid #1f1f1f; text-align: center; font-family: monospace; font-size: 10px; color: #555;">
              KAIRO Central Archival Hub • Customer Care
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const text = `Order #${order.id} was automatically cancelled due to payment hold expiration (36 hours). Please contact KAIRO if you have already transferred.`;

    await dispatchGenericEmail({
      to: order.customerEmail,
      subject: `[KAIRO] Order #${order.id} Cancelled (Payment Window Expired)`,
      html,
      text,
    });
  } catch (err) {
    console.error("[KAIRO EMAIL DISPATCH] Error in sendCustomerOrderAutoCancelledEmail:", err);
  }
}
