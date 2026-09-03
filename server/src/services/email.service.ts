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
  bookingId?: string;
}

const SLOT_TIME_RANGES: Record<string, string> = {
  morning: "08:00 AM – 12:00 PM",
  noon: "12:00 PM – 02:00 PM",
  afternoon: "02:00 PM – 06:00 PM",
  evening: "06:00 PM – 09:00 PM",
};

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
 * Send booking confirmation email with clean Flat UI design and downloadable QR pass.
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

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const base64Data = qrCodeBase64.includes(";base64,")
    ? qrCodeBase64.split(";base64,").pop()!
    : qrCodeBase64;

  const normalizedSlot = slotName.toLowerCase();
  const timeRange = SLOT_TIME_RANGES[normalizedSlot] || "";
  const slotDisplay = slotName.charAt(0).toUpperCase() + slotName.slice(1).toLowerCase();
  const qrDownloadUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(qrToken)}&download=1&format=png`;
  const qrDisplayUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrToken)}&format=png&margin=4`;

  const htmlContent = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Seat Reservation Pass — ${seatNumber}</title>
    <style type="text/css">
      body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
      body { margin: 0; padding: 0; width: 100% !important; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    </style>
  </head>
  <body style="margin: 0; padding: 24px 12px; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          
          <!-- Main Card Container -->
          <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 540px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; text-align: left;">
            
            <!-- Top Header Bar -->
            <tr>
              <td style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; background-color: #ffffff;">
                <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td align="left" style="vertical-align: middle;">
                      <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                        <tr>
                          <td style="background-color: #0f172a; width: 28px; height: 28px; border-radius: 6px; text-align: center; vertical-align: middle; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 0.5px;">
                            SL
                          </td>
                          <td style="padding-left: 10px; font-size: 15px; font-weight: 700; color: #0f172a; letter-spacing: -0.2px;">
                            Smart Library
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td align="right" style="vertical-align: middle;">
                      <span style="display: inline-block; background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; border-radius: 9999px; padding: 3px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                        ● Confirmed
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Main Content Area -->
            <tr>
              <td style="padding: 28px 24px 20px 24px;">
                
                <!-- Kicker & Title -->
                <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">
                  RESERVATION &bull; DIGITAL PASS
                </div>
                <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.25;">
                  Seat ${seatNumber} Pass
                </h1>
                <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.5; color: #475569;">
                  Hello <strong>${studentName}</strong>, your seat reservation has been confirmed. Below are your booking details and entry QR pass.
                </p>

                <!-- Pass Details Table (Flat UI) -->
                <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 24px; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; width: 35%; font-weight: 500;">
                      Seat Number
                    </td>
                    <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #0f172a; font-weight: 700;">
                      ${seatNumber}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 500;">
                      Study Zone
                    </td>
                    <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: 600;">
                      ${zoneName}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 500;">
                      Date
                    </td>
                    <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: 600;">
                      ${dateStr}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 500;">
                      Time Slot
                    </td>
                    <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: 600;">
                      ${slotDisplay} ${timeRange ? `<span style="color: #64748b; font-size: 12px; font-weight: 400;">(${timeRange})</span>` : ""}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; font-size: 13px; color: #64748b; font-weight: 500;">
                      Pass Token
                    </td>
                    <td style="padding: 12px 16px; font-size: 12px; color: #334155; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; word-break: break-all;">
                      ${qrToken}
                    </td>
                  </tr>
                </table>

                <!-- QR Code Box (Flat Design) -->
                <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; text-align: center; margin-bottom: 20px;">
                  <tr>
                    <td style="padding: 24px 16px; text-align: center;">
                      <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #64748b; margin-bottom: 14px;">
                        ENTRANCE QR PASS
                      </div>
                      
                      <!-- QR Image -->
                      <div style="display: inline-block; background-color: #ffffff; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
                        <img src="${qrDisplayUrl}" alt="QR Pass for Seat ${seatNumber}" width="170" height="170" style="display: block; width: 170px; height: 170px;" />
                      </div>
                      
                      <div style="margin-top: 12px; font-size: 11px; color: #64748b;">
                        Show this at the library scanner upon arrival
                      </div>

                      <!-- Action Buttons -->
                      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 18px auto 0 auto;">
                        <tr>
                          <td style="padding: 0 4px;">
                            <a href="${qrDownloadUrl}" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 600; padding: 9px 16px; border-radius: 6px;">
                              Download QR Pass
                            </a>
                          </td>
                          <td style="padding: 0 4px;">
                            <a href="${frontendUrl}/bookings" target="_blank" style="display: inline-block; background-color: #ffffff; color: #0f172a; text-decoration: none; font-size: 12px; font-weight: 600; padding: 8px 16px; border-radius: 6px; border: 1px solid #cbd5e1;">
                              View in Portal
                            </a>
                          </td>
                        </tr>
                      </table>

                    </td>
                  </tr>
                </table>

                <!-- Flat Notice Banner -->
                <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 3px solid #f59e0b; border-radius: 4px; margin-bottom: 8px;">
                  <tr>
                    <td style="padding: 12px 14px; font-size: 12px; line-height: 1.5; color: #92400e;">
                      <strong>Check-in Policy:</strong> Please scan your pass at the entrance scanner within <strong>15 minutes</strong> of slot start time. Unclaimed seats are automatically released for other students.
                    </td>
                  </tr>
                </table>

              </td>
            </tr>

            <!-- Flat Footer -->
            <tr>
              <td style="padding: 18px 24px; border-top: 1px solid #e2e8f0; background-color: #fcfdfe; text-align: center; font-size: 11px; line-height: 1.6; color: #94a3b8;">
                Smart Library Management System &bull; Automated Pass Notification<br />
                To manage or release your reservation, please visit the <a href="${frontendUrl}/bookings" style="color: #0f172a; text-decoration: underline; font-weight: 500;">student portal</a>.
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>
  </body>
</html>
  `;

  const attachmentFilename = `library-pass-${seatNumber}.png`;
  const attachmentBuffer = Buffer.from(base64Data, "base64");

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
            filename: attachmentFilename,
            content: attachmentBuffer,
            contentType: "image/png",
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
            filename: attachmentFilename,
            content: attachmentBuffer,
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

/**
 * Generic HTML Email Dispatcher supporting both Nodemailer (SMTP) and Resend
 */
const sendHtmlEmail = async (toEmail: string, subject: string, htmlContent: string) => {
  console.log(`[Email Service] Dispatching email to ${toEmail}: "${subject}"`);

  // 1. Try Nodemailer (SMTP)
  const transporter = createNodemailerTransporter();
  if (transporter) {
    try {
      const from =
        process.env.EMAIL_FROM ||
        process.env.SMTP_USER ||
        process.env.GMAIL_USER ||
        "Smart Library <onboarding@super-trader.xyz>";

      const info = await transporter.sendMail({
        from,
        to: toEmail,
        subject,
        html: htmlContent,
      });
      console.log(`[Email Service] SMTP email dispatched successfully to ${toEmail}. Message ID: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error("[Email Service] SMTP dispatch error:", error);
    }
  }

  // 2. Try Resend API
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
        subject,
        html: htmlContent,
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

  console.warn(`[Email Service] ⚠️ Email delivery skipped for ${toEmail}. (Subject: ${subject})`);
};

