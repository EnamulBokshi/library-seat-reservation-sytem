import { Resend } from "resend";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// ─── Slot Time Ranges ─────────────────────────────────────────────────────────

const SLOT_TIME_RANGES: Record<string, string> = {
  morning: "08:00 AM – 12:00 PM",
  noon: "12:00 PM – 02:00 PM",
  afternoon: "02:00 PM – 06:00 PM",
  evening: "06:00 PM – 09:00 PM",
};

// ─── Nodemailer Transporter Setup ─────────────────────────────────────────────

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

// ─── Generic HTML Email Dispatcher ────────────────────────────────────────────

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
        "Daffodil International University Library <onboarding@super-trader.xyz>";

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
      "Daffodil International University Library <onboarding@resend.dev>";

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

// ─── Flat UI Google Mail-Style Base Shell ─────────────────────────────────────

interface FlatEmailShellOptions {
  title?: string;
  preheader?: string;
  content: string;
}

const buildFlatEmailShell = ({ title, preheader, content }: FlatEmailShellOptions): string => {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${title ? `<title>${title}</title>` : ""}
  <style type="text/css">
    body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #374151; -webkit-font-smoothing: antialiased; }
  </style>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #374151;">
  ${preheader ? `<div style="display: none; font-size: 1px; color: #ffffff; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">${preheader}</div>` : ""}
  <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding: 0;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 580px; text-align: left;">
          <!-- Top Flat Header -->
          <tr>
            <td style="padding-bottom: 20px; border-bottom: 1px solid #e5e7eb;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="left" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 700; color: #111827; letter-spacing: -0.2px;">
                    Daffodil International University
                    <span style="font-size: 13px; font-weight: 400; color: #6b7280;"> &middot; Smart Library</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td style="padding-top: 26px; padding-bottom: 30px;">
              ${content}
            </td>
          </tr>

          <!-- Flat Institutional Footer -->
          <tr>
            <td style="padding-top: 20px; border-top: 1px solid #e5e7eb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #6b7280;">
              <p style="margin: 0 0 4px 0; font-weight: 600; color: #374151;">Library Admin Panel &middot; Daffodil International University</p>
              <p style="margin: 0; color: #9ca3af;">This is an automated administrative notification. Please do not reply directly to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

// ─── 1. Seat Reservation Confirmation Email ───────────────────────────────────

export interface SendBookingEmailOptions {
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
    "Daffodil International University Library <onboarding@resend.dev>";

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const base64Data = qrCodeBase64.includes(";base64,")
    ? qrCodeBase64.split(";base64,").pop()!
    : qrCodeBase64;

  const normalizedSlot = slotName.toLowerCase();
  const timeRange = SLOT_TIME_RANGES[normalizedSlot] || "";
  const slotDisplay = slotName.charAt(0).toUpperCase() + slotName.slice(1).toLowerCase();
  const qrDownloadUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(qrToken)}&download=1&format=png`;
  const qrDisplayUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrToken)}&format=png&margin=4`;

  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #111827; line-height: 1.3;">
      Seat Reservation Pass — ${seatNumber}
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      Hello <strong>${studentName}</strong>, your seat reservation has been confirmed. Below are your session details and digital entrance pass.
    </p>

    <!-- Details Table (Flat UI) -->
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; margin: 20px 0;">
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; width: 35%; border-bottom: 1px solid #f3f4f6;">Seat Number</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 700; color: #111827; border-bottom: 1px solid #f3f4f6;">${seatNumber}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Study Zone</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 600; color: #111827; border-bottom: 1px solid #f3f4f6;">${zoneName}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Date</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 600; color: #111827; border-bottom: 1px solid #f3f4f6;">${dateStr}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Time Slot</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 600; color: #111827; border-bottom: 1px solid #f3f4f6;">${slotDisplay} ${timeRange ? `(${timeRange})` : ""}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280;">Status</td>
        <td style="padding: 10px 0; font-size: 13px; font-weight: 700; color: #16a34a;">Confirmed & Active</td>
      </tr>
    </table>

    <!-- Digital QR Pass Section -->
    <div style="margin: 24px 0; text-align: center; border: 1px solid #e5e7eb; padding: 20px; background-color: #fcfcfc;">
      <p style="margin: 0 0 12px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px;">
        Entrance QR Code Pass
      </p>
      <div style="display: inline-block; padding: 8px; background: #ffffff; border: 1px solid #e5e7eb;">
        <img src="${qrDisplayUrl}" alt="Seat Pass QR Code" width="180" height="180" style="display: block; width: 180px; height: 180px;" />
      </div>
      <p style="margin: 10px 0 16px 0; font-family: monospace; font-size: 11px; color: #6b7280;">
        Token: ${qrToken}
      </p>
      <div style="display: inline-block;">
        <a href="${qrDownloadUrl}" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 12px; font-weight: 600; padding: 9px 18px; border-radius: 4px; text-decoration: none; margin-right: 8px;">
          Download QR Pass
        </a>
        <a href="${frontendUrl}/dashboard/bookings" target="_blank" style="display: inline-block; background-color: #ffffff; color: #0f172a; font-size: 12px; font-weight: 600; padding: 8px 16px; border-radius: 4px; border: 1px solid #cbd5e1; text-decoration: none;">
          View My Bookings
        </a>
      </div>
    </div>

    <!-- Instructions / Guidelines -->
    <div style="background-color: #f9fafb; border-left: 3px solid #2563eb; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #374151; line-height: 1.5;">
      <strong>Entrance Guidelines:</strong> Present this QR pass at the entrance terminal scanner to check in. Check-in is required within the designated grace period to avoid cancellation.
    </div>
  `;

  const htmlContent = buildFlatEmailShell({
    title: `Seat Reservation Pass — ${seatNumber}`,
    preheader: `Your reservation for Seat ${seatNumber} (${zoneName}) on ${dateStr} is confirmed.`,
    content,
  });

  // 1. Try Nodemailer with attachment
  const transporter = createNodemailerTransporter();
  const attachmentFilename = `seat-pass-${seatNumber.toLowerCase().replace(/[^a-z0-9]/g, "-")}.png`;
  const attachmentBuffer = Buffer.from(base64Data, "base64");

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: `Seat Reservation Pass — Seat ${seatNumber} (${zoneName})`,
        html: htmlContent,
        attachments: [
          {
            filename: attachmentFilename,
            content: attachmentBuffer,
            contentType: "image/png",
          },
        ],
      });
      console.log(`[Email Service] Confirmation dispatched via SMTP to ${toEmail}. Message ID: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error("[Email Service] SMTP confirmation error:", error);
    }
  }

  // 2. Try Resend API with attachment
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    const resendFrom =
      process.env.RESEND_FROM_EMAIL ||
      process.env.EMAIL_FROM ||
      "Daffodil International University Library <onboarding@resend.dev>";

    try {
      const resend = new Resend(resendApiKey);
      const response = await resend.emails.send({
        from: resendFrom,
        to: [toEmail],
        subject: `Seat Reservation Pass — Seat ${seatNumber} (${zoneName})`,
        html: htmlContent,
        attachments: [
          {
            filename: attachmentFilename,
            content: attachmentBuffer,
          },
        ],
      });
      return response;
    } catch (error) {
      console.error("[Email Service] Resend confirmation error:", error);
    }
  }
};

