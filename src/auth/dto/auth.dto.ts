import { IsEmail, IsOptional, IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator'

export class AuthDto {
	@IsOptional()
	@IsString()
	@MaxLength(50)
	name?: string

	@IsEmail({}, { message: 'Введите корректный email' })
    @IsNotEmpty({ message: 'Почта обязательна' })
    email: string

	@IsString({ message: 'Пароль обязателен' })
    @IsNotEmpty({ message: 'Пароль обязателен' })
    @MinLength(6, { message: 'Пароль должен быть не меньше 6 символов' })
    @MaxLength(128, { message: 'Пароль слишком длинный' }) // Защита от DoS
    password: string
}
