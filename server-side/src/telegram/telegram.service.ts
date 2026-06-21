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
        this.setupTextHandler();
        
        this.bot.launch().catch(err => console.error('Telegram Bot Launch Error:', err));
        console.log('🚀 Telegram Bot initialized and ready');
    }

    private setupCommands() {
        this.bot.start(async (ctx) => {
            const tgId = ctx.from.id.toString();
            const user = await this.prisma.user.findFirst({ where: { telegramId: tgId } });

            if (user) {
                await ctx.reply(`✅ Вы авторизованы как ${user.email}`);
                return this.sendMainMenu(tgId);
            }

            await ctx.reply(
                '👋 <b>Добро пожаловать в GreenArt!</b>\n\n' +
                'Для работы с заказами пришлите ваш <b>Email</b> и <b>Пароль</b> через пробел.',
                { parse_mode: 'HTML' }
            );
        });

        this.bot.command('orders', async (ctx) => {
            await this.sendOrdersList(ctx.from.id.toString());
        });

        this.bot.command('history', async (ctx) => {
            await this.sendOrderHistory(ctx.from.id.toString(), 0);
        });
    }

    private setupTextHandler() {
        this.bot.on('text', async (ctx, next) => {
            const text = ctx.message.text;
            const tgId = ctx.from.id.toString();
            const message = ctx.message;

            const user = await this.prisma.user.findFirst({ where: { telegramId: tgId } });

            // Обработка ввода стоимости доставки
            if (user && 'reply_to_message' in message && message.reply_to_message && 'text' in message.reply_to_message) {
                if (message.reply_to_message.text.includes('Введите стоимость доставки')) {
                    const deliveryPrice = parseInt(text);
                    if (isNaN(deliveryPrice)) return ctx.reply('❌ Пожалуйста, введите число (например, 500)');

                    const orderIdMatch = message.reply_to_message.text.match(/#([a-z0-9]+)/i);
                    if (orderIdMatch) {
                        const shortId = orderIdMatch[1];
                        const order = await this.prisma.order.findFirst({
                            where: { id: { endsWith: shortId } }
                        });

                        if (order) {
                            await this.orderService.setPaymentDetails(order.id, deliveryPrice);
                            await ctx.reply(`✅ Для заказа #${shortId} установлена доставка ${deliveryPrice}₽.`);
                            return this.sendOrdersList(tgId);
                        }
                    }
                    return ctx.reply('❌ Заказ не найден.');
                }
            }

            // Авторизация
            if (!user) {
                const parts = text.split(/\s+/);
                if (parts.length < 2) return ctx.reply('⚠️ Пришлите: email пароль');

                const email = parts[0].trim().toLowerCase();
                const password = parts[1].trim();

                const dbUser = await this.prisma.user.findUnique({ where: { email } });
                if (!dbUser || !['ADMIN', 'WORKER'].includes(dbUser.role)) return ctx.reply('❌ Доступ запрещен.');

                const isValid = await argon2.verify(dbUser.password!, password);
                if (!isValid) return ctx.reply('❌ Неверный пароль.');

                await this.prisma.user.update({ where: { id: dbUser.id }, data: { telegramId: tgId } });
                await ctx.reply('🎉 Вход выполнен!');
                return this.sendMainMenu(tgId);
            }

            if (text === '/logout') return this.logout(ctx, user.id);
            if (text === '/orders') return this.sendOrdersList(user.telegramId!);
            
            return next();
        });
    }

    private setupActions() {
        this.bot.action('main_menu', async (ctx) => {
            await ctx.answerCbQuery();
            await this.sendMainMenu(ctx.from.id.toString());
        });

        this.bot.action(/manage_(.+)/, async (ctx) => {
            const orderId = ctx.match[1];
            const order = await this.prisma.order.findUnique({ 
                where: { id: orderId },
                include: { items: { include: { product: true } } }
            });
            if (!order) return ctx.answerCbQuery('Заказ не найден');

            const itemsList = order.items.map(i => i.product.title).join(', ');

            await ctx.editMessageText(
                `⚙️ <b>Управление заказом #${order.id.slice(-6)}</b>\n` +
                `Состав: ${itemsList}\n` +
                `Сумма: ${order.total}₽\n\n` +
                `Выберите действие:`,
                {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('🚚 Ссылка на оплату (+Доставка)', `ask_delivery_${orderId}`)],
                        [Markup.button.callback('📦 В сборку (Самовывоз)', `set_status_${orderId}_${EnumOrderStatus.IN_PROGRESS}`)],
                        [Markup.button.callback('🚫 Отменить заказ', `confirm_cancel_${orderId}`)],
                        [Markup.button.callback('⬅️ Назад', 'refresh_list')]
                    ])
                }
            );
        });

        this.bot.action(/ask_delivery_(.+)/, async (ctx) => {
            const orderId = ctx.match[1];
            await ctx.answerCbQuery();
            await ctx.reply(
                `💰 <b>Введите стоимость доставки</b> для заказа <code>#${orderId.slice(-6)}</code>\n` +
                `Сумма будет добавлена к итогу ЮKassa.`,
                { parse_mode: 'HTML', ...Markup.forceReply() }
            );
        });

        this.bot.action(/history_page_(\d+)/, async (ctx) => {
            const page = parseInt(ctx.match[1]);
            await ctx.answerCbQuery();
            await ctx.deleteMessage().catch(() => {});
            await this.sendOrderHistory(ctx.from.id.toString(), page);
        });

        this.bot.action(/confirm_cancel_(.+)/, async (ctx) => {
            const orderId = ctx.match[1];
            await ctx.editMessageText(
                `⚠️ Отменить заказ #${orderId.slice(-6)}?`,
                Markup.inlineKeyboard([
                    [
                        Markup.button.callback('✅ Да', `set_status_${orderId}_${EnumOrderStatus.CANCELLED}`),
                        Markup.button.callback('⬅️ Нет', `manage_${orderId}`)
                    ]
                ])
            );
        });

        this.bot.action(/^set_status_(.+?)_(.+)$/, async (ctx) => {
            const orderId = ctx.match[1];
            const newStatus = ctx.match[2] as EnumOrderStatus;
            try {
                await this.prisma.order.update({ where: { id: orderId }, data: { status: newStatus } });
                await ctx.answerCbQuery(`Обновлено: ${newStatus}`);
                await this.editToOrdersList(ctx);
            } catch (e: any) {
                await ctx.reply(`❌ Ошибка: ${e.message}`);
            }
        });

        this.bot.action('refresh_list', async (ctx) => {
            await ctx.answerCbQuery('Обновлено');
            await this.editToOrdersList(ctx);
        });
    }

    async sendMainMenu(chatId: string) {
        await this.bot.telegram.sendMessage(chatId, '📱 <b>Меню управления</b>', {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('📥 Активные заказы', 'refresh_list')],
                [Markup.button.callback('📜 История', 'history_page_0')]
            ])
        });
    }

    async sendOrdersList(chatId: string) {
        const { text, keyboard } = await this.prepareOrdersListData();
        await this.bot.telegram.sendMessage(chatId, text, { parse_mode: 'HTML', ...keyboard });
    }

    private async editToOrdersList(ctx: any) {
        const { text, keyboard } = await this.prepareOrdersListData();
        await ctx.editMessageText(text, { parse_mode: 'HTML', ...keyboard }).catch(() => {});
    }

    private async prepareOrdersListData() {
        const orders = await this.prisma.order.findMany({
            where: { status: { in: [EnumOrderStatus.PENDING, EnumOrderStatus.AWAITING_PAYMENT, EnumOrderStatus.IN_PROGRESS] } },
            include: { items: { include: { product: true } } },
            orderBy: { createdAt: 'asc' }
        });

        if (orders.length === 0) {
            return {
                text: '🎉 Активных заказов нет.',
                keyboard: Markup.inlineKeyboard([[Markup.button.callback('🔄 Обновить', 'refresh_list')], [Markup.button.callback('🏠 Меню', 'main_menu')]])
            };
        }

        let text = `📋 <b>Список активных заказов:</b>\n\n`;
        const buttons: any[][] = [];

        orders.forEach((o, i) => {
            const statusIcon = o.status === 'PENDING' ? '🆕' : o.status === 'AWAITING_PAYMENT' ? '⏳' : '📦';
            const items = o.items.map(item => `  • ${item.product.title} (${item.quantity} шт.)`).join('\n');

            text += `${i + 1}. 🆔 <b>#${o.id.slice(-6)}</b> — ${statusIcon} <b>${o.status}</b>\n`;
            text += `👤 <b>Клиент:</b> ${o.customerName}\n`;
            text += `📞 <b>Тел:</b> <code>${o.phone}</code>\n`;
            text += `📦 <b>Состав:</b>\n${items}\n`;
            text += `💰 <b>Итого:</b> ${o.total} руб.\n`;
            if (o.deliveryAddress) text += `📍 <b>Адрес:</b> ${o.deliveryAddress}\n`;
            if (o.comment) text += `💬 <b>Комм:</b> <i>${o.comment}</i>\n`;
            text += `──────────────────\n`;

            buttons.push([Markup.button.callback(`⚙️ Управлять #${o.id.slice(-6)}`, `manage_${o.id}`)]);
        });

        buttons.push([Markup.button.callback('🔄 Обновить список', 'refresh_list')], [Markup.button.callback('🏠 Меню', 'main_menu')]);
        return { text, keyboard: Markup.inlineKeyboard(buttons) };
    }

    async sendOrderHistory(chatId: string, page: number) {
        const limit = 5;
        const skip = page * limit;
        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where: { status: { in: [EnumOrderStatus.COMPLETED, EnumOrderStatus.CANCELLED] } },
                orderBy: { createdAt: 'desc' },
                skip, take: limit
            }),
            this.prisma.order.count({ where: { status: { in: [EnumOrderStatus.COMPLETED, EnumOrderStatus.CANCELLED] } } })
        ]);

        let text = `📜 <b>История (Стр. ${page + 1})</b>\n\n`;
        orders.forEach(o => {
            text += `${o.status === 'COMPLETED' ? '✅' : '❌'} #${o.id.slice(-6)} | ${o.total}₽ | ${o.createdAt.toLocaleDateString()}\n`;
        });

        const nav: any[] = [];
        if (page > 0) nav.push(Markup.button.callback('⬅️', `history_page_${page - 1}`));
        if (skip + limit < total) nav.push(Markup.button.callback('➡️', `history_page_${page + 1}`));

        await this.bot.telegram.sendMessage(chatId, text, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([nav, [Markup.button.callback('🏠 Меню', 'main_menu')]])
        });
    }

    async sendNewOrderAlert(order: any) {
        const workers = await this.prisma.user.findMany({
            where: { telegramId: { not: null }, role: { in: ['ADMIN', 'WORKER'] } }
        });
        for (const worker of workers) {
            if (worker.telegramId) {
                await this.bot.telegram.sendMessage(worker.telegramId, `🔔 <b>Новый заказ #${order.id.slice(-6)}!</b>`, { parse_mode: 'HTML' });
                await this.sendOrdersList(worker.telegramId);
            }
        }
    }

    private async logout(ctx: any, userId: string) {
        await this.prisma.user.update({ where: { id: userId }, data: { telegramId: null } });
        await ctx.reply('📴 Вы вышли из системы.');
    }
}