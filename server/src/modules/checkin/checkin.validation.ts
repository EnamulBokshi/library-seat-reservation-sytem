import { z } from "zod";

export const scanQRSchema = z.object({
    qrToken: z.string({ error: "QR token is required" }).uuid("Invalid QR token format"),
});

export const CheckInValidation = {
    scanQRSchema,
};
