import { Role } from "../generated/enums";

export interface IRequestUser {
    userId: string;
    email: string;
    role: Role;
}

declare global {
    namespace Express {
        interface Request {
            user: IRequestUser;
        }
    }
}