const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const BOT_TOKEN = '8268637577:AAGC4_AcnsiMJ5RTdhVyr5e6JOfjC4AZY34';
const bot = new Telegraf(BOT_TOKEN);

// Список API для курсов валют (с резервом)
const apis = [
    {
        name: 'exchangerate.host',
        url: 'https://api.exchangerate.host/latest?base=USD',
        parse: (data) => ({ rub: data.rates.RUB, rsd: data.rates.RSD, eur: data.rates.EUR })
    },
    {
        name: 'open.er-api.com',
        url: 'https://open.er-api.com/v6/latest/USD',
        parse: (data) => ({ rub: data.rates.RUB, rsd: data.rates.RSD, eur: data.rates.EUR })
    },
    {
        name: 'currencyapi.com',
        url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
        parse: (data) => ({ rub: data.usd.rub, rsd: data.usd.rsd, eur: data.usd.eur })
    },
    {
        name: 'exchangerate-api.com',
        url: 'https://api.exchangerate-api.com/v4/latest/USD',
        parse: (data) => ({ rub: data.rates.RUB, rsd: data.rates.RSD, eur: data.rates.EUR })
    }
];

// Функция для получения курсов
async function getExchangeRates() {
    for (const api of apis) {
        try {
            console.log(`Пробуем API: ${api.name}`);
            const response = await axios.get(api.url, { timeout: 5000 });
            
            if (response.status === 200 && response.data) {
                const rates = api.parse(response.data);
                
                if (rates.rub && rates.rsd && rates.eur) {
                    return {
                        rub: rates.rub,
                        rsd: rates.rsd,
                        eur: rates.eur,
                        source: api.name
                    };
                }
            }
        } catch (error) {
            console.log(`API ${api.name} не сработал: ${error.message}`);
        }
    }
    return null;
}

// Команда /start - главное меню
bot.start(async (ctx) => {
    await ctx.reply(
        '👋 Привет! Я бот для отслеживания курсов валют.\n\n' +
        '📊 Выберите валютную пару:',
        Markup.keyboard([
            ['🇺🇸 USD → 🇷🇺 RUB', '🇪🇺 EUR → 🇷🇺 RUB'],
            ['🇺🇸 USD → 🇷🇸 RSD', '🇪🇺 EUR → 🇷🇸 RSD'],
            ['📈 Все курсы сразу']
        ]).resize()
    );
});

// Обработчик для всех кнопок
bot.hears(/^🇺🇸 USD → 🇷🇺 RUB$/, async (ctx) => {
    await showRate(ctx, 'USD', 'RUB', '🇺🇸 → 🇷🇺');
});

bot.hears(/^🇪🇺 EUR → 🇷🇺 RUB$/, async (ctx) => {
    await showRate(ctx, 'EUR', 'RUB', '🇪🇺 → 🇷🇺');
});

bot.hears(/^🇺🇸 USD → 🇷🇸 RSD$/, async (ctx) => {
    await showRate(ctx, 'USD', 'RSD', '🇺🇸 → 🇷🇸');
});

bot.hears(/^🇪🇺 EUR → 🇷🇸 RSD$/, async (ctx) => {
    await showRate(ctx, 'EUR', 'RSD', '🇪🇺 → 🇷🇸');
});

bot.hears('📈 Все курсы сразу', async (ctx) => {
    await showAllRates(ctx);
});

// Функция для показа одной валютной пары
async function showRate(ctx, from, to, emoji) {
    const msg = await ctx.reply('⏳ Загружаю курс...');
    
    try {
        const rates = await getExchangeRates();
        
        if (!rates) {
            await ctx.reply('❌ Не удалось получить курсы. Попробуйте позже.');
            await ctx.deleteMessage(msg.message_id);
            return;
        }
        
        let rate;
        let label;
        
        // Вычисляем нужный курс
        if (from === 'USD' && to === 'RUB') {
            rate = rates.rub;
            label = `1 ${from} = ${rate.toFixed(2)} ${to}`;
        } else if (from === 'EUR' && to === 'RUB') {
            rate = rates.rub / rates.eur;
            label = `1 ${from} = ${rate.toFixed(2)} ${to}`;
        } else if (from === 'USD' && to === 'RSD') {
            rate = rates.rsd;
            label = `1 ${from} = ${rate.toFixed(2)} ${to}`;
        } else if (from === 'EUR' && to === 'RSD') {
            rate = rates.rsd / rates.eur;
            label = `1 ${from} = ${rate.toFixed(2)} ${to}`;
        }
        
        await ctx.reply(
            `📊 *КУРС ${emoji}*\n\n` +
            `💵 ${label}\n\n` +
            `📅 Обновлено: ${new Date().toLocaleString('ru-RU')}\n` +
            `🏦 Источник: ${rates.source}`,
            { parse_mode: 'Markdown' }
        );
        
        await ctx.deleteMessage(msg.message_id);
        
    } catch (error) {
        console.error('Ошибка:', error.message);
        await ctx.reply('❌ Ошибка получения курса.');
        await ctx.deleteMessage(msg.message_id);
    }
}

// Функция для показа всех курсов
async function showAllRates(ctx) {
    const msg = await ctx.reply('⏳ Загружаю все курсы...');
    
    try {
        const rates = await getExchangeRates();
        
        if (!rates) {
            await ctx.reply('❌ Не удалось получить курсы. Попробуйте позже.');
            await ctx.deleteMessage(msg.message_id);
            return;
        }
        
        const usdToRub = rates.rub.toFixed(2);
        const eurToRub = (rates.rub / rates.eur).toFixed(2);
        const usdToRsd = rates.rsd.toFixed(2);
        const eurToRsd = (rates.rsd / rates.eur).toFixed(2);
        
        await ctx.reply(
            `📊 *ВСЕ КУРСЫ ВАЛЮТ*\n\n` +
            `🇺🇸 USD → 🇷🇺 RUB: 1 USD = ${usdToRub} RUB\n` +
            `🇪🇺 EUR → 🇷🇺 RUB: 1 EUR = ${eurToRub} RUB\n\n` +
            `🇺🇸 USD → 🇷🇸 RSD: 1 USD = ${usdToRsd} RSD\n` +
            `🇪🇺 EUR → 🇷🇸 RSD: 1 EUR = ${eurToRsd} RSD\n\n` +
            `📅 Обновлено: ${new Date().toLocaleString('ru-RU')}\n` +
            `🏦 Источник: ${rates.source}`,
            { parse_mode: 'Markdown' }
        );
        
        await ctx.deleteMessage(msg.message_id);
        
    } catch (error) {
        console.error('Ошибка:', error.message);
        await ctx.reply('❌ Ошибка получения курсов.');
        await ctx.deleteMessage(msg.message_id);
    }
}

// Кнопка "ℹ️ О боте" (оставляем для совместимости)
bot.hears('ℹ️ О боте', async (ctx) => {
    await ctx.reply(
        '🤖 *О боте*\n\n' +
        'Бот показывает актуальные курсы валют:\n' +
        '• USD → RUB\n' +
        '• EUR → RUB\n' +
        '• USD → RSD\n' +
        '• EUR → RSD\n\n' +
        '📊 Данные обновляются автоматически из открытых источников.',
        { parse_mode: 'Markdown' }
    );
});

bot.launch();
console.log('✅ Бот запущен! Отправьте /start в Telegram');