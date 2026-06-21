import { IsEnum, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { EnumOrderStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger'; // Импортируем декоратор

export class UpdateStatusDto {
    @ApiProperty({ 
        enum: EnumOrderStatus, 
        description: 'Новый статус заказа',
        example: EnumOrderStatus.CONFIRMED 
    })
    @IsEnum(EnumOrderStatus, { message: 'Неверный статус заказа' })
    @IsNotEmpty()
    status: EnumOrderStatus

    @ApiProperty({ 
        required: false, 
        description: 'Ссылка на оплату (если нужно обновить вручную)',
        example: 'https://yookassa.ru/...' 
    })
    @IsOptional()
    @IsString()
    paymentLink?: string
}