// ─── 2. Book Loan Confirmation Email ──────────────────────────────────────────

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

  const subject = `Book Borrowed: "${bookTitle}" — Due ${dueDateStr}`;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #111827; line-height: 1.3;">
      Library Book Borrowed
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      Hello <strong>${studentName}</strong>, the following book has been checked out to your library account:
    </p>

    <!-- Book Info Flat Table -->
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; margin: 20px 0;">
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; width: 35%; border-bottom: 1px solid #f3f4f6;">Title</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 700; color: #111827; border-bottom: 1px solid #f3f4f6;">${bookTitle}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Author</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 600; color: #111827; border-bottom: 1px solid #f3f4f6;">${bookAuthor}</td>
      </tr>
      ${barcodeOrIsbn ? `
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Identifier</td>
        <td style="padding: 10px 0; font-family: monospace; font-size: 13px; color: #111827; border-bottom: 1px solid #f3f4f6;">${barcodeOrIsbn}</td>
      </tr>` : ""}
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Shelf Location</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 600; color: #111827; border-bottom: 1px solid #f3f4f6;">${block} &middot; ${shelfNumber}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Borrow Date</td>
        <td style="padding: 10px 0; font-size: 14px; color: #111827; border-bottom: 1px solid #f3f4f6;">${borrowDateStr}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280;">Return Due Date</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 700; color: #1d4ed8;">${dueDateStr}</td>
      </tr>
    </table>

    <div style="background-color: #f9fafb; border-left: 3px solid #2563eb; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #374151; line-height: 1.5;">
      <strong>Circulation Policy:</strong> Please return or renew this book on or before <strong>${dueDateStr}</strong>. Overdue loans accrue fines at <strong>${fineRatePerDay} BDT/day</strong>.
    </div>

    <p style="margin: 20px 0 0 0;">
      <a href="${frontendUrl}/dashboard/loans" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
        View My Active Loans
      </a>
    </p>
  `;

  const htmlContent = buildFlatEmailShell({
    title: subject,
    preheader: `You borrowed "${bookTitle}". Due date: ${dueDateStr}.`,
    content,
  });

  return sendHtmlEmail(toEmail, subject, htmlContent);
};

// ─── 3. Loan Due Date Warning Email ───────────────────────────────────────────

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

  const subject = `Reminder: "${bookTitle}" is Due in ${daysRemaining} Days`;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #111827; line-height: 1.3;">
      Book Due Date Reminder
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      Hello <strong>${studentName}</strong>, this is an automated reminder that your borrowed book is due in <strong>${daysRemaining} day(s)</strong>:
    </p>

    <div style="background-color: #fffbeb; border-left: 3px solid #d97706; padding: 14px 18px; margin: 20px 0;">
      <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #92400e;">"${bookTitle}"</p>
      <p style="margin: 0; font-size: 13px; color: #b45309; font-weight: 600;">Return Due Date: ${dueDateStr}</p>
    </div>

    <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.6; color: #4b5563;">
      Please return the book to the circulation desk by <strong>${dueDateStr}</strong> to avoid late fines (${fineRatePerDay} BDT/day). If you need more time and are eligible, you can extend your loan online.
    </p>

    <p style="margin: 0 0 0 0;">
      <a href="${frontendUrl}/dashboard/loans" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
        Renew Loan Online
      </a>
    </p>
  `;

  const htmlContent = buildFlatEmailShell({
    title: subject,
    preheader: `Reminder: "${bookTitle}" is due on ${dueDateStr}.`,
    content,
  });

  return sendHtmlEmail(toEmail, subject, htmlContent);
};

