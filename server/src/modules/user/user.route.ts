import { Router } from "express";
import { UserController } from "./user.controller";
import requestValidator from "../../middleware/requestValidator";
import authCheck from "../../middleware/authCheck";
import { UserValidation } from "./user.validation";

const userRoute: Router = Router();

// GET /api/v1/user/me — own profile
userRoute.get("/me", authCheck(), UserController.getProfile);

// PATCH /api/v1/user/me — change display name (no verification needed)
userRoute.patch(
    "/me",
    authCheck(),
    requestValidator(UserValidation.updateProfileSchema),
    UserController.updateProfile
);

// GET /api/v1/user/me/fines — seat + loan fine statement
userRoute.get("/me/fines", authCheck(), UserController.getMyFines);

// POST /api/v1/user/me/email/request-otp — mail a code to the NEW address
userRoute.post(
    "/me/email/request-otp",
    authCheck(),
    requestValidator(UserValidation.requestEmailChangeSchema),
    UserController.requestEmailChange
);

// POST /api/v1/user/me/email/verify — commit the email change
userRoute.post(
    "/me/email/verify",
    authCheck(),
    requestValidator(UserValidation.verifyEmailChangeSchema),
    UserController.verifyEmailChange
);

// POST /api/v1/user/me/password/request-otp — mail a code to the CURRENT address
userRoute.post(
    "/me/password/request-otp",
    authCheck(),
    requestValidator(UserValidation.requestPasswordChangeSchema),
    UserController.requestPasswordChange
);

// POST /api/v1/user/me/password/verify — commit the password change
userRoute.post(
    "/me/password/verify",
    authCheck(),
    requestValidator(UserValidation.verifyPasswordChangeSchema),
    UserController.verifyPasswordChange
);

export default userRoute;
