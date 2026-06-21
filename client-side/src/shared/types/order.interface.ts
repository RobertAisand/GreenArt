import { IProduct } from './product.interface';
import { IUser } from './user.interface';

export enum EnumOrderStatus {
    PENDING = 'PENDING',
    PAYED = 'PAYED',
    SHIPPED = 'SHIPPED',
    DELIVERED = 'DELIVERED',
    CANCELLED = 'CANCELLED'
}

export interface IOrderItem {
    id: string;
    createdAt: string;
    updatedAt: string;
    quantity: number;
    price: number;
    product: IProduct;
}

export interface IOrder {
    id: string;
    createdAt: string;
    updatedAt: string;
    status: EnumOrderStatus;
    items: IOrderItem[];
    total: number;
    user: IUser;
}