"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const ejs_1 = __importDefault(require("ejs"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const envVars_1 = require("../config/envVars");
const AppError_1 = __importDefault(require("../helpers/AppError"));
const node_path_1 = __importDefault(require("node:path"));
const transporter = nodemailer_1.default.createTransport({
    host: envVars_1.envVars.SMTP.SMTP_HOST,
    port: envVars_1.envVars.SMTP.SMTP_PORT,
    secure: envVars_1.envVars.SMTP.SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
        user: envVars_1.envVars.SMTP.SMTP_USER,
        pass: envVars_1.envVars.SMTP.SMTP_PASS,
    },
});
const sendEmail = async (options) => {
    const { to, subject, template, templateData, attachments } = options;
    try {
        const templatePath = node_path_1.default.resolve(process.cwd(), `src/templates/${template}.ejs`);
        const html = await ejs_1.default.renderFile(templatePath, templateData);
        const info = await transporter.sendMail({
            from: envVars_1.envVars.SMTP.SMTP_USER,
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
    }
    catch (error) {
        console.log("Error sending email:", error);
        throw new AppError_1.default(500, "Error sending email");
    }
};
exports.sendEmail = sendEmail;
