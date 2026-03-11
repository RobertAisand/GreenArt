import { 
  IsEnum, 
  IsString, 
  IsBoolean, 
  IsObject, 
  ValidateNested, 
  IsDateString,   
  MaxLength,       
  IsNotEmpty,
  IsDefined    
} from 'class-validator'
import { Type } from 'class-transformer'

export enum DeliveryStatus {
  PENDING = 'pending',          // Ожидание подтверждения
  CONFIRMED = 'confirmed',      // Подтвержден
  IN_PROGRESS = 'in_progress',  // В процессе (собираем букет / едем)
  COMPLETED = 'completed',      // Доставлен / Забран
  CANCELED = 'canceled'         // Отменен
}

export enum DeliveryType {
  COURIER = 'courier',
  PICKUP = 'pickup'
}

class AmountDelivery{
    @IsString()
    @IsNotEmpty()
    value: string

    @IsString()
    @IsNotEmpty()
    currency: string
}

export class AmountDeliveryDto {
    @IsString()
    @IsNotEmpty()
    id: string;

    @IsEnum(DeliveryStatus)
    status: DeliveryStatus;

}

class DeliveryMethodDto {
    @IsEnum(DeliveryType)
    type: DeliveryType;

    @IsString()
    id: string;

    @IsBoolean()
    saved: boolean;

    @IsString()
    title: string;
}

export class ObjectDeliveryDto {
    @IsString()
    @IsNotEmpty()
    id: string;

    @IsEnum(DeliveryStatus)
    status: DeliveryStatus;

    @IsDefined()
    @ValidateNested()
    @Type(() => AmountDeliveryDto)
    amount: AmountDeliveryDto

    @IsDefined()
    @ValidateNested()
    @Type(() => DeliveryMethodDto)
    delivery_method: DeliveryMethodDto

    @IsDateString()
    created_at: string

    @IsDateString()
    expires_at: string;

    @IsString()
    @MaxLength(1000)
    description: string;
}
