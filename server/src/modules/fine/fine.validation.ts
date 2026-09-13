import { z } from "zod";

const payFineSchema = z.object({
  paymentMethod: z.enum(["cash", "chalan", "online"], {
    error: "Payment method must be cash, chalan, or online",
  }),
  chalanNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const waiveFineSchema = z.object({
  reason: z.string().optional().nullable(),
});

export const FineValidation = {
  payFineSchema,
  waiveFineSchema,
};
