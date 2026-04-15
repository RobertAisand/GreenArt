// src/order/order.service.ts
import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { OrderDto } from './dto/order.dto'
import { UpdateOrderDto } from './dto/update-order.dto'
import { Prisma } from '@prisma/client'
import { EnumOrderStatus } from '@prisma/client'
import { EnumDeliveryType } from '@prisma/client'
import { YooCheckout, ICreatePayment } from '@a2seven/yoo-checkout'
import { v4 as uuidv4 } from 'uuid'
import { TelegramService } from 'src/telegram/telegram.service'

@Injectable()
export class OrderService {
    private checkout: YooCheckout;

    constructor(private prisma: PrismaService, private readonly telegramService: TelegramService) {
        // Инициализируем через новый пакет
        this.checkout = new YooCheckout({
            shopId: process.env.YOOKASSA_SHOP_ID || '',
            secretKey: process.env.YOOKASSA_SECRET_KEY || ''
        });
    }

    async setPaymentDetails(orderId: string, shippingPrice: number) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true }
        });

        if (!order) throw new NotFoundException('Заказ не найден');

        const subTotal = order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const finalShipping = order.deliveryType === EnumDeliveryType.PICKUP ? 0 : shippingPrice;
        const finalTotal = subTotal + finalShipping;

        try {
            // Структура запроса в этом пакете чуть-чуть отличается
            const createPayload: ICreatePayment = {
                amount: {
                    value: finalTotal.toFixed(2),
                    currency: 'RUB'
                },
                confirmation: {
                    type: 'redirect',
                    return_url: 'https://google.com'
                },
                capture: true,
                description: `Оплата заказа №${order.id}`,
                metadata: { orderId: order.id }
            };

            // Вызываем через this.checkout
            const payment = await this.checkout.createPayment(createPayload, uuidv4());

            return this.prisma.order.update({
                where: { id: orderId },
                data: {
                    paymentLink: payment.confirmation.confirmation_url,
                    shippingPrice: finalShipping,
                    total: finalTotal,
                    status: EnumOrderStatus.AWAITING_PAYMENT
                }
            });
        } catch (error) {
            console.error('YooCheckout Error:', error);
            throw new BadRequestException('Ошибка платежной системы: ' + error.message);
        }
    }

    async handleWebhook(data: any) {
        if (data.event === 'payment.succeeded') {
            const orderId = data.object.metadata?.orderId;
            if (!orderId) return { status: 'error' };

            // 1. Обновляем статус на Оплачено (CONFIRMED)
            const updatedOrder = await this.prisma.order.update({
                where: { id: orderId },
                data: { status: EnumOrderStatus.CONFIRMED },
                include: { items: { include: { product: true } } }
            });

            // 2. Получаем всех воркеров с telegramId, чтобы обновить им списки
            const workers = await this.prisma.user.findMany({
                where: { 
                    telegramId: { not: null },
                    role: { in: ['ADMIN', 'WORKER'] }
                }
            });

            // 3. Рассылаем уведомление об оплате и обновляем их основной список
            for (const worker of workers) {
                if (worker.telegramId) {
                    // Опционально: короткое уведомление, что заказ оплачен
                    await this.telegramService.sendNewOrderAlert({
                        ...updatedOrder,
                        customMessage: `💰 Заказ #${orderId.slice(-6)} успешно оплачен!` 
                    });
                    // Список обновится автоматически внутри sendNewOrderAlert или вызови отдельно:
                    // await this.telegramService.sendOrdersList(worker.telegramId);
                }
            }
            
            return { status: 'ok' };
        }
        return { status: 'ok' };
    }

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
        const productIds = dto.items.map(item => item.productId);
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds } }
        });

        let total = 0;
        const itemsData = dto.items.map(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) throw new NotFoundException(`Товар ${item.productId} не найден`);
            
            total += product.price * item.quantity;
            return { 
                quantity: item.quantity, 
                price: product.price, 
                productId: item.productId 
            };
        });

        const order = await this.prisma.order.create({
            data: {
                total,
                customerName: dto.customerName,
                phone: dto.phone,
                deliveryType: dto.deliveryType,
                deliveryAddress: dto.deliveryAddress,
                deliveryDate: new Date(dto.deliveryDate),
                comment: dto.comment,
                status: EnumOrderStatus.PENDING,
                userId: userId,
                items: { create: itemsData }
            },
            include: { items: { include: { product: true } } }
        });

        // Вызываем метод алертов, который мы написали в TelegramService
        // Он отправит уведомление и сразу подгрузит обновленный список
        await this.telegramService.sendNewOrderAlert(order);

        return order;
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
        const order = await this.getById(id, user);

        if (user.role !== 'ADMIN') {
            // Приводим тип к строке, чтобы сравнение в массиве работало без ошибок TS
            const currentStatus = order.status as string;
            
            if (!['PENDING', 'AWAITING_PAYMENT'].includes(currentStatus)) {
                throw new ForbiddenException(
                    'Удалить можно только заказ, который еще не начали собирать'
                );
            }
        }
        
        return this.prisma.order.delete({ where: { id: order.id } });
    }

    async updateStatus(orderId: string, status: string, paymentLink?: string) {
    return this.prisma.order.update({
        where: { id: orderId },
        data: {
            status: status as EnumOrderStatus,
            paymentLink: paymentLink || undefined
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