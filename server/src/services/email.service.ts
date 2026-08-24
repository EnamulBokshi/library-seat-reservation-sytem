import { Resend } from "resend";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

interface SendBookingEmailOptions {
  toEmail: string;
  studentName: string;
  seatNumber: string;
  zoneName: string;
  dateStr: string;
  slotName: string;
  qrToken: string;
  qrCodeBase64: string;
}

/**
 * Creates a Nodemailer transporter based on .env configuration.
 */
const createNodemailerTransporter = () => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const smtpSecure = process.env.SMTP_SECURE === "true" || smtpPort === 465;

  if (smtpHost && smtpUser && smtpPass) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  // Gmail convenience helper if GMAIL_USER & GMAIL_APP_PASSWORD are provided
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  return null;
};

/**
 * Send booking confirmation email with embedded QR code.
 */
export const sendBookingConfirmationEmail = async (opts: SendBookingEmailOptions) => {
  const {
    toEmail,
    studentName,
    seatNumber,
    zoneName,
    dateStr,
    slotName,
    qrToken,
    qrCodeBase64,
  } = opts;

  console.log(`[Email Service] Preparing confirmation email for ${toEmail}...`);

  const fromAddress =
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM_EMAIL ||
    process.env.SMTP_USER ||
    process.env.GMAIL_USER ||
    "Smart Library <onboarding@resend.dev>";

  const base64Data = qrCodeBase64.includes(";base64,")
    ? qrCodeBase64.split(";base64,").pop()!
    : qrCodeBase64;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
          .card { max-width: 520px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid #334155; }
          .header { text-align: center; margin-bottom: 24px; }
          .logo { font-size: 20px; font-weight: bold; color: #818cf8; }
          .title { font-size: 24px; font-weight: 800; color: #ffffff; margin-top: 8px; }
          .details { background: #0f172a; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #334155; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .label { color: #94a3b8; }
          .val { color: #ffffff; font-weight: 600; }
          .qr-container { text-align: center; margin: 24px 0; background: #ffffff; padding: 16px; border-radius: 12px; display: inline-block; }
          .qr-img { width: 180px; height: 180px; }
          .footer { text-align: center; font-size: 12px; color: #64748b; margin-top: 24px; }
          .notice { background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); color: #fbbf24; padding: 12px; border-radius: 8px; font-size: 12px; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div class="logo">📚 Smart Library</div>
            <div class="title">Booking Confirmed!</div>
          </div>
          <p>Hello <strong>${studentName}</strong>,</p>
          <p>Your seat reservation has been confirmed. Below are your pass details:</p>
          
          <div class="details">
            <div class="row"><span class="label">Seat</span><span class="val">${seatNumber}</span></div>
            <div class="row"><span class="label">Zone</span><span class="val">${zoneName}</span></div>
            <div class="row"><span class="label">Date</span><span class="val">${dateStr}</span></div>
            <div class="row"><span class="label">Slot</span><span class="val" style="text-transform: capitalize;">${slotName}</span></div>
            <div class="row"><span class="label">Token</span><span class="val" style="font-family: monospace;">${qrToken}</span></div>
          </div>

          <div style="text-align: center;">
            <div class="qr-container">
              <img src="cid:qrcode" alt="QR Pass" class="qr-img" />
            </div>
          </div>

          <div class="notice">
            ⏰ <strong>Important:</strong> Please check in within 15 minutes of slot start time. Unverified reservations will be automatically cancelled.
          </div>

          <div class="footer">
            Show this QR code at the entrance scanner to confirm your check-in.
          </div>
        </div>
      </body>
    </html>
  `;

  // 1. Try Nodemailer SMTP if configured
  const smtpTransporter = createNodemailerTransporter();
  if (smtpTransporter) {
    try {
      const info = await smtpTransporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: `Your Library Seat Pass — Seat ${seatNumber} (${zoneName})`,
        html: htmlContent,
        attachments: [
          {
            filename: "qr-pass.png",
            content: Buffer.from(base64Data, "base64"),
            cid: "qrcode",
          },
        ],
      });
      console.log(`[Email Service] SMTP email dispatched successfully to ${toEmail}. Message ID: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error("[Email Service] SMTP dispatch error:", error);
    }
  }

  // 2. Try Resend API if configured
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    const resendFrom =
      process.env.RESEND_FROM_EMAIL ||
      process.env.EMAIL_FROM ||
      "Smart Library <onboarding@resend.dev>";

    try {
      const resend = new Resend(resendApiKey);
      const response = await resend.emails.send({
        from: resendFrom,
        to: [toEmail],
        subject: `Your Library Seat Pass — Seat ${seatNumber} (${zoneName})`,
        html: htmlContent,
        attachments: [
          {
            filename: "qr-pass.png",
            content: Buffer.from(base64Data, "base64"),
            contentId: "qrcode",
          },
        ],
      });
      if (response.error) {
        console.error("[Email Service] Resend API error:", response.error);
      } else {
        console.log(`[Email Service] Resend email dispatched successfully. ID: ${response.data?.id}`);
      }
      return response;
    } catch (error) {
      console.error("[Email Service] Resend API exception:", error);
    }
  }

  // 3. Fallback warning if no provider is configured in .env
  console.warn(
    `[Email Service] ⚠️ Email delivery skipped for ${toEmail}. No email credentials found in server/.env.\n` +
      `  To enable emails via Nodemailer (SMTP/Gmail): Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (or GMAIL_USER & GMAIL_APP_PASSWORD) in server/.env\n` +
      `  To enable emails via Resend: Set RESEND_API_KEY in server/.env`
  );
};

export const emailService = {
  sendBookingConfirmationEmail,
};

