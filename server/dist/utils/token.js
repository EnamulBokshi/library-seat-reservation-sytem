"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenUtils = void 0;
const jwt_1 = require("./jwt");
const envVars_1 = require("../config/envVars");
const cookie_1 = require("./cookie");
const baseCookieOptions = {
    httpOnly: true,
    secure: envVars_1.envVars.COOKIE.SECURE,
    sameSite: envVars_1.envVars.COOKIE.SAME_SITE,
    path: "/",
};
const getAccessToken = (payload) => {
    return jwt_1.jwtUtils.createToken(payload, envVars_1.envVars.ACCESS_TOKEN_SECRET, {
        expiresIn: envVars_1.envVars.ACCESS_TOKEN_EXPIRES_IN,
    });
};
const getRefreshToken = (payload) => {
    return jwt_1.jwtUtils.createToken(payload, envVars_1.envVars.REFRESH_TOKEN_SECRET, {
        expiresIn: envVars_1.envVars.REFRESH_TOKEN_EXPIRES_IN,
    });
};
const setAccessTokenCookie = (res, token) => {
    cookie_1.cookieUtils.setCookie(res, "accessToken", token, {
        ...baseCookieOptions,
        maxAge: envVars_1.envVars.ACCESS_TOKEN_EXPIRES_IN * 1000, // convert seconds to ms
    });
};
const setRefreshTokenCookie = (res, token) => {
    cookie_1.cookieUtils.setCookie(res, "refreshToken", token, {
        ...baseCookieOptions,
        maxAge: envVars_1.envVars.REFRESH_TOKEN_EXPIRES_IN * 1000, // convert seconds to ms
    });
};
const clearAuthCookies = (res) => {
    cookie_1.cookieUtils.clearCookie(res, "accessToken", baseCookieOptions);
    cookie_1.cookieUtils.clearCookie(res, "refreshToken", baseCookieOptions);
};
exports.tokenUtils = {
    getAccessToken,
    getRefreshToken,
    setAccessTokenCookie,
    setRefreshTokenCookie,
    clearAuthCookies,
};
