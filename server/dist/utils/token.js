"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenUtils = void 0;
const jwt_1 = require("./jwt");
const envVars_1 = require("../config/envVars");
const cookie_1 = require("./cookie");
const isProduction = envVars_1.envVars.NODE_ENV === "production";
const cookieSameSite = isProduction ? "none" : "lax";
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
        httpOnly: true,
        secure: isProduction,
        sameSite: cookieSameSite,
        maxAge: envVars_1.envVars.ACCESS_TOKEN_EXPIRES_IN * 1000, // convert seconds to ms
        path: "/",
    });
};
const setRefreshTokenCookie = (res, token) => {
    cookie_1.cookieUtils.setCookie(res, "refreshToken", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: cookieSameSite,
        maxAge: envVars_1.envVars.REFRESH_TOKEN_EXPIRES_IN * 1000, // convert seconds to ms
        path: "/",
    });
};
exports.tokenUtils = {
    getAccessToken,
    getRefreshToken,
    setAccessTokenCookie,
    setRefreshTokenCookie,
};