// ─── 4. Loan Overdue Alert Email ──────────────────────────────────────────────

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

  const subject = `Overdue Notice: "${bookTitle}" — ${fineAmount} BDT Fine Accrued`;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #b91c1c; line-height: 1.3;">
      Notice: Overdue Book Loan
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      Hello <strong>${studentName}</strong>, your borrowed library book is currently past its return deadline.
    </p>

    <div style="background-color: #fef2f2; border-left: 3px solid #dc2626; padding: 14px 18px; margin: 20px 0;">
      <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #991b1b;">"${bookTitle}"</p>
      <p style="margin: 0 0 4px 0; font-size: 13px; color: #b91c1c;">Due Date: ${dueDateStr} (${daysOverdue} day(s) overdue)</p>
      <p style="margin: 0; font-size: 14px; font-weight: 700; color: #b91c1c;">Current Accrued Fine: ${fineAmount} BDT</p>
    </div>

    <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.6; color: #4b5563;">
      Daily fines accumulate at <strong>${fineRatePerDay} BDT/day</strong> until the book is received at the circulation desk. Outstanding fines exceeding the library threshold will lock your seat booking and borrowing privileges.
    </p>

    <p style="margin: 0 0 0 0;">
      <a href="${frontendUrl}/dashboard/fines" style="display: inline-block; background-color: #b91c1c; color: #ffffff; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
        View Fine Statement
      </a>
    </p>
  `;

  const htmlContent = buildFlatEmailShell({
    title: subject,
    preheader: `Overdue Notice for "${bookTitle}". Current fine: ${fineAmount} BDT.`,
    content,
  });

  return sendHtmlEmail(toEmail, subject, htmlContent);
};

// ─── 5. Loan Fine Payment Receipt ─────────────────────────────────────────────

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

  const subject = `Payment Receipt: ${fineAmount} BDT Settled — Library Fine`;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #111827; line-height: 1.3;">
      Official Payment Receipt
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      Hello <strong>${studentName}</strong>, your overdue fine payment has been successfully recorded by the library circulation desk.
    </p>

    <!-- Flat Receipt Table -->
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; margin: 20px 0;">
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; width: 35%; border-bottom: 1px solid #f3f4f6;">Item</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 600; color: #111827; border-bottom: 1px solid #f3f4f6;">"${bookTitle}" (Overdue Fine)</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Payment Date</td>
        <td style="padding: 10px 0; font-size: 14px; color: #111827; border-bottom: 1px solid #f3f4f6;">${paidDateStr}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Payment Method</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 600; color: #111827; border-bottom: 1px solid #f3f4f6; text-transform: capitalize;">${paymentMethod} ${chalanNumber ? `(Chalan #${chalanNumber})` : ""}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Amount Settled</td>
        <td style="padding: 10px 0; font-size: 16px; font-weight: 700; color: #16a34a; border-bottom: 1px solid #f3f4f6;">${fineAmount} BDT</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280;">Account Status</td>
        <td style="padding: 10px 0; font-size: 13px; font-weight: 700; color: #16a34a;">Cleared & Active</td>
      </tr>
    </table>

    <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.6; color: #4b5563;">
      Your borrowing privileges are fully restored. You can browse catalogue titles or check out books at any time.
    </p>

    <p style="margin: 0 0 0 0;">
      <a href="${frontendUrl}/books" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
        Browse Library Books
      </a>
    </p>
  `;

  const htmlContent = buildFlatEmailShell({
    title: subject,
    preheader: `Official receipt: ${fineAmount} BDT cleared for "${bookTitle}".`,
    content,
  });

  return sendHtmlEmail(toEmail, subject, htmlContent);
};

// ─── 6. Seat No-Show Cancellation Email ───────────────────────────────────────

export interface SendSeatNoShowCancellationOptions {
  toEmail: string;
  studentName: string;
  seatNumber: string;
  zoneName: string;
  dateStr: string;
  slotName: string;
  timeRange?: string;
  graceMinutes?: number;
  fineAmount?: number;
  totalUnpaid?: number;
  maxUnpaidFineLimit?: number;
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
    fineAmount = 50,
    totalUnpaid = 50,
    maxUnpaidFineLimit = 200,
  } = opts;

  const subject = `Notice: Reservation Cancelled (No-Show) — Seat ${seatNumber}`;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const slotDisplay = slotName.charAt(0).toUpperCase() + slotName.slice(1).toLowerCase();

  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #b91c1c; line-height: 1.3;">
      Seat Reservation Cancelled — No-Show
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      Hello <strong>${studentName}</strong>, your reservation for <strong>Seat ${seatNumber}</strong> was automatically released because check-in was not recorded within the ${graceMinutes}-minute window.
    </p>

    <!-- Flat Details Table -->
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; margin: 20px 0;">
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; width: 35%; border-bottom: 1px solid #f3f4f6;">Seat</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 700; color: #111827; border-bottom: 1px solid #f3f4f6;">${seatNumber} (${zoneName})</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Session</td>
        <td style="padding: 10px 0; font-size: 14px; color: #111827; border-bottom: 1px solid #f3f4f6;">${dateStr} &middot; ${slotDisplay} ${timeRange ? `(${timeRange})` : ""}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">No-Show Penalty</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 700; color: #b91c1c; border-bottom: 1px solid #f3f4f6;">${fineAmount} BDT</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280;">Total Unpaid Dues</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 700; color: #b91c1c;">${totalUnpaid} BDT (Limit: ${maxUnpaidFineLimit} BDT)</td>
      </tr>
    </table>

    <div style="background-color: #fef2f2; border-left: 3px solid #dc2626; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #991b1b; line-height: 1.5;">
      <strong>Policy Notice:</strong> Unpaid fines may be settled at the library circulation desk or through the student portal. Reaching the ${maxUnpaidFineLimit} BDT threshold will lock further seat bookings.
    </div>

    <p style="margin: 20px 0 0 0;">
      <a href="${frontendUrl}/dashboard/fines" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
        View Fines Statement
      </a>
    </p>
  `;

  const htmlContent = buildFlatEmailShell({
    title: subject,
    preheader: `No-show notice: Reservation for Seat ${seatNumber} was cancelled.`,
    content,
  });

  return sendHtmlEmail(toEmail, subject, htmlContent);
};

// ─── 7. Booking Cancelled by Admin Email ───────────────────────────────────────

export interface SendBookingCancelledByAdminOptions {
  toEmail: string;
  studentName: string;
  seatNumber: string;
  zoneName: string;
  dateStr: string;
  slotName: string;
  cancelReason?: string | null;
  reason?: string | null;
}

