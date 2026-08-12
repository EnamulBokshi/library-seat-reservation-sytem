"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger = (req, res, next) => {
    console.log(`${req.method} ${req.url} ${new Date().toISOString()}`);
    next();
};
exports.default = logger;
