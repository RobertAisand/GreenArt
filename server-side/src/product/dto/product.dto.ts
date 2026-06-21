import { 
    ArrayMinSize, 
    IsNotEmpty, 
    IsNumber, 
    IsString, 
    Min, 
    MaxLength, 
    ArrayNotEmpty 
} from "class-validator"

export class ProductDto {
    @IsString()
    @IsNotEmpty({ message: 'Название не может быть пустым' })
    @MaxLength(100, { message: 'Название слишком длинное' }) // Защита от DoS
    title: string

    @IsString()
    @IsNotEmpty({ message: 'Описание не может быть пустым' })
    @MaxLength(2000, { message: 'Описание не может превышать 2000 символов' })
    description: string

    @IsNumber({}, { message: 'Цена должна быть числом' })
    @IsNotEmpty({message: 'Цена не может быть пустой'})
    @Min(0, { message: 'Цена не может быть отрицательной' })
    price: number

    @IsString({message: 'Укажите хотябы одну картинку', each: true})
    @ArrayMinSize(1, { message: 'Укажите хотябы одну картинку'})
    @IsNotEmpty({ each: true})
    images: string[]

    @IsString({
        message: 'Категория обязательна'
    })
    @IsNotEmpty({
        message: 'Категория не может быть пустой'
    })
    categoryId: string
}