export const sendBookingCancelledByAdminEmail = async (opts: SendBookingCancelledByAdminOptions) => {
  const {
    toEmail,
    studentName,
    seatNumber,
    zoneName,
    dateStr,
    slotName,
    cancelReason,
    reason,
  } = opts;

  const finalReason = cancelReason ?? reason;
  const subject = `Notice: Reservation Cancelled by Administration — Seat ${seatNumber}`;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const slotDisplay = slotName.charAt(0).toUpperCase() + slotName.slice(1).toLowerCase();

  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #111827; line-height: 1.3;">
      Seat Reservation Cancelled by Administration
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      Hello <strong>${studentName}</strong>, your seat reservation has been cancelled by the library administration. No penalty fine was assessed for this cancellation.
    </p>

    <!-- Flat Details Table -->
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; margin: 20px 0;">
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; width: 35%; border-bottom: 1px solid #f3f4f6;">Seat</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 700; color: #111827; border-bottom: 1px solid #f3f4f6;">${seatNumber} (${zoneName})</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Session</td>
        <td style="padding: 10px 0; font-size: 14px; color: #111827; border-bottom: 1px solid #f3f4f6;">${dateStr} &middot; ${slotDisplay}</td>
      </tr>
      ${finalReason ? `
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280;">Reason Given</td>
        <td style="padding: 10px 0; font-size: 13px; color: #991b1b; font-weight: 600;">${finalReason}</td>
      </tr>` : ""}
    </table>

    <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.6; color: #4b5563;">
      We apologise for any inconvenience caused. You may book another available seat or slot online through the library portal.
    </p>

    <p style="margin: 0 0 0 0;">
      <a href="${frontendUrl}/booking" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
        Book Another Seat
      </a>
    </p>
  `;

  const htmlContent = buildFlatEmailShell({
    title: subject,
    preheader: `Your reservation for Seat ${seatNumber} was cancelled by administration.`,
    content,
  });

  return sendHtmlEmail(toEmail, subject, htmlContent);
};

// ─── 8. Seat Slot Ending Warning Email ────────────────────────────────────────

export interface SendSeatSlotEndingWarningOptions {
  toEmail: string;
  studentName: string;
  seatNumber: string;
  zoneName: string;
  dateStr?: string;
  slotName: string;
  slotEndTimeStr: string;
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
    slotEndTimeStr,
    minutesRemaining = 15,
  } = opts;

  const subject = `Session Ending Soon: ${minutesRemaining} min left — Seat ${seatNumber}`;
  const slotDisplay = slotName.charAt(0).toUpperCase() + slotName.slice(1).toLowerCase();

  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #111827; line-height: 1.3;">
      Study Session Ending Soon
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      Hello <strong>${studentName}</strong>, this is a courtesy reminder that your study session at <strong>Seat ${seatNumber}</strong> (${zoneName}${dateStr ? ` on ${dateStr}` : ""}) will conclude in approximately <strong>${minutesRemaining} minutes</strong> (at ${slotEndTimeStr}).
    </p>

    <div style="background-color: #f9fafb; border-left: 3px solid #2563eb; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #374151; line-height: 1.5;">
      <strong>Session Wrap-Up Reminder:</strong>
      <ul style="margin: 6px 0 0 0; padding-left: 18px; color: #4b5563;">
        <li>Please pack your personal belongings, charging cables, and materials.</li>
        <li>Leave the seat clean and orderly for the next arriving student.</li>
        <li>If you wish to continue studying and seats are available, you can book the next slot via the portal.</li>
      </ul>
    </div>
  `;

  const htmlContent = buildFlatEmailShell({
    title: subject,
    preheader: `Your session at Seat ${seatNumber} concludes in ${minutesRemaining} minutes.`,
    content,
  });

  return sendHtmlEmail(toEmail, subject, htmlContent);
};

// ─── 9. Seat Late Cancellation Email ──────────────────────────────────────────

export interface SendSeatLateCancellationOptions {
  toEmail: string;
  studentName: string;
  seatNumber: string;
  zoneName: string;
  dateStr: string;
  slotName: string;
  fineAmount: number;
  totalUnpaid?: number;
  maxUnpaidFineLimit?: number;
  minutesSinceBooking?: number;
}

