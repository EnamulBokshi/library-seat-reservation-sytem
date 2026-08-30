import { NextFunction, Request, Response } from "express";
import { z } from "zod";

const requestValidator = (zodSchema: z.ZodType) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (zodSchema instanceof z.ZodObject && "body" in zodSchema.shape) {
                const parsed = await zodSchema.parseAsync({
                    body: req.body,
                    query: req.query,
                    params: req.params,
                }) as any;
                req.body = parsed.body !== undefined ? parsed.body : req.body;
            } else {
                const parsedResult = await zodSchema.parseAsync(req.body);
                req.body = parsedResult;
            }
            next();
        } catch (error) {
            next(error);
        }
    };
};

export default requestValidator;