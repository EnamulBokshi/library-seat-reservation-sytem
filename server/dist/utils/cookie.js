"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cookieUtils = void 0;
const setCookie = (res, key, value, options) => {
    res.cookie(key, value, options);
};
const getCookie = (req, key) => {
    return req.cookies?.[key];
};
const clearCookie = (res, key, options) => {
    res.clearCookie(key, options);
};
exports.cookieUtils = {
    setCookie,
    getCookie,
    clearCookie,
};
