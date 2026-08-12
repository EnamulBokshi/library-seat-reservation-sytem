import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromEmail = process.env.RESEND_FROM_EMAIL || "Smart Library <onboarding@resend.dev>";

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
              <img src="${qrCodeBase64}" alt="QR Pass" class="qr-img" />
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

  if (resend) {
    try {
      const response = await resend.emails.send({
        from: fromEmail,
        to: [toEmail],
        subject: `Your Library Seat Pass — Seat ${seatNumber} (${zoneName})`,
        html: htmlContent,
      });
      console.log(`[Email Service] Resend email dispatched successfully. ID: ${response.data?.id}`);
      return response;
    } catch (error) {
      console.error("[Email Service] Resend API error:", error);
    }
  } else {
    console.log(`[Email Service] RESEND_API_KEY not configured in .env. Email contents logged to console for ${toEmail}.`);
  }
};

export const emailService = {
  sendBookingConfirmationEmail,
};
