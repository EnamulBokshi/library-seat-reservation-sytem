import { JwtPayload, SignOptions } from "jsonwebtoken";
import { jwtUtils } from "./jwt";
import { envVars } from "../config/envVars";
import { CookieOptions, Response } from "express";
import { cookieUtils } from "./cookie";

const baseCookieOptions: CookieOptions = {
    httpOnly: true,
    secure: envVars.COOKIE.SECURE,
    sameSite: envVars.COOKIE.SAME_SITE,
    path: "/",
};

const getAccessToken = (payload: JwtPayload) => {
    return jwtUtils.createToken(payload, envVars.ACCESS_TOKEN_SECRET, {
        expiresIn: envVars.ACCESS_TOKEN_EXPIRES_IN,
    } as SignOptions);
};

const getRefreshToken = (payload: JwtPayload) => {
    return jwtUtils.createToken(payload, envVars.REFRESH_TOKEN_SECRET, {
        expiresIn: envVars.REFRESH_TOKEN_EXPIRES_IN,
    } as SignOptions);
};

const setAccessTokenCookie = (res: Response, token: string) => {
    cookieUtils.setCookie(res, "accessToken", token, {
        ...baseCookieOptions,
        maxAge: envVars.ACCESS_TOKEN_EXPIRES_IN * 1000, // convert seconds to ms
    });
};

const setRefreshTokenCookie = (res: Response, token: string) => {
    cookieUtils.setCookie(res, "refreshToken", token, {
        ...baseCookieOptions,
        maxAge: envVars.REFRESH_TOKEN_EXPIRES_IN * 1000, // convert seconds to ms
    });
};

const clearAuthCookies = (res: Response) => {
    cookieUtils.clearCookie(res, "accessToken", baseCookieOptions);
    cookieUtils.clearCookie(res, "refreshToken", baseCookieOptions);
};

export const tokenUtils = {
    getAccessToken,
    getRefreshToken,
    setAccessTokenCookie,
    setRefreshTokenCookie,
    clearAuthCookies,
};