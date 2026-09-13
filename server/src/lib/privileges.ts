import prisma from "./prisma";
import { Role } from "../generated/enums";
import { SettingService, IFacultyPolicyConfig } from "../modules/setting/setting.service";

/**
 * Every role-based exemption in the system funnels through this file so the
 * privilege rules live in one place instead of scattered `role === "faculty"`
 * checks across the booking, loan and cron code.
 */

export interface IUserPrivileges {
    role: Role;
    isFaculty: boolean;
    /** Unpaid dues never lock seat booking, and reservations never accrue fines. */
    exemptSeatFines: boolean;
    /** The grace-period cron never auto-cancels the reservation. */
    exemptNoShowCancel: boolean;
    /** Returned or overdue loans never accrue a fine. */
    exemptLoanFines: boolean;
    /** Borrow period in days to apply when a loan is created. */
    loanPeriodDays: number;
    /** Concurrent active loan ceiling. */
    maxBorrowLimit: number;
    /** May petition an admin to waive another user's fine. */
    canRequestWaiver: boolean;
}

/** Roles that receive the extended faculty privilege set. */
export const isPrivilegedRole = (role: Role | string): boolean => role === Role.faculty;

const buildPrivileges = (
    role: Role,
    facultyPolicy: IFacultyPolicyConfig,
    borrowConfig: { maxBorrowLimit: number; borrowPeriodDays: number }
): IUserPrivileges => {
    const isFaculty = isPrivilegedRole(role);

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
export const getPrivilegesForRole = async (role: Role): Promise<IUserPrivileges> => {
    const [facultyPolicy, borrowConfig] = await Promise.all([
        SettingService.getFacultyPolicyConfig(),
        SettingService.getBorrowConfig(),
    ]);
    return buildPrivileges(role, facultyPolicy, borrowConfig);
};

/**
 * Resolve the effective privileges for a user id. Unknown users fall back to
 * the student rule set, which is the restrictive one.
 */
export const getUserPrivileges = async (userId: string): Promise<IUserPrivileges> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });

    return getPrivilegesForRole((user?.role as Role) ?? Role.student);
};
