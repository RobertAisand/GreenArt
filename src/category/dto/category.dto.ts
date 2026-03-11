import { IsString, IsNotEmpty, MaxLength } from 'class-validator'

export class CategoryDto {
    @IsString({ message: 'Название должно быть строкой' })
    @IsNotEmpty({ message: 'Название не может быть пустым' })
    @MaxLength(100, { message: 'Название не может превышать 100 символов' })
    title: string

    @IsString({ message: 'Описание должно быть строкой' })
    @IsNotEmpty({ message: 'Описание не может быть пустым' })
    @MaxLength(2000, { message: 'Описание не может превышать 2000 символов' })
    description: string
}
