"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserPrivileges = exports.getPrivilegesForRole = exports.isPrivilegedRole = void 0;
const prisma_1 = __importDefault(require("./prisma"));
const enums_1 = require("../generated/enums");
const setting_service_1 = require("../modules/setting/setting.service");
/** Roles that receive the extended faculty privilege set. */
const isPrivilegedRole = (role) => role === enums_1.Role.faculty;
exports.isPrivilegedRole = isPrivilegedRole;
const buildPrivileges = (role, facultyPolicy, borrowConfig) => {
    const isFaculty = (0, exports.isPrivilegedRole)(role);
    if (!isFaculty) {
        return {
            role,
            isFaculty: false,
            exemptSeatFines: false,
            exemptNoShowCancel: false,
            exemptLoanFines: false,
            loanPeriodDays: borrowConfig.borrowPeriodDays,
            maxBorrowLimit: borrowConfig.maxBorrowLimit,
            canRequestWaiver: false,
        };
    }
    return {
        role,
        isFaculty: true,
        exemptSeatFines: facultyPolicy.exemptSeatFines,
        exemptNoShowCancel: facultyPolicy.exemptNoShowCancel,
        exemptLoanFines: facultyPolicy.exemptLoanFines,
        loanPeriodDays: facultyPolicy.loanPeriodDays,
        maxBorrowLimit: facultyPolicy.maxBorrowLimit,
        canRequestWaiver: true,
    };
};
/**
 * Resolve the effective privileges for a known role without a database lookup.
 */
const getPrivilegesForRole = async (role) => {
    const [facultyPolicy, borrowConfig] = await Promise.all([
        setting_service_1.SettingService.getFacultyPolicyConfig(),
        setting_service_1.SettingService.getBorrowConfig(),
    ]);
    return buildPrivileges(role, facultyPolicy, borrowConfig);
};
exports.getPrivilegesForRole = getPrivilegesForRole;
/**
 * Resolve the effective privileges for a user id. Unknown users fall back to
 * the student rule set, which is the restrictive one.
 */
const getUserPrivileges = async (userId) => {
    const user = await prisma_1.default.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });
    return (0, exports.getPrivilegesForRole)(user?.role ?? enums_1.Role.student);
};
exports.getUserPrivileges = getUserPrivileges;
