export interface IRegisterPayload {
    name: string;
    email: string;
    password: string;
    studentId?: string;
    /** Self-service signup is limited to these two roles. Staff are created by an admin. */
    role?: "student" | "faculty";
    facultyId?: string;
    department?: string;
    designation?: string;
}

export interface IVerifyRegistrationPayload {
    email: string;
    code: string;
}

export interface IResendRegistrationOtpPayload {
    email: string;
}

export interface ILoginPayload {
    email: string;
    password: string;
}

export interface ITokenPayload {
    userId: string;
    email: string;
    role: string;
}
