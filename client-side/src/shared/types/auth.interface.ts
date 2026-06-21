import { IUser } from "./user.interface";

export interface IAuthForm {
    email: string;
    password: string;
    name?: string; // Опционально для регистрации
}

export interface IAuthResponse {
    user: IUser;
    accessToken: string;
}