import { IsOptional, IsEnum, IsArray,ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EnumOrderStatus } from '@prisma/client'; // Или путь к твоему файлу с Enum
import { OrderItemDto } from './order.dto'

export class UpdateOrderDto {
    @IsOptional()
    @IsEnum(EnumOrderStatus, {
        message: 'Неверный статус заказа'
    })
    status?: EnumOrderStatus;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true }) 
    @Type(() => OrderItemDto)       
    items?: OrderItemDto[];
}