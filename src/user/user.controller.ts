import { Controller, Get } from '@nestjs/common'
import { UserService } from './user.service'
import { Auth } from 'src/auth/decorators/auth.decorator'
import { CurrentUser } from './decorators/user.decorator'
import { UseGuards } from '@nestjs/common'
import { RolesGuard } from '../auth/guards/roles.guard'
import { AuthGuard } from '@nestjs/passport'
import { Query } from '@nestjs/common'
import { Roles } from '../auth/decorators/roles.decorator'

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get()
    @Roles('ADMIN', 'WORKER')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    async getAll(
        @Query('searchTerm') searchTerm: string,
        @CurrentUser() user: { id: string; role: string } // Достаем юзера из токена
    ) {
        // Теперь сервис точно знает, КТО запрашивает данные
        return this.userService.getAll(user, searchTerm);
    }

    @Auth()
    @Get('profile')
    async getProfile(@CurrentUser('id') id: string) {
        // Для профиля у нас уже есть метод, защищенный Auth()
        return this.userService.getById(id, { id } as any); 
    }
}