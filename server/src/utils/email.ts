
import ejs from 'ejs'
import nodemailer from 'nodemailer'
import { envVars } from '../config/envVars';
import AppError from '../helpers/AppError';
import path from 'node:path';

const transporter = nodemailer.createTransport({
    host: envVars.SMTP.SMTP_HOST,
    port: envVars.SMTP.SMTP_PORT,
    secure: envVars.SMTP.SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
        user: envVars.SMTP.SMTP_USER,
        pass: envVars.SMTP.SMTP_PASS,
    },
})

interface SendEmailOptions {
    to: string;
    subject: string;
    template: string;
    templateData: Record<string, unknown>;
    attachments?: {
        filename: string;
        content: Buffer | string;
        contentType: string;
    }[];
}

export const sendEmail = async (options: SendEmailOptions) => {

    const { to, subject, template, templateData, attachments } = options;
    try {

        const templatePath = path.resolve(process.cwd(), `src/templates/${template}.ejs`);
        const html = await ejs.renderFile(templatePath, templateData);

        const info = await transporter.sendMail({
            from: envVars.SMTP.SMTP_USER,
            to,
            subject,
            html,
            attachments: attachments?.map(att => ({
                filename: att.filename,
                content: att.content,
                contentType: att.contentType,
            })),
        });

        console.log("Email sent:", info.messageId);
    } catch (error) {
        console.log("Error sending email:", error);
        throw new AppError(500, "Error sending email");
    }
}