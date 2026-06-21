import { Controller, Get, Param, ValidationPipe, UseGuards } from '@nestjs/common'
import { CategoryService } from './category.service'
import { Auth } from 'src/auth/decorators/auth.decorator'
import { Body, Delete, HttpCode, Put, UsePipes } from '@nestjs/common'
import { CategoryDto } from './dto/category.dto'
import { Roles } from '../auth/decorators/roles.decorator'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CurrentUser } from 'src/user/decorators/user.decorator'

@Controller('categories')
export class CategoryController {
	constructor(private readonly categoryService: CategoryService) {}

	@Auth()
	@Get('by-id/:id')
	async getById(@Param('id') id: string) {
		return this.categoryService.getById(id)
	}

	@UseGuards(RolesGuard)
    @Roles('ADMIN')
	@UsePipes(new ValidationPipe())
	@HttpCode(200)
	@Auth()
	@Put(':id')
	async update(
        @Param('id') id: string, 
        @Body() dto: CategoryDto,
        @CurrentUser('role') userRole: string // Извлекаем роль
    ) {
        return this.categoryService.update(id, dto, userRole) // Передаем её
    }

	@UseGuards(RolesGuard)
    @Roles('ADMIN')
	@HttpCode(200)
	@Auth()
	@Delete(':id')
	async delete(
        @Param('id') id: string,
        @CurrentUser('role') userRole: string // Извлекаем роль
    ) {
        return this.categoryService.delete(id, userRole) // Передаем её
    }
}
