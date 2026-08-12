"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const requestValidator = (zodSchema) => {
    return async (req, res, next) => {
        try {
            const parsedResult = await zodSchema.parseAsync(req.body);
            req.body = parsedResult;
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.default = requestValidator;