export const sendSeatLateCancellationEmail = async (opts: SendSeatLateCancellationOptions) => {
  const {
    toEmail,
    studentName,
    seatNumber,
    zoneName,
    dateStr,
    slotName,
    fineAmount,
    totalUnpaid = fineAmount,
    maxUnpaidFineLimit = 200,
  } = opts;

  const subject = `Notice: Late Cancellation Fee (${fineAmount} BDT) — Seat ${seatNumber}`;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const slotDisplay = slotName.charAt(0).toUpperCase() + slotName.slice(1).toLowerCase();

  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #b91c1c; line-height: 1.3;">
      Notice: Late Cancellation Fee Assessed
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      Hello <strong>${studentName}</strong>, your seat reservation was cancelled within the late cancellation window. Per library policy, a late cancellation fee has been applied.
    </p>

    <!-- Flat Details Table -->
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; margin: 20px 0;">
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; width: 35%; border-bottom: 1px solid #f3f4f6;">Seat</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 700; color: #111827; border-bottom: 1px solid #f3f4f6;">${seatNumber} (${zoneName})</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Session</td>
        <td style="padding: 10px 0; font-size: 14px; color: #111827; border-bottom: 1px solid #f3f4f6;">${dateStr} &middot; ${slotDisplay}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Cancellation Fee</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 700; color: #b91c1c; border-bottom: 1px solid #f3f4f6;">${fineAmount} BDT</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280;">Current Total Dues</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 700; color: #b91c1c;">${totalUnpaid} BDT (Limit: ${maxUnpaidFineLimit} BDT)</td>
      </tr>
    </table>

    <div style="background-color: #fef2f2; border-left: 3px solid #dc2626; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #991b1b; line-height: 1.5;">
      <strong>Note:</strong> To prevent empty seats and ensure fair access, cancellations within 30 minutes of session start incur this fee. You can settle outstanding dues at the circulation desk.
    </div>

    <p style="margin: 20px 0 0 0;">
      <a href="${frontendUrl}/dashboard/fines" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
        View Fine Statement
      </a>
    </p>
  `;

  const htmlContent = buildFlatEmailShell({
    title: subject,
    preheader: `Late cancellation fee of ${fineAmount} BDT for Seat ${seatNumber}.`,
    content,
  });

  return sendHtmlEmail(toEmail, subject, htmlContent);
};

// ─── 10. Seat Fine Paid Receipt Email ─────────────────────────────────────────

export interface SendSeatFinePaidReceiptOptions {
  toEmail: string;
  studentName: string;
  seatNumber: string;
  zoneName: string;
  dateStr?: string;
  slotName?: string;
  fineAmount?: number;
  amountPaid?: number;
  paymentMethod: string;
  chalanNumber?: string;
  paidDateStr?: string;
  paidAtStr?: string;
  remainingUnpaid?: number;
}

export const sendSeatFinePaidReceiptEmail = async (opts: SendSeatFinePaidReceiptOptions) => {
  const {
    toEmail,
    studentName,
    seatNumber,
    zoneName,
    dateStr,
    slotName,
    paymentMethod,
    chalanNumber,
  } = opts;

  const fineAmount = opts.amountPaid ?? opts.fineAmount ?? 0;
  const paidDateStr =
    opts.paidAtStr ||
    opts.paidDateStr ||
    new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const subject = `Payment Receipt: ${fineAmount} BDT Cleared — Seat Reservation Penalty`;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const slotDisplay = slotName
    ? slotName.charAt(0).toUpperCase() + slotName.slice(1).toLowerCase()
    : "";
  const sessionItem = [
    `Seat ${seatNumber}`,
    zoneName ? `(${zoneName})` : "",
    dateStr ? `· ${dateStr}` : "",
    slotDisplay ? `· ${slotDisplay}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #111827; line-height: 1.3;">
      Official Payment Receipt
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      Hello <strong>${studentName}</strong>, your seat reservation fine has been settled and recorded at the circulation desk.
    </p>

    <!-- Flat Receipt Table -->
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; margin: 20px 0;">
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; width: 35%; border-bottom: 1px solid #f3f4f6;">Item</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 600; color: #111827; border-bottom: 1px solid #f3f4f6;">${sessionItem || `Seat ${seatNumber}`}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Payment Date</td>
        <td style="padding: 10px 0; font-size: 14px; color: #111827; border-bottom: 1px solid #f3f4f6;">${paidDateStr}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Method</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 600; color: #111827; border-bottom: 1px solid #f3f4f6; text-transform: capitalize;">${paymentMethod} ${chalanNumber ? `(Chalan #${chalanNumber})` : ""}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Amount Settled</td>
        <td style="padding: 10px 0; font-size: 16px; font-weight: 700; color: #16a34a; border-bottom: 1px solid #f3f4f6;">${fineAmount} BDT</td>
      </tr>
      ${
        opts.remainingUnpaid !== undefined && opts.remainingUnpaid > 0
          ? `<tr>
              <td style="padding: 10px 0; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Remaining Fine Balance</td>
              <td style="padding: 10px 0; font-size: 14px; font-weight: 600; color: #dc2626; border-bottom: 1px solid #f3f4f6;">${opts.remainingUnpaid} BDT</td>
            </tr>`
          : ""
      }
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280;">Status</td>
        <td style="padding: 10px 0; font-size: 13px; font-weight: 700; color: #16a34a;">Cleared & Active</td>
      </tr>
    </table>

    <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.6; color: #4b5563;">
      Your seat reservation privileges are in good standing. Thank you for your cooperation with library policies.
    </p>

    <p style="margin: 0 0 0 0;">
      <a href="${frontendUrl}/booking" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
        Book a Library Seat
      </a>
    </p>
  `;

  const htmlContent = buildFlatEmailShell({
    title: subject,
    preheader: `Official receipt: ${fineAmount} BDT cleared for Seat ${seatNumber}.`,
    content,
  });

  return sendHtmlEmail(toEmail, subject, htmlContent);
};

// ─── 11. Profile OTP Verification Email (Google Security Style) ───────────────

export interface SendProfileOtpOptions {
  toEmail: string;
  studentName: string;
  code?: string;
  otpCode?: string;
  purpose?: "email_change" | "password_change";
  purposeLabel?: string;
  expiresInMinutes?: number;
}

export const sendProfileOtpEmail = async (opts: SendProfileOtpOptions) => {
  const { toEmail, studentName, purpose } = opts;
  const otpCode = opts.code || opts.otpCode || "";
  const purposeLabel =
    opts.purposeLabel ||
    (purpose === "email_change" ? "Email Address Update" : "Password Reset / Security Update");
  const expiresInMinutes = opts.expiresInMinutes || 10;

  const subject = `${otpCode} is your Daffodil International University Library verification code`;

  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #111827; line-height: 1.3;">
      Security Verification Code
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      Hello <strong>${studentName}</strong>,
    </p>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      We received a request for <strong>${purposeLabel}</strong> associated with your university library account. Use the verification code below to proceed:
    </p>

    <!-- Google-style Flat OTP box -->
    <div style="margin: 24px 0; padding: 18px 24px; background-color: #f9fafb; border: 1px solid #e5e7eb; text-align: center;">
      <span style="font-family: Consolas, 'SF Mono', Monaco, 'Roboto Mono', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111827;">${otpCode}</span>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.5; color: #6b7280;">
      This single-use code is valid for <strong>${expiresInMinutes} minutes</strong>.
    </p>

    <div style="background-color: #fffbeb; border-left: 3px solid #d97706; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #92400e; line-height: 1.5;">
      <strong>Security Notice:</strong> If you did not initiate this request, no action is needed and you can safely ignore this message. Never share this verification code with anyone; library staff will never request it.
    </div>
  `;

  const htmlContent = buildFlatEmailShell({
    title: subject,
    preheader: `Your verification code is ${otpCode}. Valid for ${expiresInMinutes} minutes.`,
    content,
  });

  return sendHtmlEmail(toEmail, subject, htmlContent);
};

// ─── 12. Faculty Account Lifecycle (Formal Institutional Correspondence) ─────

export interface SendFacultyPendingApprovalOptions {
  toEmails: string[];
  facultyName: string;
  facultyEmail: string;
  facultyId?: string | null;
  department?: string | null;
  designation?: string | null;
}

