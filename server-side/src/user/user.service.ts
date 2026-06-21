import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'; // Импортировали NotFoundException
import { PrismaService } from 'src/prisma.service';
import { hash } from 'argon2';
import { AuthDto } from 'src/auth/dto/auth.dto';
import { EnumUserRole } from '@prisma/client'

@Injectable()
export class UserService {
	constructor(private readonly prisma: PrismaService) {}
		async getAll(user: { id: string, role: string }, searchTerm?: string) {
    // 1. Поиск с учетом прав (важно, чтобы воркер не искал по админам)
    	if (searchTerm) return this.getSearchTermFilter(user, searchTerm);

    // 2. АДМИН видит вообще всех (включая других админов и воркеров)
    	if (user.role === 'ADMIN') {
        	return this.prisma.user.findMany({
            	select: { id: true, email: true, name: true, role: true }
        	});
    	}

    // 3. ВОРКЕР видит всех пользователей (USER) + себя
    // 4. ЮЗЕР видит только себя
    	const filter: any = user.role === 'WORKER' 
    		? { OR: [{ role: EnumUserRole.USER }, { id: user.id }] } 
    		: { id: user.id }

    	return this.prisma.user.findMany({
        	where: filter,
        	select: { id: true, email: true, name: true, role: true }
    	})
	}

	private async getSearchTermFilter(user: { id: string, role: string }, searchTerm: string) {
    // Формируем базовый фильтр прав доступа
    	const accessFilter: any = user.role === 'ADMIN' 
    		? {} 
    		: user.role === 'WORKER' 
        		? { OR: [{ role: EnumUserRole.USER }, { id: user.id }] }
        		: { id: user.id }

    	return this.prisma.user.findMany({
        	where: {
            	AND: [
                	accessFilter, // Сначала ограничиваем область видимости
                	{
                    	OR: [
                        	{ name: { contains: searchTerm, mode: 'insensitive' } },
                        	{ email: { contains: searchTerm, mode: 'insensitive' } }
                    	]
                	}
            	]
        	},
        	include: { orders: true }
    	});
	}
	async getById(requestedId: string, currentUser?: { id: string, role: string }) {
        // Логика доступа:
        // Админ или Воркер могут смотреть любого
        // Юзер может смотреть только свой ID
        if (currentUser && currentUser.role! === 'USER' && currentUser.id !== requestedId) {
            throw new ForbiddenException('Вы можете просматривать только свой профиль');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: requestedId },
            include: { orders: true } // Осторожно с этим (см. ниже)
        });
        
        if (!user) throw new NotFoundException('Пользователь не найден')
        return user
    }

	async getByEmail(email: string) {
    	const user = await this.prisma.user.findUnique({
        	where: { email },
        // Убираем include, так как заказы здесь — лишняя нагрузка и риск утечки
    	})
    
    // Здесь IF не нужен для прав доступа, но нужен для защиты от падения
    	if (!user) {
        	throw new NotFoundException('Пользователь не найден')
    	}
    
    	return user
	}

	async create(dto: AuthDto) {
		return this.prisma.user.create({
			data: {
				name: dto.name,
				email: dto.email,
				password: await hash(dto.password),
				role: EnumUserRole.USER

			}
		})
	}
}
