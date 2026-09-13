"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FineValidation = void 0;
const zod_1 = require("zod");
const payFineSchema = zod_1.z.object({
    paymentMethod: zod_1.z.enum(["cash", "chalan", "online"], {
        error: "Payment method must be cash, chalan, or online",
    }),
    chalanNumber: zod_1.z.string().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
});
const waiveFineSchema = zod_1.z.object({
    reason: zod_1.z.string().optional().nullable(),
});
exports.FineValidation = {
    payFineSchema,
    waiveFineSchema,
};