/** Tells the admins that a verified faculty signup is waiting for a decision. */
export const sendFacultyPendingApprovalEmail = async (opts: SendFacultyPendingApprovalOptions) => {
  const { toEmails, facultyName, facultyEmail, facultyId, department, designation } = opts;
  if (toEmails.length === 0) return;

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #111827; line-height: 1.3;">
      Faculty Membership Registration Awaiting Review
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      Dear Library Administrator,
    </p>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      A new faculty member has verified their institutional email address and submitted their registration for library membership. The application is now pending your administrative review.
    </p>

    <!-- Flat Details Table -->
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; margin: 20px 0;">
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; width: 35%; border-bottom: 1px solid #f3f4f6;">Faculty Name</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 600; color: #111827; border-bottom: 1px solid #f3f4f6;">${facultyName}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Institutional Email</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 600; color: #111827; border-bottom: 1px solid #f3f4f6;">${facultyEmail}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Faculty ID</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 600; color: #111827; border-bottom: 1px solid #f3f4f6;">${facultyId || "—"}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Department</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 600; color: #111827; border-bottom: 1px solid #f3f4f6;">${department || "—"}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280;">Designation</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 600; color: #111827;">${designation || "—"}</td>
      </tr>
    </table>

    <p style="margin: 0 0 24px 0;">
      <a href="${frontendUrl}/admin/settings" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
        Review in Admin Console
      </a>
    </p>

    <div style="margin-top: 28px; line-height: 1.6; color: #374151; font-size: 14px;">
      Best regards,<br/>
      <strong>Library Admin Panel,</strong><br/>
      Daffodil International University.
    </div>
  `;

  const htmlContent = buildFlatEmailShell({
    title: `Faculty approval pending: ${facultyName}`,
    preheader: `New faculty registration submitted by ${facultyName} (${department || "Academic Faculty"}).`,
    content,
  });

  return Promise.all(
    toEmails.map((toEmail) =>
      sendHtmlEmail(toEmail, `Faculty approval pending: ${facultyName}`, htmlContent)
    )
  );
};

export interface SendFacultyDecisionOptions {
  toEmail: string;
  facultyName: string;
  /** Only set on a rejection. */
  reason?: string | null;
}

/**
 * Confirms to the faculty member that their account is approved.
 * Structured as a formal institutional welcome letter outlining all faculty facilities.
 */
export const sendFacultyApprovedEmail = async (opts: SendFacultyDecisionOptions) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #111827; line-height: 1.3;">
      Official Approval of Faculty Library Membership
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      Dear ${opts.facultyName},
    </p>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      We are pleased to inform you that your faculty library membership account at Daffodil International University has been officially reviewed, verified, and approved by the Library Administration.
    </p>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      Your account is now fully active. As an esteemed faculty member, you have unrestricted access to our institutional collections, physical study spaces, research databases, and faculty-exclusive facilities:
    </p>

    <!-- Faculty Facilities and Privileges (Flat clean callout) -->
    <div style="background-color: #f9fafb; border-left: 3px solid #2563eb; padding: 18px 22px; margin: 22px 0;">
      <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #111827;">
        Your Faculty Privileges & Facilities:
      </p>
      <ul style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.7; color: #374151;">
        <li style="margin-bottom: 8px;">
          <strong>Exemption from Seat Booking Fines & Cancellation:</strong> Your study seat reservations are never auto-cancelled due to missed check-in windows, and no cancellation or no-show penalties will apply to your account.
        </li>
        <li style="margin-bottom: 8px;">
          <strong>Zero Overdue Fines on Book Loans:</strong> Academic literature, textbooks, and research monographs are completely exempt from daily overdue fines upon return.
        </li>
        <li style="margin-bottom: 8px;">
          <strong>Enhanced Borrowing Quotas & Durations:</strong> Benefit from an expanded borrowing quota with extended loan terms tailored for teaching and academic research.
        </li>
        <li style="margin-bottom: 8px;">
          <strong>Student Fine Waiver Sponsorship:</strong> You are authorized to formally petition and sponsor fine waivers on behalf of students experiencing verified extenuating circumstances or emergencies.
        </li>
        <li style="margin-bottom: 4px;">
          <strong>Priority Access to Research Spaces:</strong> Priority reservation privileges across quiet study pods, conference halls, digital workstations, and faculty reading areas.
        </li>
      </ul>
    </div>

    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      You may now sign in to the Smart Library Portal using your institutional credentials:
    </p>

    <p style="margin: 0 0 24px 0;">
      <a href="${frontendUrl}/auth/login" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 13px; font-weight: 600; padding: 11px 22px; border-radius: 4px; text-decoration: none;">
        Sign In to Library Portal
      </a>
    </p>

    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      Should you require specialized curriculum reserves, research literature procurement, or inter-library loan services, please feel free to reach out to the library administration or visit the circulation counter.
    </p>

    <div style="margin-top: 28px; line-height: 1.6; color: #374151; font-size: 14px;">
      Best regards,<br/>
      <strong>Library Admin Panel,</strong><br/>
      Daffodil International University.
    </div>
  `;

  const htmlContent = buildFlatEmailShell({
    title: "Your Faculty Account is Approved",
    preheader: `Dear ${opts.facultyName}, your Daffodil International University faculty library account has been approved.`,
    content,
  });

  return sendHtmlEmail(opts.toEmail, "Your faculty account is approved", htmlContent);
};

/** Tells the applicant the faculty request was declined, with the stated reason. */
export const sendFacultyRejectedEmail = async (opts: SendFacultyDecisionOptions) => {
  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #111827; line-height: 1.3;">
      Update on Faculty Library Membership Application
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      Dear ${opts.facultyName},
    </p>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      Thank you for applying for a faculty library membership account at Daffodil International University.
    </p>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      Following an administrative review of the submitted registration details, we regret to inform you that your faculty account request could not be approved at this time.
    </p>

    <div style="background-color: #fef2f2; border-left: 3px solid #dc2626; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #991b1b; line-height: 1.5;">
      <strong>Reason for Decision:</strong><br/>
      ${opts.reason || "The submitted institutional credentials or faculty designation could not be verified with university records."}
    </div>

    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      If you believe this determination was made in error or if you wish to provide updated verification documentation from your department, please contact the Library Help Desk or visit the administrative office.
    </p>

    <div style="margin-top: 28px; line-height: 1.6; color: #374151; font-size: 14px;">
      Best regards,<br/>
      <strong>Library Admin Panel,</strong><br/>
      Daffodil International University.
    </div>
  `;

  const htmlContent = buildFlatEmailShell({
    title: "Your Faculty Account Request Was Declined",
    preheader: `Dear ${opts.facultyName}, update regarding your faculty library account application.`,
    content,
  });

  return sendHtmlEmail(opts.toEmail, "Your faculty account request was declined", htmlContent);
};

// ─── 13. Fine Waiver Petitions ────────────────────────────────────────────────

export interface SendWaiverRequestedOptions {
  toEmails: string[];
  facultyName: string;
  targetName: string;
  amount: number;
  reason: string;
  fineType: "seat reservation" | "book loan";
}

/** Notifies admins that a faculty member petitioned to clear a fine. */
export const sendWaiverRequestedEmail = async (opts: SendWaiverRequestedOptions) => {
  const { toEmails, facultyName, targetName, amount, reason, fineType } = opts;
  if (toEmails.length === 0) return;

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #111827; line-height: 1.3;">
      Faculty Fine Waiver Petition Submitted
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      Dear Library Administrator,
    </p>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      Faculty member <strong>${facultyName}</strong> has submitted an official petition requesting a waiver for a student's ${fineType} fine.
    </p>

    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; margin: 20px 0;">
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; width: 35%; border-bottom: 1px solid #f3f4f6;">Sponsoring Faculty</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 600; color: #111827; border-bottom: 1px solid #f3f4f6;">${facultyName}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Student Recipient</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 600; color: #111827; border-bottom: 1px solid #f3f4f6;">${targetName}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Fine Type</td>
        <td style="padding: 10px 0; font-size: 14px; color: #111827; border-bottom: 1px solid #f3f4f6; text-transform: capitalize;">${fineType}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Amount</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 700; color: #111827; border-bottom: 1px solid #f3f4f6;">${amount} BDT</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #6b7280;">Stated Justification</td>
        <td style="padding: 10px 0; font-size: 13px; color: #374151;">${reason}</td>
      </tr>
    </table>

    <p style="margin: 0 0 24px 0;">
      <a href="${frontendUrl}/admin/fines" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
        Decide Request in Admin Console
      </a>
    </p>

    <div style="margin-top: 28px; line-height: 1.6; color: #374151; font-size: 14px;">
      Best regards,<br/>
      <strong>Library Admin Panel,</strong><br/>
      Daffodil International University.
    </div>
  `;

  const htmlContent = buildFlatEmailShell({
    title: `Fine waiver requested for ${targetName}`,
    preheader: `${facultyName} requested a waiver of ${amount} BDT for ${targetName}.`,
    content,
  });

  return Promise.all(
    toEmails.map((toEmail) =>
      sendHtmlEmail(toEmail, `Fine waiver requested for ${targetName}`, htmlContent)
    )
  );
};

