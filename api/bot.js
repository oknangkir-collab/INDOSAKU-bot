const { Telegraf, Markup } = require('telegraf');
const BinderPay = require('binderpay-nodejs'); // SDK Resmi BinderPay

const bot = new Telegraf(process.env.BOT_TOKEN);

// Inisialisasi SDK BinderPay
const binderPayClient = new BinderPay({
    partnerId: process.env.BINDERPAY_PARTNER_ID || 'BP984265',
    privateKey: process.env.BINDERPAY_PRIVATE_KEY, // RSA Private Key (PEM format)
    channelId: 'BCA',
    isProduction: true // Ubah false jika di environment Sandbox
});

const INDOSAKU_LOGO_URL = 'https://ibb.co.com/1G94Bcm9'; 

const showMainMenu = async (ctx, isPhoto = false) => {
    const userName = ctx.from.first_name || 'Pelanggan Setia';
    const captionText = 
        `⚡ *SELAMAT DATANG DI INDOSAKU* ⚡\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `Halo *${userName}*! Solusi digital terpadu untuk kebutuhan Pulsa, PPOB, E-Wallet, dan Game Anda di Cibinong.\n\n` +
        `📌 *Silakan pilih layanan di bawah ini:*`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📱 Pulsa & Paket Data', 'menu_pulsa_data')],
        [Markup.button.callback('💡 Tagihan PPOB (PLN/BPJS/PDAM)', 'menu_ppob_tagihan')],
        [Markup.button.callback('💳 Top Up E-Wallet', 'menu_ewallet')],
        [Markup.button.callback('🎮 Voucher Game', 'menu_games')],
        [Markup.button.callback('📞 Hubungi Admin / CS', 'contact_admin')]
    ]);

    try {
        if (isPhoto) {
            return ctx.replyWithPhoto(INDOSAKU_LOGO_URL, { caption: captionText, parse_mode: 'Markdown', ...keyboard });
        } else {
            return ctx.reply(captionText, { parse_mode: 'Markdown', ...keyboard });
        }
    } catch (err) {
        return ctx.reply(captionText, { parse_mode: 'Markdown', ...keyboard });
    }
};

bot.start((ctx) => showMainMenu(ctx, true));

bot.action('menu_pulsa_data', (ctx) => {
    return ctx.editMessageCaption(
        `📱 *MENU PULSA & PAKET DATA*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `Silakan kirim nomor handphone tujuan Anda ke chat ini dengan format:\n` +
        `Contoh: \`08123456789\``,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('« Kembali ke Menu Utama', 'back_home')]]) }
    ).catch(() => ctx.reply('Silakan ketik /start untuk kembali ke menu utama.'));
});

bot.action('contact_admin', (ctx) => {
    return ctx.reply(
        `📞 *LAYANAN PELANGGAN INDOSAKU*\n\n• WhatsApp: \`08131611563\`\n• Lokasi: Cibinong, Kabupaten Bogor`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.url('💬 Chat WhatsApp Admin', 'https://wa.me/628131611563?text=Halo%20Admin%20INDOSAKU')],
                [Markup.button.callback('« Kembali', 'back_home')]
            ])
        }
    );
});

bot.action('back_home', (ctx) => showMainMenu(ctx, false));

// Handler Input Nomor HP
bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (text === '/start') return showMainMenu(ctx, true);

    if (text.startsWith('08') || text.startsWith('+62') || text.startsWith('62')) {
        return ctx.reply(
            `📱 *NOMOR TUJUAN:* \`${text}\`\nPilih nominal pengisian pulsa:`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('Rp 10.000', 'nominal_10k'), Markup.button.callback('Rp 20.000', 'nominal_20k')],
                    [Markup.button.callback('Rp 50.000', 'nominal_50k'), Markup.button.callback('Rp 100.000', 'nominal_100k')],
                    [Markup.button.callback('« Batalkan', 'back_home')]
                ])
            }
        );
    }
    return ctx.reply(`Format diterima. Ketik /start untuk beranda.`);
});

