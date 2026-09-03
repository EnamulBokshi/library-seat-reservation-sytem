import { Router } from "express";
import { AuthController } from "./auth.controller";
import requestValidator from "../../middleware/requestValidator";
import authCheck from "../../middleware/authCheck";
import { AuthValidation } from "./auth.validation";

const authRoute: Router = Router();

// POST /api/v1/auth/register — public
authRoute.post("/register", requestValidator(AuthValidation.registerSchema), AuthController.register);

// POST /api/v1/auth/login — public
authRoute.post("/login", requestValidator(AuthValidation.loginSchema), AuthController.login);

// POST /api/v1/auth/refresh — public (uses refresh token from cookie)
authRoute.post("/refresh", AuthController.refresh);

// GET /api/v1/auth/me — authenticated
authRoute.get("/me", authCheck(), AuthController.getMe);

// POST /api/v1/auth/logout — public
authRoute.post("/logout", AuthController.logout);

export default authRoute;
