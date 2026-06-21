import { IOrder } from "./order.interface";

export interface IUser {
    id: string;
    name: string;
    email: string;
    role: "user" | "admin";
    orders: IOrder[];
}