// ─── 1. Book Borrow Confirmation Email ───────────────────────────────────────

export interface SendLoanConfirmationOptions {
  toEmail: string;
  studentName: string;
  bookTitle: string;
  bookAuthor: string;
  barcodeOrIsbn?: string;
  block: string;
  shelfNumber: string;
  borrowDateStr: string;
  dueDateStr: string;
  fineRatePerDay?: number;
}

export const sendLoanConfirmationEmail = async (opts: SendLoanConfirmationOptions) => {
  const {
    toEmail,
    studentName,
    bookTitle,
    bookAuthor,
    barcodeOrIsbn,
    block,
    shelfNumber,
    borrowDateStr,
    dueDateStr,
    fineRatePerDay = 5,
  } = opts;

  const subject = `📘 Book Borrowed: "${bookTitle}" — Due ${dueDateStr}`;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px; color: #1e293b; }
.card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
.header { background: #0f172a; color: #ffffff; padding: 28px; text-align: center; }
.header h1 { margin: 0; font-size: 20px; font-weight: 800; }
.header p { margin: 6px 0 0 0; font-size: 12px; color: #94a3b8; }
.body { padding: 28px; }
.book-box { background: #f1f5f9; border-radius: 14px; padding: 18px; margin-bottom: 20px; border-left: 4px solid #4f46e5; }
.book-title { font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
.book-author { font-size: 13px; color: #64748b; font-weight: 600; }
.grid { display: table; width: 100%; margin-bottom: 20px; }
.col { display: table-cell; width: 50%; padding: 6px; }
.meta-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8; }
.meta-val { font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px; }
.due-badge { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; border-radius: 12px; padding: 12px; text-align: center; font-weight: 800; font-size: 14px; margin-bottom: 20px; }
.notice { background: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 14px; font-size: 12px; color: #92400e; line-height: 1.5; margin-bottom: 20px; }
.btn { display: block; text-align: center; background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 800; }
.footer { padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; background: #f8f9fa; border-top: 1px solid #f1f5f9; }
</style></head>
<body>
<div class="card">
  <div class="header">
    <h1>Library Book Issued</h1>
    <p>Smart Library Circulation Desk</p>
  </div>
  <div class="body">
    <p style="margin-top:0;font-size:14px;">Hello <strong>${studentName}</strong>,</p>
    <p style="font-size:13px;color:#475569;">You have successfully checked out the following book from the university library:</p>
    
    <div class="book-box">
      <div class="book-title">${bookTitle}</div>
      <div class="book-author">By ${bookAuthor}</div>
      ${barcodeOrIsbn ? `<div style="font-size:11px;color:#6366f1;font-weight:700;margin-top:6px;font-family:monospace;">Barcode / ISBN: ${barcodeOrIsbn}</div>` : ""}
    </div>

    <div class="due-badge">
      📅 Return Due Date: ${dueDateStr}
    </div>

    <div class="grid">
      <div class="col">
        <div class="meta-label">Borrow Date</div>
        <div class="meta-val">${borrowDateStr}</div>
      </div>
      <div class="col">
        <div class="meta-label">Shelf Location</div>
        <div class="meta-val">${block} • ${shelfNumber}</div>
      </div>
    </div>

    <div class="notice">
      ⚠️ <strong>Circulation Notice:</strong> The standard loan duration is 10 days. Please return the book on or before the due date. An overdue fee of <strong>${fineRatePerDay} Tk / day</strong> applies if returned late. You may renew online up to 3 times if eligible.
    </div>

    <a href="${frontendUrl}/loans" class="btn">View My Loans & Renewals</a>
  </div>
  <div class="footer">Smart Library Management System • Automated Notice</div>
</div>
</body></html>
  `;

  return sendHtmlEmail(toEmail, subject, htmlContent);
};

// ─── 2. Loan Due Date Reminder (2-Day Warning) ───────────────────────────────

export interface SendDueDateWarningOptions {
  toEmail: string;
  studentName: string;
  bookTitle: string;
  dueDateStr: string;
  daysRemaining?: number;
  fineRatePerDay?: number;
}

export const sendLoanDueDateWarningEmail = async (opts: SendDueDateWarningOptions) => {
  const {
    toEmail,
    studentName,
    bookTitle,
    dueDateStr,
    daysRemaining = 2,
    fineRatePerDay = 5,
  } = opts;

  const subject = `⚠️ Reminder: "${bookTitle}" is Due in ${daysRemaining} Days`;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px; color: #1e293b; }
.card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #fed7aa; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
.header { background: #ea580c; color: #ffffff; padding: 28px; text-align: center; }
.header h1 { margin: 0; font-size: 20px; font-weight: 800; }
.body { padding: 28px; }
.warn-box { background: #fff7ed; border: 1px solid #ffedd5; border-radius: 14px; padding: 18px; margin-bottom: 20px; text-align: center; }
.due-text { font-size: 16px; font-weight: 800; color: #c2410c; }
.btn { display: block; text-align: center; background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 800; }
.footer { padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; background: #f8f9fa; border-top: 1px solid #f1f5f9; }
</style></head>
<body>
<div class="card">
  <div class="header">
    <h1>Due Date Warning</h1>
    <p style="margin:4px 0 0 0;font-size:12px;color:#ffedd5;">Your book loan expires in ${daysRemaining} days</p>
  </div>
  <div class="body">
    <p style="margin-top:0;font-size:14px;">Hello <strong>${studentName}</strong>,</p>
    <p style="font-size:13px;color:#475569;">This is a friendly reminder that your borrowed library book is due soon:</p>
    
    <div class="warn-box">
      <div style="font-size:15px;font-weight:800;color:#0f172a;margin-bottom:6px;">"${bookTitle}"</div>
      <div class="due-text">Due Date: ${dueDateStr}</div>
    </div>

    <p style="font-size:12px;color:#64748b;line-height:1.5;">
      Please return the book to the library circulation desk by <strong>${dueDateStr}</strong> to avoid late fines (<strong>${fineRatePerDay} Tk / day</strong>). If you still need the book, you can extend your loan online through the student portal.
    </p>

    <div style="margin-top:20px;">
      <a href="${frontendUrl}/loans" class="btn">Renew Loan or View Status</a>
    </div>
  </div>
  <div class="footer">Smart Library Management System • Automated 48-Hour Reminder</div>
</div>
</body></html>
  `;

  return sendHtmlEmail(toEmail, subject, htmlContent);
};

// ─── 3. Loan Overdue Alert Email ─────────────────────────────────────────────

export interface SendOverdueAlertOptions {
  toEmail: string;
  studentName: string;
  bookTitle: string;
  dueDateStr: string;
  daysOverdue: number;
  fineAmount: number;
  fineRatePerDay?: number;
}

export const sendLoanOverdueAlertEmail = async (opts: SendOverdueAlertOptions) => {
  const {
    toEmail,
    studentName,
    bookTitle,
    dueDateStr,
    daysOverdue,
    fineAmount,
    fineRatePerDay = 5,
  } = opts;

  const subject = `🚨 Overdue Notice: "${bookTitle}" — ${fineAmount} BDT Fine Accrued`;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px; color: #1e293b; }
.card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #fecdd3; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
.header { background: #be123c; color: #ffffff; padding: 28px; text-align: center; }
.header h1 { margin: 0; font-size: 20px; font-weight: 800; }
.body { padding: 28px; }
.alert-box { background: #fff1f2; border: 1px solid #ffe4e6; border-radius: 14px; padding: 18px; margin-bottom: 20px; text-align: center; }
.fine-text { font-size: 22px; font-weight: 900; color: #be123c; margin-top: 6px; }
.inst-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; font-size: 12px; color: #334155; line-height: 1.6; margin-bottom: 20px; }
.btn { display: block; text-align: center; background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 800; }
.footer { padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; background: #f8f9fa; border-top: 1px solid #f1f5f9; }
</style></head>
<body>
<div class="card">
  <div class="header">
    <h1>Overdue Book & Fine Alert</h1>
    <p style="margin:4px 0 0 0;font-size:12px;color:#fecdd3;">Borrowing privileges are currently suspended</p>
  </div>
  <div class="body">
    <p style="margin-top:0;font-size:14px;">Dear <strong>${studentName}</strong>,</p>
    <p style="font-size:13px;color:#475569;">The following book checked out to your account is now <strong>${daysOverdue} day(s) overdue</strong>:</p>
    
    <div class="alert-box">
      <div style="font-size:15px;font-weight:800;color:#0f172a;">"${bookTitle}"</div>
      <div style="font-size:12px;color:#64748b;margin-top:2px;">Original Due Date: ${dueDateStr}</div>
      <div class="fine-text">Accumulated Fine: ${fineAmount} BDT</div>
      <div style="font-size:11px;color:#9f1239;margin-top:2px;">(Calculated at ${fineRatePerDay} Tk / day overdue)</div>
    </div>

    <div class="inst-box">
      <strong>⚠️ What to do next:</strong>
      <ol style="margin:8px 0 0 0;padding-left:18px;">
        <li>Bring the physical book to the library circulation desk immediately.</li>
        <li>Pay the outstanding fine in <strong>Cash</strong> directly at the counter, OR deposit via <strong>Bank Chalan</strong> and submit the chalan receipt number.</li>
        <li>Once the librarian marks your fine as <strong>Paid</strong>, your borrowing access will be fully restored.</li>
      </ol>
    </div>

    <a href="${frontendUrl}/loans" class="btn">View Fine Breakdown in Portal</a>
  </div>
  <div class="footer">Smart Library Management System • Circulation Enforcer</div>
</div>
</body></html>
  `;

  return sendHtmlEmail(toEmail, subject, htmlContent);
};

// ─── 4. Fine Payment Receipt Email ──────────────────────────────────────────

export interface SendFinePaidReceiptOptions {
  toEmail: string;
  studentName: string;
  bookTitle: string;
  fineAmount: number;
  paymentMethod: string;
  chalanNumber?: string;
  paidDateStr: string;
}

export const sendFinePaidReceiptEmail = async (opts: SendFinePaidReceiptOptions) => {
  const {
    toEmail,
    studentName,
    bookTitle,
    fineAmount,
    paymentMethod,
    chalanNumber,
    paidDateStr,
  } = opts;

  const subject = `✅ Fine Cleared: ${fineAmount} BDT Receipt — Borrowing Restored`;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px; color: #1e293b; }
.card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #bbf7d0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
.header { background: #059669; color: #ffffff; padding: 28px; text-align: center; }
.header h1 { margin: 0; font-size: 20px; font-weight: 800; }
.body { padding: 28px; }
.receipt-box { background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 14px; padding: 18px; margin-bottom: 20px; text-align: center; }
.amount-text { font-size: 24px; font-weight: 900; color: #059669; }
.btn { display: block; text-align: center; background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 800; }
.footer { padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; background: #f8f9fa; border-top: 1px solid #f1f5f9; }
</style></head>
<body>
<div class="card">
  <div class="header">
    <h1>Fine Payment Receipt</h1>
    <p style="margin:4px 0 0 0;font-size:12px;color:#d1fae5;">Account Status: Clear & In Good Standing</p>
  </div>
  <div class="body">
    <p style="margin-top:0;font-size:14px;">Hello <strong>${studentName}</strong>,</p>
    <p style="font-size:13px;color:#475569;">Your overdue library fine has been successfully settled and recorded:</p>
    
    <div class="receipt-box">
      <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;">Amount Paid</div>
      <div class="amount-text">${fineAmount} BDT</div>
      <div style="font-size:12px;color:#047857;margin-top:4px;font-weight:700;">Method: ${paymentMethod.toUpperCase()} ${chalanNumber ? `• Chalan: ${chalanNumber}` : ""}</div>
    </div>

    <div style="font-size:12px;color:#475569;margin-bottom:20px;line-height:1.6;">
      <strong>Book:</strong> "${bookTitle}"<br/>
      <strong>Paid Date:</strong> ${paidDateStr}<br/>
      <strong>Status:</strong> All dues cleared. Your borrowing quota has been restored.
    </div>

    <a href="${frontendUrl}/books" class="btn">Browse & Borrow New Books</a>
  </div>
  <div class="footer">Smart Library Management System • Official Receipt</div>
</div>
</body></html>
  `;

  return sendHtmlEmail(toEmail, subject, htmlContent);
};

// ─── 5. Seat No-Show Auto-Cancellation Email ─────────────────────────────────

export interface SendSeatNoShowCancellationOptions {
  toEmail: string;
  studentName: string;
  seatNumber: string;
  zoneName: string;
  dateStr: string;
  slotName: string;
  timeRange?: string;
  graceMinutes?: number;
}

export const sendSeatNoShowCancellationEmail = async (opts: SendSeatNoShowCancellationOptions) => {
  const {
    toEmail,
    studentName,
    seatNumber,
    zoneName,
    dateStr,
    slotName,
    timeRange = "",
    graceMinutes = 15,
  } = opts;

  const slotDisplay = slotName.charAt(0).toUpperCase() + slotName.slice(1).toLowerCase();
  const subject = `⚠️ Reservation Released: Seat ${seatNumber} (${zoneName}) — Check-in Window Expired`;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px; color: #1e293b; }
.card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #fed7aa; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
.header { background: #ea580c; color: #ffffff; padding: 26px; text-align: center; }
.header h1 { margin: 0; font-size: 20px; font-weight: 800; }
.header p { margin: 6px 0 0 0; font-size: 12px; color: #ffedd5; }
.body { padding: 28px; }
.box { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 14px; padding: 18px; margin-bottom: 20px; }
.grid { display: table; width: 100%; margin-bottom: 16px; }
.col { display: table-cell; width: 50%; padding: 6px; }
.meta-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8; }
.meta-val { font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px; }
.notice { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 14px; font-size: 12px; color: #991b1b; line-height: 1.5; margin-bottom: 20px; }
.btn { display: block; text-align: center; background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 800; }
.footer { padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; background: #f8f9fa; border-top: 1px solid #f1f5f9; }
</style></head>
<body>
<div class="card">
  <div class="header">
    <h1>Seat Reservation Cancelled</h1>
    <p>Check-In Grace Period (${graceMinutes} min) Expired</p>
  </div>
  <div class="body">
    <p style="margin-top:0;font-size:14px;">Hello <strong>${studentName}</strong>,</p>
    <p style="font-size:13px;color:#475569;line-height:1.5;">
      Your seat reservation was automatically cancelled and released because no QR check-in scan was recorded within the <strong>${graceMinutes}-minute grace period</strong> of the session start.
    </p>
    
    <div class="box">
      <div class="grid">
        <div class="col">
          <div class="meta-label">Seat Number</div>
          <div class="meta-val">${seatNumber}</div>
        </div>
        <div class="col">
          <div class="meta-label">Study Zone</div>
          <div class="meta-val">${zoneName}</div>
        </div>
      </div>
      <div class="grid">
        <div class="col">
          <div class="meta-label">Date</div>
          <div class="meta-val">${dateStr}</div>
        </div>
        <div class="col">
          <div class="meta-label">Time Slot</div>
          <div class="meta-val">${slotDisplay} ${timeRange ? `<span style="font-size:11px;color:#64748b;font-weight:400;">(${timeRange})</span>` : ""}</div>
        </div>
      </div>
    </div>

    <div class="notice">
      ℹ️ <strong>Why did this happen?</strong> To ensure fair seat availability for all university students, unclaimed seats are automatically released after ${graceMinutes} minutes. If you still need a workspace, you can browse available seats and make a new reservation.
    </div>

    <a href="${frontendUrl}/zones" class="btn">Reserve Another Seat</a>
  </div>
  <div class="footer">Smart Library Management System • Automated Policy Enforcer</div>
</div>
</body></html>
  `;

  return sendHtmlEmail(toEmail, subject, htmlContent);
};

// ─── 6. Booking Cancelled by Admin / Librarian Email ─────────────────────────

export interface SendBookingCancelledByAdminOptions {
  toEmail: string;
  studentName: string;
  seatNumber: string;
  zoneName: string;
  dateStr: string;
  slotName: string;
  timeRange?: string;
  cancelReason?: string;
}

export const sendBookingCancelledByAdminEmail = async (opts: SendBookingCancelledByAdminOptions) => {
  const {
    toEmail,
    studentName,
    seatNumber,
    zoneName,
    dateStr,
    slotName,
    timeRange = "",
    cancelReason = "Cancelled by Library Administration",
  } = opts;

  const slotDisplay = slotName.charAt(0).toUpperCase() + slotName.slice(1).toLowerCase();
  const subject = `ℹ️ Notice: Seat Reservation Cancelled (Seat ${seatNumber} • ${zoneName})`;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px; color: #1e293b; }
.card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
.header { background: #0f172a; color: #ffffff; padding: 26px; text-align: center; }
.header h1 { margin: 0; font-size: 20px; font-weight: 800; }
.header p { margin: 6px 0 0 0; font-size: 12px; color: #94a3b8; }
.body { padding: 28px; }
.box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin-bottom: 20px; }
.grid { display: table; width: 100%; margin-bottom: 16px; }
.col { display: table-cell; width: 50%; padding: 6px; }
.meta-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8; }
.meta-val { font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px; }
.reason-box { background: #fff1f2; border: 1px solid #ffe4e6; border-radius: 12px; padding: 14px; font-size: 13px; color: #9f1239; margin-bottom: 20px; font-weight: 600; }
.btn { display: block; text-align: center; background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 800; }
.footer { padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; background: #f8f9fa; border-top: 1px solid #f1f5f9; }
</style></head>
<body>
<div class="card">
  <div class="header">
    <h1>Reservation Cancelled</h1>
    <p>Smart Library Administration Desk</p>
  </div>
  <div class="body">
    <p style="margin-top:0;font-size:14px;">Hello <strong>${studentName}</strong>,</p>
    <p style="font-size:13px;color:#475569;line-height:1.5;">
      Your library seat reservation has been cancelled by the library administrative desk.
    </p>
    
    <div class="box">
      <div class="grid">
        <div class="col">
          <div class="meta-label">Seat Number</div>
          <div class="meta-val">${seatNumber}</div>
        </div>
        <div class="col">
          <div class="meta-label">Study Zone</div>
          <div class="meta-val">${zoneName}</div>
        </div>
      </div>
      <div class="grid">
        <div class="col">
          <div class="meta-label">Date</div>
          <div class="meta-val">${dateStr}</div>
        </div>
        <div class="col">
          <div class="meta-label">Time Slot</div>
          <div class="meta-val">${slotDisplay} ${timeRange ? `<span style="font-size:11px;color:#64748b;font-weight:400;">(${timeRange})</span>` : ""}</div>
        </div>
      </div>
    </div>

    <div class="reason-box">
      📋 <strong>Cancellation Reason:</strong> ${cancelReason}
    </div>

    <p style="font-size:12px;color:#64748b;line-height:1.5;margin-bottom:20px;">
      If you require a study seat, please visit the portal to view live zone availability and reserve another open seat.
    </p>

    <a href="${frontendUrl}/zones" class="btn">Browse Available Study Zones</a>
  </div>
  <div class="footer">Smart Library Management System • Administrative Notification</div>
</div>
</body></html>
  `;

  return sendHtmlEmail(toEmail, subject, htmlContent);
};

// ─── 7. Seat Slot 10-Minute Ending Warning Email ─────────────────────────────

export interface SendSeatSlotEndingWarningOptions {
  toEmail: string;
  studentName: string;
  seatNumber: string;
  zoneName: string;
  dateStr: string;
  slotName: string;
  slotEndTimeStr?: string;
  minutesRemaining?: number;
}

export const sendSeatSlotEndingWarningEmail = async (opts: SendSeatSlotEndingWarningOptions) => {
  const {
    toEmail,
    studentName,
    seatNumber,
    zoneName,
    dateStr,
    slotName,
    slotEndTimeStr = "",
    minutesRemaining = 10,
  } = opts;

  const slotDisplay = slotName.charAt(0).toUpperCase() + slotName.slice(1).toLowerCase();
  const subject = `⏰ Warning: Your Seat Reservation Ends in ${minutesRemaining} Minutes (Seat ${seatNumber})`;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px; color: #1e293b; }
.card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #fef08a; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
.header { background: #ca8a04; color: #ffffff; padding: 26px; text-align: center; }
.header h1 { margin: 0; font-size: 20px; font-weight: 800; }
.header p { margin: 6px 0 0 0; font-size: 12px; color: #fef9c3; }
.body { padding: 28px; }
.timer-box { background: #fefce8; border: 1px solid #fef08a; border-radius: 14px; padding: 18px; margin-bottom: 20px; text-align: center; }
.timer-text { font-size: 22px; font-weight: 900; color: #854d0e; }
.box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin-bottom: 20px; }
.grid { display: table; width: 100%; margin-bottom: 16px; }
.col { display: table-cell; width: 50%; padding: 6px; }
.meta-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8; }
.meta-val { font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px; }
.instructions { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px; font-size: 12px; color: #166534; line-height: 1.5; margin-bottom: 20px; }
.btn { display: block; text-align: center; background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 800; }
.footer { padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; background: #f8f9fa; border-top: 1px solid #f1f5f9; }
</style></head>
<body>
<div class="card">
  <div class="header">
    <h1>Session Ending Soon</h1>
    <p>Time Slot Expiration Warning (${minutesRemaining} Minutes Remaining)</p>
  </div>
  <div class="body">
    <p style="margin-top:0;font-size:14px;">Hello <strong>${studentName}</strong>,</p>
    <p style="font-size:13px;color:#475569;line-height:1.5;">
      This is an automated reminder that your reserved library seat session for today is ending in <strong>${minutesRemaining} minutes</strong>${slotEndTimeStr ? ` at <strong>${slotEndTimeStr}</strong>` : ""}.
    </p>
    
    <div class="timer-box">
      <div style="font-size:11px;font-weight:800;color:#a16207;text-transform:uppercase;letter-spacing:0.5px;">Session Expiring</div>
      <div class="timer-text">~${minutesRemaining} Minutes Left</div>
      ${slotEndTimeStr ? `<div style="font-size:12px;color:#854d0e;margin-top:4px;font-weight:600;">Slot Ends At: ${slotEndTimeStr}</div>` : ""}
    </div>

    <div class="box">
      <div class="grid">
        <div class="col">
          <div class="meta-label">Seat Number</div>
          <div class="meta-val">${seatNumber}</div>
        </div>
        <div class="col">
          <div class="meta-label">Study Zone</div>
          <div class="meta-val">${zoneName}</div>
        </div>
      </div>
      <div class="grid">
        <div class="col">
          <div class="meta-label">Date</div>
          <div class="meta-val">${dateStr}</div>
        </div>
        <div class="col">
          <div class="meta-label">Time Slot</div>
          <div class="meta-val">${slotDisplay} Slot</div>
        </div>
      </div>
    </div>

    <div class="instructions">
      ✅ <strong>Check-Out & Release Reminder:</strong>
      <ul style="margin:6px 0 0 0;padding-left:18px;">
        <li>Please start packing your belongings so the desk is clean.</li>
        <li>Scan your pass at the exit scanner or your seat will be automatically released when the slot finishes so the next student can occupy it.</li>
      </ul>
    </div>

    <a href="${frontendUrl}/bookings" class="btn">View My Reservation Pass</a>
  </div>
  <div class="footer">Smart Library Management System • Slot Expiration Monitor</div>
</div>
</body></html>
  `;

  return sendHtmlEmail(toEmail, subject, htmlContent);
};

export const emailService = {
  sendBookingConfirmationEmail,
  sendLoanConfirmationEmail,
  sendLoanDueDateWarningEmail,
  sendLoanOverdueAlertEmail,
  sendFinePaidReceiptEmail,
  sendSeatNoShowCancellationEmail,
  sendBookingCancelledByAdminEmail,
  sendSeatSlotEndingWarningEmail,
};

