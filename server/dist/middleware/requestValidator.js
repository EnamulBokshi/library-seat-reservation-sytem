"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const requestValidator = (zodSchema) => {
    return async (req, res, next) => {
        try {
            if (zodSchema instanceof zod_1.z.ZodObject && "body" in zodSchema.shape) {
                const parsed = await zodSchema.parseAsync({
                    body: req.body,
                    query: req.query,
                    params: req.params,
                });
                req.body = parsed.body !== undefined ? parsed.body : req.body;
            }
            else {
                const parsedResult = await zodSchema.parseAsync(req.body);
                req.body = parsedResult;
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.default = requestValidator;
