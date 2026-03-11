import { IsEnum, IsNotEmpty } from 'class-validator';
import { EnumOrderStatus } from '@prisma/client'

export class UpdateStatusDto {
    @IsEnum(EnumOrderStatus, { message: 'Неверный статус заказа' })
    @IsNotEmpty()
    status: EnumOrderStatus
}