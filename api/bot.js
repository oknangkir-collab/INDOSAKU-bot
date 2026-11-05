const { Telegraf, Markup } = require('telegraf');
const { BinderPay } = require('binderpay-nodejs');

const bot = new Telegraf(process.env.BOT_TOKEN);

const binderPayClient = new BinderPay({
    partnerId: process.env.BINDERPAY_PARTNER_ID || 'BP984265',
    privateKey: (process.env.BINDERPAY_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    channelId: 'BCA',
    isProduction: true
});

const INDOSAKU_LOGO_URL = 'https://ibb.co.com/1G94Bcm9';

const showMainMenu = async (ctx, isPhoto = false) => {
    const userName = ctx.from.first_name || 'Pelanggan';
    const text = `⚡ *INDOSAKU CIBINONG* ⚡\nHalo *${userName}*, silakan pilih layanan digital di bawah:`;
    
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📱 Pulsa & Paket Data', 'menu_pulsa')],
        [Markup.button.callback('📞 Hubungi Admin', 'contact_admin')]
    ]);

    if (isPhoto) {
        return ctx.replyWithPhoto(INDOSAKU_LOGO_URL, { caption: text, parse_mode: 'Markdown', ...keyboard });
    }
    return ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
};

bot.start((ctx) => showMainMenu(ctx, true));

bot.action('menu_pulsa', (ctx) => {
    return ctx.editMessageCaption(
        `📱 *PULSA & PAKET DATA*\nSilakan ketik nomor HP tujuan Anda (Contoh: \`08123456789\`):`,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('« Kembali', 'back_home')]]) }
    );
});

bot.action('back_home', (ctx) => showMainMenu(ctx, false));

bot.action('contact_admin', (ctx) => {
    return ctx.reply(
        `📞 *CS INDOSAKU*\nWhatsApp: \`08131611563\``,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('« Kembali', 'back_home')]]) }
    );
});

bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (text.startsWith('08') || text.startsWith('62')) {
        return ctx.reply(
            `📱 Nomor: \`${text}\`\nPilih nominal pengisian:`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('Rp 10.000 (QRIS)', 'pay_qris_10k'), Markup.button.callback('Rp 20.000 (VA BCA)', 'pay_va_BCA_20k')]
                ])
            }
        );
    }
});

bot.action(/pay_qris_.+/, async (ctx) => {
    const trxId = `INDOSAKU-${Date.now()}`;
    try {
        await ctx.reply('⏳ Memproses QRIS BinderPay...');
        const res = await binderPayClient.qris.generate({
            partnerReferenceNo: trxId,
            amount: { value: '10000.00', currency: 'IDR' },
            additionalInfo: { isStatic: false }
        });

        if (res.responseCode === '2004700') {
            await ctx.reply(`✅ *QRIS BERHASIL DIBUAT*\nRef: \`${trxId}\``, { parse_mode: 'Markdown' });
            return ctx.replyWithPhoto(res.qrUrl);
        }
        ctx.reply(`Gagal: ${res.responseMessage}`);
    } catch (e) {
        ctx.reply('❌ Error koneksi ke BinderPay.');
    }
});

bot.action(/pay_va_.+/, async (ctx) => {
    const trxId = `INDOSAKU-${Date.now()}`;
    try {
        await ctx.reply('⏳ Memproses Virtual Account BCA...');
        const res = await binderPayClient.virtualAccount.create({
            virtualAccountName: 'INDOSAKU PELANGGAN',
            trxId: trxId,
            totalAmount: { value: '20000.00', currency: 'IDR' },
            virtualAccountTrxType: 'C',
            additionalInfo: { channel: 'BCA' }
        });

        if (res.responseCode === '2002700') {
            const va = res.virtualAccountData;
            return ctx.reply(
                `✅ *VA BCA BERHASIL DIBUAT*\nNo. VA: \`${va.virtualAccountNo}\`\nTotal: Rp 20.000`,
                { parse_mode: 'Markdown' }
            );
        }
        ctx.reply(`Gagal: ${res.responseMessage}`);
    } catch (e) {
        ctx.reply('❌ Error koneksi VA.');
    }
});

module.exports = async (req, res) => {
    try {
        if (req.method === 'POST') {
            await bot.handleUpdate(req.body);
            return res.status(200).send('OK');
        }
        return res.status(200).send('Bot Telegram INDOSAKU Berjalan di Vercel!');
    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal Server Error');
    }
};
