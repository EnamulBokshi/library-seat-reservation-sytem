"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtUtils = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const createToken = (payload, secret, { expiresIn }) => {
    const token = jsonwebtoken_1.default.sign(payload, secret, { expiresIn });
    return token;
};
const verifyToken = (token, secret) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        return {
            success: true,
            data: decoded
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Token verification failed";
        return {
            success: false,
            message
        };
    }
};
const decodeToken = (token) => {
    const decoded = jsonwebtoken_1.default.decode(token);
    return decoded;
};
exports.jwtUtils = {
    createToken,
    verifyToken,
    decodeToken
};
