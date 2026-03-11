// src/order/order.service.ts
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { OrderDto } from './dto/order.dto'
import { UpdateOrderDto } from './dto/update-order.dto'
import { Prisma } from '@prisma/client'
import { EnumOrderStatus } from '@prisma/client'


@Injectable()
export class OrderService {
    constructor(private prisma: PrismaService) {}

    async getAll(user: { id: string, role: string }, searchTerm?: string) {
        const whereClause: Prisma.OrderWhereInput = searchTerm 
            ? { customerName: { contains: searchTerm, mode: 'insensitive' } }: {}

        if (user.role === 'ADMIN') 
            return this.prisma.order.findMany({ 
                where: whereClause,
                include: { items: { include: { product: true } } } // Добавлено
            })
        const filter = user.role === 'USER' ? { userId: user.id } : {}
        
        return this.prisma.order.findMany({ 
            where: { ...whereClause, ...filter },
            include: { items: { include: { product: true } } } // Добавлено
        });
    }

    async getById(id: string, user: { id: string, role: string }) {
        const order = await this.prisma.order.findFirst({ 
            where: { 
                id,
                ... (user.role === 'USER' ? { userId: user.id } : {}) 
            },
            include: { items: { include: { product: true } } }
        })
        if (!order) throw new NotFoundException('Заказ не найден или доступ запрещен')
        return order
    }

    async getByUserId(targetUserId: string, currentUser: { id: string, role: string }) {
        if (currentUser.role !== 'ADMIN' && currentUser.id !== targetUserId) {
            throw new ForbiddenException('Вы не имеете доступа к чужим заказам')
        }

        return this.prisma.order.findMany({ 
            where: { userId: targetUserId },
            include: { items: { include: { product: true } } },
            orderBy: { createdAt: 'desc' }
        })
    }

    async create(dto: OrderDto, userId: string) {
        const productIds = dto.items.map(item => item.productId)
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds } }
        })
        let total = 0;
        const itemsData = dto.items.map(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) throw new NotFoundException(`Товар ${item.productId} не найден`);
        
            const itemPrice = product.price; // Берем цену из БД, а не из DTO!
            total += itemPrice * item.quantity;
        
            return {
                quantity: item.quantity,
                price: itemPrice, // Записываем цену на момент покупки
                productId: item.productId
            }
        })
        return this.prisma.order.create({
            data: {
                total: total,
                customerName: dto.customerName,
                phone: dto.phone,
                deliveryType: dto.deliveryType,
                deliveryAddress: dto.deliveryAddress,
                deliveryDate: new Date(dto.deliveryDate), // Важно!
                comment: dto.comment,
                status: 'PENDING',
                userId: userId,
                items: {
                    create: itemsData
                }
            }
        })
    }

    async updateOrder(orderId: string, user: { id: string, role: string }, dto: UpdateOrderDto) {
    const order = await this.getById(orderId, user)
    if (!order) throw new NotFoundException('Заказ не найден')

    if (user.role !== 'ADMIN' && order.status !== 'PENDING') {
            throw new ForbiddenException('Заказ можно менять только в статусе ожидания');
    }
    
    const { items, ...orderData } = dto;
    const itemsData = items ? await this.mapItemsWithPrice(items) : undefined;
    const total = itemsData ? itemsData.reduce((sum, item) => sum + (item.price * item.quantity), 0) : undefined;
    return this.prisma.order.update({
        where: { id: orderId },
        data: {
            ...orderData,
            total,
            items: itemsData ? {
                deleteMany: {}, // Удаляем старые
                create: itemsData
                } : undefined
            }
        })
    }

    async delete(id: string, user: { id: string, role: string }) {
        const order = await this.getById(id, user)
        if (user.role !== 'ADMIN') {
            if (order.status !== 'PENDING') {
                throw new ForbiddenException('Удалить можно только заказ в статусе ожидания');
            }
        }
        return this.prisma.order.delete({ where: { id: order.id } })
    }

    async updateStatus(orderId: string, status: string) {
    return this.prisma.order.update({
        where: { id: orderId },
        data: {
            status: status as EnumOrderStatus 
            }
        })
    }

    private async mapItemsWithPrice(items: { productId: string; quantity: number }[]) {
        const productIds = items.map(item => item.productId);
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds } }
        });

        return items.map(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) throw new NotFoundException(`Товар ${item.productId} не найден`);
        
            return {
                quantity: item.quantity,
                price: product.price, // Берем актуальную цену
                productId: item.productId
            };
        });
    }
}