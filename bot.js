const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const express = require('express');

// --- ВЕБ-СЕРВЕР ДЛЯ RENDER ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Бот работает! 🚀');
});

const server = app.listen(PORT, () => {
    console.log(`Веб-сервер запущен на порту ${PORT}`);
});

// --- ТЕЛЕГРАМ БОТ ---
const BOT_TOKEN = '8268637577:AAGC4_AcnsiMJ5RTdhVyr5e6JOfjC4AZY34';
const bot = new Telegraf(BOT_TOKEN);

// Функция получения текущей даты с правильным часовым поясом
function getCurrentTime() {
    // Укажите ваш часовой пояс (Europe/Moscow, Europe/Berlin, Europe/London и т.д.)
    return new Date().toLocaleString('ru-RU', { 
        timeZone: 'Europe/Berlin',  // ← ИЗМЕНИТЕ НА ВАШ ЧАСОВОЙ ПОЯС
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Функция получения курсов с несколькими API
async function getRates() {
    // ПЕРВЫЙ API: frankfurter
    try {
        const response = await axios.get('https://api.frankfurter.app/latest?from=USD&to=RUB,RSD,EUR', {
            timeout: 5000
        });
        
        if (response.status === 200 && response.data && response.data.rates) {
            const rates = response.data.rates;
            if (rates.RUB && rates.RSD && rates.EUR) {
                console.log('✅ Frankfurter сработал');
                return {
                    rub: rates.RUB,
                    rsd: rates.RSD,
                    eur: rates.EUR,
                    source: 'frankfurter.app'
                };
            }
        }
    } catch (error) {
        console.log('❌ Frankfurter не сработал');
    }

    // ВТОРОЙ API: exchangerate.host
    try {
        const response = await axios.get('https://api.exchangerate.host/latest?base=USD&symbols=RUB,RSD,EUR', {
            timeout: 5000
        });
        
        if (response.status === 200 && response.data && response.data.rates) {
            const rates = response.data.rates;
            if (rates.RUB && rates.RSD && rates.EUR) {
                console.log('✅ exchangerate.host сработал');
                return {
                    rub: rates.RUB,
                    rsd: rates.RSD,
                    eur: rates.EUR,
                    source: 'exchangerate.host'
                };
            }
        }
    } catch (error) {
        console.log('❌ exchangerate.host не сработал');
    }

    // ТРЕТИЙ API: open.er-api.com
    try {
        const response = await axios.get('https://open.er-api.com/v6/latest/USD', {
            timeout: 5000
        });
        
        if (response.status === 200 && response.data && response.data.rates) {
            const rates = response.data.rates;
            if (rates.RUB && rates.RSD && rates.EUR) {
                console.log('✅ open.er-api.com сработал');
                return {
                    rub: rates.RUB,
                    rsd: rates.RSD,
                    eur: rates.EUR,
                    source: 'open.er-api.com'
                };
            }
        }
    } catch (error) {
        console.log('❌ open.er-api.com не сработал');
    }

    console.log('❌ Все API недоступны');
    return null;
}

// --- КОМАНДЫ БОТА ---
bot.start(async (ctx) => {
    await ctx.reply(
        '👋 Привет! Я бот для курсов валют.',
        Markup.keyboard([
            ['🇺🇸 USD → 🇷🇺 RUB', '🇪🇺 EUR → 🇷🇺 RUB'],
            ['🇺🇸 USD → 🇷🇸 RSD', '🇪🇺 EUR → 🇷🇸 RSD'],
            ['📈 Все курсы сразу']
        ]).resize()
    );
});

// Обработчики кнопок
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

// Функция показа одного курса
async function showRate(ctx, from, to, emoji) {
    const msg = await ctx.reply('⏳ Загружаю курс...');
    try {
        const rates = await getRates();
        if (!rates) {
            await ctx.reply('❌ Не удалось получить курсы. Попробуйте позже.');
            await ctx.deleteMessage(msg.message_id);
            return;
        }

        let rate;
        let label;
        
        if (from === 'USD' && to === 'RUB') {
            rate = rates.rub;
            label = `1 USD = ${rate.toFixed(2)} RUB`;
        } else if (from === 'EUR' && to === 'RUB') {
            rate = rates.rub / rates.eur;
            label = `1 EUR = ${rate.toFixed(2)} RUB`;
        } else if (from === 'USD' && to === 'RSD') {
            rate = rates.rsd;
            label = `1 USD = ${rate.toFixed(2)} RSD`;
        } else if (from === 'EUR' && to === 'RSD') {
            rate = rates.rsd / rates.eur;
            label = `1 EUR = ${rate.toFixed(2)} RSD`;
        }

        await ctx.reply(
            `📊 *КУРС ${emoji}*\n\n` +
            `💵 ${label}\n\n` +
            `📅 ${getCurrentTime()}\n` +
            `🏦 Источник: ${rates.source}`,
            { parse_mode: 'Markdown' }
        );
        await ctx.deleteMessage(msg.message_id);
    } catch (error) {
        console.error('Ошибка:', error);
        await ctx.reply('❌ Ошибка получения курса.');
        await ctx.deleteMessage(msg.message_id);
    }
}

// Функция показа всех курсов
async function showAllRates(ctx) {
    const msg = await ctx.reply('⏳ Загружаю все курсы...');
    try {
        const rates = await getRates();
        if (!rates) {
            await ctx.reply('❌ Не удалось получить курсы.');
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
            `📅 ${getCurrentTime()}\n` +
            `🏦 Источник: ${rates.source}`,
            { parse_mode: 'Markdown' }
        );
        await ctx.deleteMessage(msg.message_id);
    } catch (error) {
        console.error('Ошибка:', error);
        await ctx.reply('❌ Ошибка получения курсов.');
        await ctx.deleteMessage(msg.message_id);
    }
}

bot.hears('ℹ️ О боте', async (ctx) => {
    await ctx.reply('🤖 Бот для курсов валют.\nДанные из открытых источников.');
});

// --- ЗАПУСК БОТА ---
bot.launch();
console.log('✅ Бот запущен! Отправьте /start в Telegram');