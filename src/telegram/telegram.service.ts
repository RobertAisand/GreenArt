import { Injectable, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { Telegraf, Markup } from 'telegraf';
import { PrismaService } from 'src/prisma.service';
import { OrderService } from 'src/order/order.service';
import * as argon2 from 'argon2';
import { EnumOrderStatus } from '@prisma/client';

@Injectable()
export class TelegramService implements OnModuleInit {
    private bot: Telegraf;

    constructor(
        private prisma: PrismaService,
        @Inject(forwardRef(() => OrderService))
        private orderService: OrderService,
    ) {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) throw new Error('TELEGRAM_BOT_TOKEN is missing in .env');
        this.bot = new Telegraf(token);
    }

    onModuleInit() {
        this.setupCommands();
        this.setupActions();
        
        this.bot.launch().catch(err => console.error('Telegram Bot Launch Error:', err));
        console.log('🚀 Telegram Bot initialized and ready');
    }

    private setupCommands() {
        this.bot.start(async (ctx) => {
            const tgId = ctx.from.id.toString();
            const user = await this.prisma.user.findFirst({ where: { telegramId: tgId } });

            if (user) {
                await ctx.reply(`✅ Вы авторизованы как ${user.email} (${user.role})`);
                return this.sendOrdersList(tgId);
            }

            await ctx.reply(
                '👋 <b>Добро пожаловать в GreenArt!</b>\n\n' +
                'Для работы с заказами пришлите ваш <b>Email</b> и <b>Пароль</b> через пробел.',
                { parse_mode: 'HTML' }
            );
        });

        this.bot.command('orders', async (ctx) => {
            const tgId = ctx.from.id.toString();
            await this.sendOrdersList(tgId);
        });

        this.bot.on('text', async (ctx) => {
            const text = ctx.message.text;
            const tgId = ctx.from.id.toString();

            const existingUser = await this.prisma.user.findFirst({ where: { telegramId: tgId } });
            
            if (existingUser) {
                if (text === '/logout') return this.logout(ctx, existingUser.id);
                if (text === '/orders') return this.sendOrdersList(tgId);
                return ctx.reply('Используйте /orders для управления списком.');
            }

            const parts = text.split(/\s+/);
            if (parts.length < 2) return ctx.reply('⚠️ Формат: email пароль');

            const email = parts[0].trim().toLowerCase();
            const password = parts[1].trim();

            try {
                const user = await this.prisma.user.findUnique({ where: { email } });

                if (!user || !['ADMIN', 'WORKER'].includes(user.role)) {
                    return ctx.reply('❌ Доступ запрещен.');
                }

                if (!user.password || !user.password.startsWith('$argon2')) {
                    return ctx.reply('❌ Ошибка: пароль в базе имеет неверный формат.');
                }

                const isValid = await argon2.verify(user.password, password);
                if (!isValid) return ctx.reply('❌ Неверный пароль.');

                await this.prisma.user.update({
                    where: { id: user.id },
                    data: { telegramId: tgId }
                });

                await ctx.reply('🎉 Вход выполнен! Загружаю список заказов...');
                await this.sendOrdersList(tgId);

            } catch (error: any) {
                console.error('Auth Error:', error.message);
                ctx.reply('🔥 Ошибка при авторизации.');
            }
        });
    }

    private setupActions() {
        this.bot.action(/manage_(.+)/, async (ctx) => {
            const orderId = ctx.match[1];
            const order = await this.prisma.order.findUnique({ where: { id: orderId } });
            if (!order) return ctx.answerCbQuery('Заказ не найден');

            await ctx.editMessageText(
                `⚙️ <b>Управление заказом #${order.id.slice(-6)}</b>\n` +
                `Клиент: ${order.customerName}\n` +
                `Выберите новое состояние:`,
                {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('💳 Ожидание оплаты', `set_status_${orderId}_AWAITING_PAYMENT`)],
                        [Markup.button.callback('🚫 Отменить заказ', `confirm_cancel_${orderId}`)],
                        [Markup.button.callback('⬅️ Назад к списку', 'refresh_list')]
                    ])
                }
            );
        });

        this.bot.action(/confirm_cancel_(.+)/, async (ctx) => {
            const orderId = ctx.match[1];
            await ctx.editMessageText(
                `⚠️ <b>Вы уверены, что хотите ОТМЕНИТЬ заказ #${orderId.slice(-6)}?</b>\n\n` +
                `Это действие изменит статус заказа на CANCELLED.`,
                {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [
                            Markup.button.callback('✅ Да, отменить', `set_status_${orderId}_CANCELLED`),
                            Markup.button.callback('⬅️ Нет, назад', `manage_${orderId}`)
                        ]
                    ])
                }
            );
        });

        this.bot.action(/^set_status_(.+?)_(.+)$/, async (ctx) => {
            const orderId = ctx.match[1];
            const newStatus = ctx.match[2] as EnumOrderStatus;

            try {
                if (newStatus === EnumOrderStatus.AWAITING_PAYMENT) {
                    await this.orderService.setPaymentDetails(orderId, 0);
                } else {
                    await this.prisma.order.update({
                        where: { id: orderId },
                        data: { status: newStatus }
                    });
                }
                await ctx.answerCbQuery(`Статус обновлен`);
                await this.editToOrdersList(ctx);
            } catch (e: any) {
                console.error('Action Error:', e.message);
                await ctx.reply(`❌ Ошибка: ${e.message}`);
            }
        });

        this.bot.action('refresh_list', async (ctx) => {
            try {
                await ctx.answerCbQuery('Обновление...');
                await this.editToOrdersList(ctx);
            } catch (e) {
                await ctx.answerCbQuery();
            }
        });
    }

    async sendOrdersList(chatId: string) {
        const { text, keyboard } = await this.prepareOrdersListData();
        await this.bot.telegram.sendMessage(chatId, text, {
            parse_mode: 'HTML',
            ...keyboard
        });
    }

    private async editToOrdersList(ctx: any) {
        const { text, keyboard } = await this.prepareOrdersListData();
        await ctx.editMessageText(text, {
            parse_mode: 'HTML',
            ...keyboard
        });
    }

    private async prepareOrdersListData() {
        const orders = await this.prisma.order.findMany({
            where: {
                status: { in: [EnumOrderStatus.PENDING, EnumOrderStatus.AWAITING_PAYMENT] }
            },
            include: { 
                items: { 
                    include: { product: true } 
                } 
            },
            orderBy: { createdAt: 'asc' }
        });

        if (orders.length === 0) {
            return {
                text: '🎉 <b>Все заказы обработаны!</b>\nНовых задач пока нет.',
                keyboard: Markup.inlineKeyboard([[Markup.button.callback('🔄 Обновить', 'refresh_list')]])
            };
        }

        let text = `📋 <b>Список активных заказов:</b>\n\n`;
        const buttons: any[][] = [];

        orders.forEach((order, index) => {
            const statusIcon = order.status === 'PENDING' ? '🆕' : '⏳';
            const itemsList = order.items.map(item => `  • ${item.product.title} (${item.quantity} шт.)`).join('\n');

            text += `${index + 1}. 🆔 <b>#${order.id.slice(-6)}</b> — ${statusIcon} <b>${order.status}</b>\n`;
            text += `👤 <b>Клиент:</b> ${order.customerName}\n`;
            text += `📞 <b>Тел:</b> <code>${order.phone}</code>\n`;
            text += `📦 <b>Состав:</b>\n${itemsList}\n`;
            text += `💰 <b>Итого:</b> ${order.total} руб.\n`;
            if (order.deliveryAddress) text += `📍 <b>Адрес:</b> ${order.deliveryAddress}\n`;
            if (order.comment) text += `💬 <b>Комм:</b> <i>${order.comment}</i>\n`;
            text += `──────────────────\n`;

            buttons.push([Markup.button.callback(`⚙️ Управлять #${order.id.slice(-6)}`, `manage_${order.id}`)]);
        });

        buttons.push([Markup.button.callback('🔄 Обновить список', 'refresh_list')]);
        return { text, keyboard: Markup.inlineKeyboard(buttons) };
    }

    async sendNewOrderAlert(order: any) {

        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            if (new Date(order.createdAt) < tenMinutesAgo) {
                console.log(`[Telegram] Пропуск уведомления для старого заказа #${order.id}`);
                return;
            }

        const workers = await this.prisma.user.findMany({
            where: { telegramId: { not: null }, role: { in: ['ADMIN', 'WORKER'] } }
        });

        for (const worker of workers) {
            if (worker.telegramId) {
                try {
                    await this.bot.telegram.sendMessage(
                        worker.telegramId, 
                        `🔔 <b>Поступил новый заказ #${order.id.slice(-6)}!</b>`,
                        { parse_mode: 'HTML' }
                    );
                    await this.sendOrdersList(worker.telegramId);
                } catch (e) {
                    console.error(`Ошибка отправки уведомления: ${worker.telegramId}`);
                }
            }
        }
    }

    private async logout(ctx: any, userId: string) {
        await this.prisma.user.update({ where: { id: userId }, data: { telegramId: null } });
        await ctx.reply('📴 Вы вышли из системы.');
    }
}