export interface SendWaiverDecisionOptions {
  toEmail: string;
  recipientName: string;
  targetName: string;
  amount: number;
  approved: boolean;
  decisionNote?: string | null;
}

/** Reports the admin's decision back to the requesting faculty member. */
export const sendWaiverDecisionEmail = async (opts: SendWaiverDecisionOptions) => {
  const { toEmail, recipientName, targetName, amount, approved, decisionNote } = opts;

  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #111827; line-height: 1.3;">
      Update on Student Fine Waiver Petition
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      Dear ${recipientName},
    </p>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      The ${amount} BDT fine waiver you petitioned for <strong>${targetName}</strong> has been
      <strong>${approved ? "approved and cleared" : "declined"}</strong> by the library administration.
    </p>

    ${
      approved
        ? `<div style="background-color: #f0fdf4; border-left: 3px solid #16a34a; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #166534;">
             <strong>Decision:</strong> The ${amount} BDT penalty has been completely waived on the student's record.
             ${decisionNote ? `<br/><span style="color:#15803d;margin-top:4px;display:inline-block;">Note: ${decisionNote}</span>` : ""}
           </div>`
        : `<div style="background-color: #fef2f2; border-left: 3px solid #dc2626; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #991b1b;">
             <strong>Decision:</strong> The waiver request was declined. The fine remains outstanding on the student's record.
             ${decisionNote ? `<br/><span style="color:#b91c1c;margin-top:4px;display:inline-block;">Reason: ${decisionNote}</span>` : ""}
           </div>`
    }

    <div style="margin-top: 28px; line-height: 1.6; color: #374151; font-size: 14px;">
      Best regards,<br/>
      <strong>Library Admin Panel,</strong><br/>
      Daffodil International University.
    </div>
  `;

  const htmlContent = buildFlatEmailShell({
    title: approved ? `Fine waiver approved for ${targetName}` : `Fine waiver declined for ${targetName}`,
    preheader: `Update on the ${amount} BDT fine waiver petition for ${targetName}.`,
    content,
  });

  return sendHtmlEmail(
    toEmail,
    approved ? `Fine waiver approved for ${targetName}` : `Fine waiver declined for ${targetName}`,
    htmlContent
  );
};

// ─── Export Email Service Object ──────────────────────────────────────────────

// ─── Member Reports ───────────────────────────────────────────────────────────

/** Report category codes rendered as words for a reader. */
const REPORT_CATEGORY_LABELS: Record<string, string> = {
  bug: "System Bug",
  service: "Library Service",
  facilities: "Facilities",
  environment: "Study Environment",
  book: "Book or Catalogue",
  other: "Other",
};

const REPORT_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_review: "Under Review",
  resolved: "Resolved",
  dismissed: "Closed without action",
};

export interface SendReportFiledOptions {
  /** Library staff addresses that triage reports. */
  toEmails: string[];
  reporterName: string;
  reporterRole: string;
  category: string;
  subject: string;
  description: string;
  location?: string | null;
  priority: string;
}

/** Tells staff that a member of the library filed a report. */
export const sendReportFiledEmail = async (opts: SendReportFiledOptions) => {
  const { toEmails, reporterName, reporterRole, category, subject, description, location, priority } = opts;
  if (toEmails.length === 0) return;

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const categoryLabel = REPORT_CATEGORY_LABELS[category] || category;

  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #111827; line-height: 1.3;">
      New ${categoryLabel} Report Submitted
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      A ${reporterRole} member of the library has submitted a report for review by the Library Administration.
    </p>

    <div style="background-color: #f9fafb; border-left: 3px solid #2563eb; padding: 18px 22px; margin: 22px 0;">
      <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: #111827;">${subject}</p>
      <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.7; color: #374151;">${description}</p>
      <p style="margin: 0; font-size: 12px; line-height: 1.7; color: #6b7280;">
        <strong>Submitted by:</strong> ${reporterName}<br/>
        <strong>Category:</strong> ${categoryLabel}<br/>
        <strong>Priority:</strong> ${priority}<br/>
        <strong>Location:</strong> ${location || "Not specified"}
      </p>
    </div>

    <p style="margin: 0 0 24px 0;">
      <a href="${frontendUrl}/admin/reports" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 13px; font-weight: 600; padding: 11px 22px; border-radius: 4px; text-decoration: none;">
        Open the Report Queue
      </a>
    </p>

    <div style="margin-top: 28px; line-height: 1.6; color: #374151; font-size: 14px;">
      Best regards,<br/>
      <strong>Library Admin Panel,</strong><br/>
      Daffodil International University.
    </div>
  `;

  const htmlContent = buildFlatEmailShell({
    title: "New Report Submitted",
    preheader: `${reporterName} submitted a ${categoryLabel.toLowerCase()} report: ${subject}`,
    content,
  });

  return Promise.all(
    toEmails.map((toEmail) => sendHtmlEmail(toEmail, `New ${categoryLabel.toLowerCase()} report: ${subject}`, htmlContent))
  );
};

