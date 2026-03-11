import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { CategoryDto } from './dto/category.dto'

@Injectable()
export class CategoryService {
	constructor(private prisma: PrismaService) {}

	async getById(id: string) {
		const category = await this.prisma.category.findFirst({
			where: {
				id
			}
		})

		if (!category) throw new NotFoundException('Категория не найдена')

		return category
	}

	async create(dto: CategoryDto, userRole: string) {
        if (userRole !== 'ADMIN') throw new ForbiddenException('Нет прав на создание')
        
        return this.prisma.category.create({
            data: {
                title: dto.title,
                description: dto.description
            }
        })
    }

	async update(id: string, dto: CategoryDto, userRole: string) {
        if (userRole !== 'ADMIN') throw new ForbiddenException('Нет прав на изменение')
        
        await this.getById(id)

        return this.prisma.category.update({
            where: { id },
            data: dto
        })
    }

	async delete(id: string, userRole: string) {
        if (userRole !== 'ADMIN') throw new ForbiddenException('Нет прав на удаление')
        
        await this.getById(id)

        return this.prisma.category.delete({
            where: { id }
        })
    }
}