// Pilihan Metode Pembayaran
bot.action(/nominal_.+/, (ctx) => {
    const data = ctx.match[0];
    let nominalCode = '20k';
    if (data.includes('10k')) nominalCode = '10k';
    else if (data.includes('50k')) nominalCode = '50k';
    else if (data.includes('100k')) nominalCode = '100k';

    return ctx.editMessageText(
        `💳 *PILIH METODE PEMBAYARAN BINDERPAY*\n━━━━━━━━━━━━━━━━━━━\nSilakan pilih metode transaksi:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('⚡ QRIS Instant (All Payment)', `pay_qris_${nominalCode}`)],
                [Markup.button.callback('🏦 Virtual Account BCA', `pay_va_BCA_${nominalCode}`)],
                [Markup.button.callback('🏦 Virtual Account BRI', `pay_va_BRI_${nominalCode}`)],
                [Markup.button.callback('« Kembali', 'back_home')]
            ])
        }
    );
});

// 1. Eksekusi QRIS Asli (BinderPay Service 47)
bot.action(/pay_qris_.+/, async (ctx) => {
    const data = ctx.match[0];
    let amountNum = 20000;
    if (data.includes('10k')) amountNum = 10000;
    else if (data.includes('50k')) amountNum = 50000;
    else if (data.includes('100k')) amountNum = 100000;

    const trxId = `INDOSAKU-QR-${Date.now()}`;

    try {
        await ctx.reply('⏳ Sedang memproses QRIS dari BinderPay...');
        
        // Panggilan API QRIS via SDK
        const response = await binderPayClient.qris.generate({
            partnerReferenceNo: trxId,
            amount: { value: `${amountNum}.00`, currency: 'IDR' },
            additionalInfo: { isStatic: false }
        });

        if (response.responseCode === '2004700') {
            await ctx.reply(
                `✅ *TAGIHAN QRIS DIBUAT*\n━━━━━━━━━━━━━━━━━━━\n` +
                `🆔 Ref: \`${trxId}\`\n` +
                `💰 Total: *Rp ${amountNum.toLocaleString('id-ID')}*\n\n` +
                `Silakan scan QRIS di bawah ini untuk membayar:`,
                { parse_mode: 'Markdown' }
            );
            return ctx.replyWithPhoto(response.qrUrl, {
                ...Markup.inlineKeyboard([[Markup.button.callback('« Kembali ke Beranda', 'back_home')]])
            });
        } else {
            return ctx.reply(`⚠️ Gagal membuat QRIS: ${response.responseMessage}`);
        }
    } catch (err) {
        console.error(err);
        return ctx.reply('❌ Terjadi kesalahan koneksi ke Payment Gateway BinderPay.');
    }
});

// 2. Eksekusi Virtual Account Asli (BinderPay Service 27)
bot.action(/pay_va_.+/, async (ctx) => {
    const parts = ctx.match[0].split('_');
    const bankChannel = parts[2]; // BCA / BRI
    const nominalCode = parts[3];

    let amountNum = 20000;
    if (nominalCode === '10k') amountNum = 10000;
    else if (nominalCode === '50k') amountNum = 50000;
    else if (nominalCode === '100k') amountNum = 100000;

    const trxId = `INDOSAKU-VA-${Date.now()}`;

    try {
        await ctx.reply('⏳ Membuat Virtual Account BinderPay...');

        // Panggilan API VA via SDK
        const response = await binderPayClient.virtualAccount.create({
            virtualAccountName: `INDOSAKU - ${ctx.from.first_name || 'User'}`,
            trxId: trxId,
            totalAmount: { value: `${amountNum}.00`, currency: 'IDR' },
            virtualAccountTrxType: 'C', // One-off
            additionalInfo: { channel: bankChannel }
        });

        if (response.responseCode === '2002700') {
            const vaData = response.virtualAccountData;
            return ctx.reply(
                `✅ *VIRTUAL ACCOUNT DIBUAT*\n━━━━━━━━━━━━━━━━━━━\n` +
                `🏦 Bank: *${bankChannel}*\n` +
                `🔢 No. VA: \`${vaData.virtualAccountNo}\`\n` +
                `💰 Total Tagihan: *Rp ${amountNum.toLocaleString('id-ID')}*\n\n` +
                `Silakan lakukan transfer ke nomor Virtual Account di atas. Transaksi akan terverifikasi otomatis.`,
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback('« Kembali ke Beranda', 'back_home')]])
                }
            );
        } else {
            return ctx.reply(`⚠️ Gagal membuat VA: ${response.responseMessage}`);
        }
    } catch (err) {
        console.error(err);
        return ctx.reply('❌ Terjadi kesalahan sistem saat menghubungi BinderPay.');
    }
});

module.exports = async (req, res) => {
    try {
        if (req.method === 'POST') {
            await bot.handleUpdate(req.body);
            res.status(200).send('OK');
        } else {
            res.status(200).send('Bot Telegram INDOSAKU Aktif!');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};
