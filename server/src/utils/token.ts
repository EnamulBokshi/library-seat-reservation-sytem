import { JwtPayload, SignOptions } from "jsonwebtoken";
import { jwtUtils } from "./jwt";
import { envVars } from "../config/envVars";
import { Response } from "express";
import { cookieUtils } from "./cookie";

const isProduction = envVars.NODE_ENV === "production";
const cookieSameSite: "lax" | "none" = isProduction ? "none" : "lax";

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
        httpOnly: true,
        secure: isProduction,
        sameSite: cookieSameSite,
        maxAge: envVars.ACCESS_TOKEN_EXPIRES_IN * 1000, // convert seconds to ms
        path: "/",
    });
};

const setRefreshTokenCookie = (res: Response, token: string) => {
    cookieUtils.setCookie(res, "refreshToken", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: cookieSameSite,
        maxAge: envVars.REFRESH_TOKEN_EXPIRES_IN * 1000, // convert seconds to ms
        path: "/",
    });
};

export const tokenUtils = {
    getAccessToken,
    getRefreshToken,
    setAccessTokenCookie,
    setRefreshTokenCookie,
};