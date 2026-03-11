import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { EnumOrderStatus } from '@prisma/client'
import { PrismaService } from 'src/prisma.service'
import { ProductDto } from './dto/product.dto'




@Injectable()
export class ProductService {

    constructor(private prisma: PrismaService) {}

    async getAll(userRole?: string, searchTerm?: string) {
        const whereClause: any = searchTerm ? {
            OR: [
                { title: { contains: searchTerm, mode: 'insensitive' } },
                { description: { contains: searchTerm, mode: 'insensitive' } }
            ]
        } : {};

        // Если это не админ, можно добавить логику: например, не показывать товары с price: 0 (черновики)
        if (userRole !== 'ADMIN') {
            whereClause.price = { gt: 0 }; 
        }

        return this.prisma.product.findMany({
            where: whereClause,
            include: { category: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    private async getSearchTermFilter(searchTerm: string) {
    return this.prisma.product.findMany({
        where: {
            OR: [
                { title: { contains: searchTerm, mode: 'insensitive' } },
                { description: { contains: searchTerm, mode: 'insensitive' } }
            ]
        },
        include: {
            category: true
            }
        })
    }

	async getById(id: string) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: { category: true }
        });
        if (!product) throw new NotFoundException('Товар не найден');
        return product;
        }
    

    async getByCategory(categoryId: string) {
		const products = await this.prisma.product.findMany({
			where: {
				category: {
                    id: categoryId
                }
			},
            include: {
                category: true
            }
		})
    

		if (products.length === 0) {
            throw new NotFoundException('Товары не найдены')
        }

		return products
	}

    async getMostPopular() {
        const mostPopularProducts = await this.prisma.orderItem.groupBy({
            by: ['productId'],
            where: {
                order: {
                    is:{
                        status: EnumOrderStatus.COMPLETED
                    }   
                }
            },

            _sum: {
                quantity: true
            },
            orderBy: {
                _sum: {
                    quantity: 'desc'
                }
            },
        })

        const productIds = mostPopularProducts.map(item => item.productId)

        const products = await this.prisma.product.findMany({
            where: {
                id: {
                    in: productIds
                }
            },
            include: {
                category: true
            }
        })

        return products


    }

    async create( dto: ProductDto, userRole: string) {
        if (userRole !== 'ADMIN') throw new ForbiddenException('Только админ может создавать товары');
	    return this.prisma.product.create({
		    data: {
                title: dto.title,
                description: dto.description,
                price: dto.price,
                images: dto.images,
                categoryId: dto.categoryId
		    }
	    })
	}

	async update(id: string, dto: ProductDto, userRole: string) {
        // Проверяем права на уровне сервиса, если не используем Guards
        if (userRole !== 'ADMIN') throw new ForbiddenException('Только админ может менять товары')
        
        await this.getById(id);
        return this.prisma.product.update({ where: { id }, data: dto });
    }

	async delete(id: string, userRole: string) {
        if (userRole !== 'ADMIN') throw new ForbiddenException('Только админ может удалять товары')
		await this.getById(id)

		return this.prisma.product.delete({
			where: {
				id
			}
		})
	}
}
