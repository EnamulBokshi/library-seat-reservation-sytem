import { Router } from "express";
import { UserController } from "./user.controller";
import requestValidator from "../../middleware/requestValidator";
import authCheck from "../../middleware/authCheck";
import { UserValidation } from "./user.validation";

const userRoute: Router = Router();

// GET /api/v1/user — admin user directory
userRoute.get("/", authCheck("admin"), UserController.listUsers);

// POST /api/v1/user — admin create user directly
userRoute.post(
    "/",
    authCheck("admin"),
    requestValidator(UserValidation.createUserSchema),
    UserController.createUser
);

// GET /api/v1/user/pending-approvals — faculty signups awaiting a decision
userRoute.get("/pending-approvals", authCheck("admin"), UserController.getPendingApprovals);

// PATCH /api/v1/user/:id/approve — activate a pending account
userRoute.patch("/:id/approve", authCheck("admin"), UserController.approveUser);

// PATCH /api/v1/user/:id/reject — decline a pending account with a reason
userRoute.patch(
    "/:id/reject",
    authCheck("admin"),
    requestValidator(UserValidation.rejectUserSchema),
    UserController.rejectUser
);

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

// PATCH /api/v1/user/:id — admin update user profile, role, or active status
userRoute.patch(
    "/:id",
    authCheck("admin"),
    requestValidator(UserValidation.adminUpdateUserSchema),
    UserController.updateUser
);

// DELETE /api/v1/user/:id — admin delete user account
userRoute.delete(
    "/:id",
    authCheck("admin"),
    UserController.deleteUser
);

export default userRoute;
