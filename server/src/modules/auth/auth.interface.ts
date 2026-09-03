export interface IRegisterPayload {
    name: string;
    email: string;
    password: string;
    studentId?: string;
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
