"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.sendBookingConfirmationEmail = void 0;
const resend_1 = require("resend");
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const SLOT_TIME_RANGES = {
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
        return nodemailer_1.default.createTransport({
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
        return nodemailer_1.default.createTransport({
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
const sendBookingConfirmationEmail = async (opts) => {
    const { toEmail, studentName, seatNumber, zoneName, dateStr, slotName, qrToken, qrCodeBase64, } = opts;
    console.log(`[Email Service] Preparing confirmation email for ${toEmail}...`);
    const fromAddress = process.env.EMAIL_FROM ||
        process.env.RESEND_FROM_EMAIL ||
        process.env.SMTP_USER ||
        process.env.GMAIL_USER ||
        "Smart Library <onboarding@resend.dev>";
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const base64Data = qrCodeBase64.includes(";base64,")
        ? qrCodeBase64.split(";base64,").pop()
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
        }
        catch (error) {
            console.error("[Email Service] SMTP dispatch error:", error);
        }
    }
    // 2. Try Resend API if configured
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
        const resendFrom = process.env.RESEND_FROM_EMAIL ||
            process.env.EMAIL_FROM ||
            "Smart Library <onboarding@resend.dev>";
        try {
            const resend = new resend_1.Resend(resendApiKey);
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
            }
            else {
                console.log(`[Email Service] Resend email dispatched successfully. ID: ${response.data?.id}`);
            }
            return response;
        }
        catch (error) {
            console.error("[Email Service] Resend API exception:", error);
        }
    }
    // 3. Fallback warning if no provider is configured in .env
    console.warn(`[Email Service] ⚠️ Email delivery skipped for ${toEmail}. No email credentials found in server/.env.\n` +
        `  To enable emails via Nodemailer (SMTP/Gmail): Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (or GMAIL_USER & GMAIL_APP_PASSWORD) in server/.env\n` +
        `  To enable emails via Resend: Set RESEND_API_KEY in server/.env`);
};
exports.sendBookingConfirmationEmail = sendBookingConfirmationEmail;
exports.emailService = {
    sendBookingConfirmationEmail: exports.sendBookingConfirmationEmail,
};
