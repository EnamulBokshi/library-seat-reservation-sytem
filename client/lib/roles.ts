import { Role } from "./types";

/**
 * Roles that reserve seats and borrow books for themselves, as opposed to
 * administering the library. Faculty sit here alongside students, with wider
 * privileges applied server-side.
 */
export const isSelfServiceRole = (role?: Role): boolean =>
  role === "student" || role === "faculty";

/** Faculty may petition an admin to waive a student's fine. */
export const canRequestFineWaiver = (role?: Role): boolean => role === "faculty";
