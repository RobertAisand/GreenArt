import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  Min,
  MaxLength
} from 'class-validator'
import { Type } from 'class-transformer'
import { EnumOrderStatus } from '@prisma/client'

export class OrderDto {
  @IsOptional()
  @IsEnum(EnumOrderStatus, {
    message: 'Статус заказа должен быть одним из: ' + Object.values(EnumOrderStatus).join(', ')
  })
  status: EnumOrderStatus

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  customerName: string

  @IsString()
  @IsNotEmpty()
  phone: string

  @IsString()
  @IsNotEmpty()
  deliveryType: string

  @IsString()
  @IsNotEmpty()
  deliveryAddress: string

  @IsDateString()
  deliveryDate: string // Преобразуем в Date в сервисе

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string

  @IsArray({
    message: "В заказе нет ни одного товара"
  })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[]
}

export class OrderItemDto {
  @IsNumber({}, { message: 'Количество должно быть числом' })
  @Min(1, { message: 'Количество не может быть меньше 1' })
  quantity: number

  @IsString({ message: 'ID продукта должен быть строкой' })
  @IsNotEmpty()
  productId: string
}