export interface SendReportStatusOptions {
  toEmail: string;
  reporterName: string;
  subject: string;
  statusLabel: string;
  staffNote?: string | null;
}

/** Tells the reporter where their report now stands. */
export const sendReportStatusEmail = async (opts: SendReportStatusOptions) => {
  const { toEmail, reporterName, subject, statusLabel, staffNote } = opts;
  const readableStatus = REPORT_STATUS_LABELS[statusLabel] || statusLabel;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #111827; line-height: 1.3;">
      Your Report is Now ${readableStatus}
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      Dear ${reporterName},
    </p>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      The Library Administration has updated the report you submitted. Thank you for helping us keep the library running well.
    </p>

    <div style="background-color: #f9fafb; border-left: 3px solid #2563eb; padding: 18px 22px; margin: 22px 0;">
      <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: #111827;">${subject}</p>
      <p style="margin: 0; font-size: 13px; line-height: 1.7; color: #374151;">
        <strong>Current status:</strong> ${readableStatus}
      </p>
      ${staffNote ? `<p style="margin: 12px 0 0 0; font-size: 13px; line-height: 1.7; color: #374151;"><strong>Note from the library:</strong> ${staffNote}</p>` : ""}
    </div>

    <p style="margin: 0 0 24px 0;">
      <a href="${frontendUrl}/dashboard/reports" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 13px; font-weight: 600; padding: 11px 22px; border-radius: 4px; text-decoration: none;">
        View My Reports
      </a>
    </p>

    <div style="margin-top: 28px; line-height: 1.6; color: #374151; font-size: 14px;">
      Best regards,<br/>
      <strong>Library Admin Panel,</strong><br/>
      Daffodil International University.
    </div>
  `;

  const htmlContent = buildFlatEmailShell({
    title: `Your report is now ${readableStatus.toLowerCase()}`,
    preheader: `Your report "${subject}" is now ${readableStatus.toLowerCase()}.`,
    content,
  });

  return sendHtmlEmail(toEmail, `Your library report is now ${readableStatus.toLowerCase()}`, htmlContent);
};

/**
 * Dispatches a formal letter of appreciation and gratitude to a faculty member
 * informing them that their recommended book has been procured, catalogued,
 * and placed on the library shelves.
 */
const sendBookSuggestionFulfilledEmail = async (params: {
  facultyName: string;
  facultyEmail: string;
  bookTitle: string;
  author: string;
  publisher?: string | null;
  edition?: string | null;
  isbn?: string | null;
  block?: string | null;
  shelfNumber?: string | null;
  callNumber?: string | null;
  adminNotes?: string | null;
}) => {
  const {
    facultyName,
    facultyEmail,
    bookTitle,
    author,
    publisher,
    edition,
    isbn,
    block,
    shelfNumber,
    callNumber,
    adminNotes,
  } = params;

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const content = `
    <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 700; color: #111827;">
      Dear Professor ${facultyName},
    </p>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      On behalf of the Library Committee and the Administration of Daffodil International University, we would like to express our sincere appreciation and gratitude for your valuable academic book recommendation.
    </p>

    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      We are delighted to inform you that the requested volume has been formally approved, procured, and integrated into the university's permanent library collection.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 18px 20px; margin-bottom: 24px;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #4338ca; margin-bottom: 12px;">
        Procured Volume Specifications
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 140px;">Title:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${bookTitle}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Author(s):</td>
          <td style="padding: 6px 0; font-weight: 600; color: #334155;">${author}</td>
        </tr>
        ${publisher ? `<tr><td style="padding: 6px 0; color: #64748b;">Publisher:</td><td style="padding: 6px 0; color: #334155;">${publisher}</td></tr>` : ""}
        ${edition ? `<tr><td style="padding: 6px 0; color: #64748b;">Edition:</td><td style="padding: 6px 0; color: #334155;">${edition}</td></tr>` : ""}
        ${isbn ? `<tr><td style="padding: 6px 0; color: #64748b;">ISBN:</td><td style="padding: 6px 0; font-family: monospace; color: #334155;">${isbn}</td></tr>` : ""}
        ${block && shelfNumber ? `
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Shelf Coordinates:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #4338ca;">${block} • ${shelfNumber}</td>
        </tr>` : ""}
        ${callNumber ? `<tr><td style="padding: 6px 0; color: #64748b;">Call Number:</td><td style="padding: 6px 0; font-family: monospace; color: #334155;">${callNumber}</td></tr>` : ""}
      </table>
    </div>

    ${adminNotes ? `
    <div style="background-color: #f1f5f9; border-left: 3px solid #64748b; padding: 12px 16px; margin-bottom: 24px; font-size: 13px; color: #334155;">
      <strong>Note from Library Staff:</strong><br/>
      ${adminNotes}
    </div>
    ` : ""}

    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #374151;">
      As a valued faculty member, you enjoy priority 365-day borrowing privileges and fine exemptions. The physical copy is ready for your perusal on the stacks or at the central circulation desk.
    </p>

    <p style="margin: 0 0 28px 0;">
      <a href="${frontendUrl}/books" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
        Locate Volume on Spatial Catalog
      </a>
    </p>

    <div style="margin-top: 28px; line-height: 1.6; color: #374151; font-size: 14px;">
      Best regards,<br/>
      <strong>Library Admin Panel,</strong><br/>
      Daffodil International University.
    </div>
  `;

  const htmlContent = buildFlatEmailShell({
    title: `Book Acquisition Complete: "${bookTitle}"`,
    preheader: `Your recommended book "${bookTitle}" is now catalogued and available in the DIU Library.`,
    content,
  });

  return sendHtmlEmail(
    facultyEmail,
    `Acquisition Complete: "${bookTitle}" is Now Available in the Library`,
    htmlContent
  );
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
  sendSeatLateCancellationEmail,
  sendSeatFinePaidReceiptEmail,
  sendProfileOtpEmail,
  sendFacultyPendingApprovalEmail,
  sendFacultyApprovedEmail,
  sendFacultyRejectedEmail,
  sendWaiverRequestedEmail,
  sendWaiverDecisionEmail,
  sendReportFiledEmail,
  sendReportStatusEmail,
  sendBookSuggestionFulfilledEmail,
};

export default emailService;
