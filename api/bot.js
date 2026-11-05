const { Telegraf, Markup } = require('telegraf');
const { BinderPay } = require('binderpay-nodejs');

const bot = new Telegraf(process.env.BOT_TOKEN);

const binderPayClient = new BinderPay({
    partnerId: process.env.BINDERPAY_PARTNER_ID || 'BP984265',
    privateKey: (process.env.BINDERPAY_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim(),
    channelId: 'BCA',
    isProduction: true
});

const INDOSAKU_LOGO_URL = 'https://ibb.co.com/1G94Bcm9';

// Ganti dengan TELEGRAM USER ID Anda (angka ID Telegram admin tempat notifikasi live chat masuk)
// Cara cek ID Telegram Anda bisa lewat bot @userinfobot di Telegram
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '123456789'; 

// Temporary session user
const userSession = {};

const showMainMenu = async (ctx, isPhoto = false) => {
    const userName = ctx.from.first_name || 'Sobat INDOSAKU';
    const text = 
        `⚡ *INDOSAKU DIGITAL & PPOB* ⚡\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `Halo *${userName}*! Platform transaksi digital & PPOB terpercaya di Cibinong, Bogor.\n\n` +
        `💡 *Silakan pilih layanan di bawah ini:*`;
    
    // Desain tata letak tombol grid 2 kolom yang rapi
    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('📱 Pulsa Reguler', 'cat_pulsa'),
            Markup.button.callback('🌐 Paket Internet', 'cat_data')
        ],
        [
            Markup.button.callback('⚡ Token PLN', 'cat_pln'),
            Markup.button.callback('💳 TopUp E-Wallet', 'cat_ewallet')
        ],
        [
            Markup.button.callback('🎮 Voucher Game', 'cat_game'),
            Markup.button.callback('📄 Tagihan Pascabayar', 'cat_pascabayar')
        ],
        [
            Markup.button.callback('🎫 Voucher Digital & Lainnya', 'cat_voucher')
        ],
        [
            Markup.button.callback('💬 Live Chat dengan Admin (CS)', 'start_live_chat')
        ]
    ]);

    try {
        if (isPhoto) {
            return ctx.replyWithPhoto(INDOSAKU_LOGO_URL, { caption: text, parse_mode: 'Markdown', ...keyboard });
        }
        return ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
    } catch (e) {
        return ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
    }
};

bot.start((ctx) => {
    delete userSession[ctx.from.id];
    return showMainMenu(ctx, true);
});

bot.action('back_home', (ctx) => {
    delete userSession[ctx.from.id];
    return showMainMenu(ctx, false);
});

// --- FITUR LIVE CHAT VIA BOT ---
bot.action('start_live_chat', (ctx) => {
    const userId = ctx.from.id;
    userSession[userId] = { mode: 'live_chat' };

    return ctx.editMessageText(
        `💬 *LIVE CHAT DENGAN ADMIN INDOSAKU*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `Anda sekarang terhubung ke sistem Live Chat. Silakan ketik pesan, kendala, atau pertanyaan Anda di chat ini.\n\n` +
        `Admin kami akan segera membalas pesan Anda.\n\n` +
        `_Ketik /start jika ingin keluar dari mode live chat._`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback('« Akhiri Chat & Kembali', 'back_home')]])
        }
    );
});

// Handler Kategori Layanan PPOB
bot.action(/cat_(.+)/, (ctx) => {
    const category = ctx.match[1];
    userSession[ctx.from.id] = { category };

    let title = 'LAYANAN';
    let placeholder = 'Nomor HP / ID Tujuan';

    if (category === 'pulsa') { title = '📱 PULSA REGULER SEMUA OPERATOR'; placeholder = '08123456789'; }
    else if (category === 'data') { title = '🌐 PAKET DATA INTERNET'; placeholder = '08123456789'; }
    else if (category === 'pln') { title = '⚡ TOKEN PLN PRABAYAR'; placeholder = 'Nomor Meter / ID Pelanggan (11-12 digit)'; }
    else if (category === 'ewallet') { title = '💳 TOP UP E-WALLET (DANA/OVO/GoPay/ShopeePay)'; placeholder = 'Nomor HP Akun (08xxxx)'; }
    else if (category === 'game') { title = '🎮 TOP UP VOUCHER GAME (ML/FF/PUBG/dll)'; placeholder = 'User ID & Server ID'; }
    else if (category === 'pascabayar') { title = '📄 TAGIHAN PASCABAYAR (PLN/PDAM/BPJS)'; placeholder = 'Nomor Pelanggan Pascabayar'; }
    else if (category === 'voucher') { title = '🎫 VOUCHER DIGITAL & E-TOLL'; placeholder = 'Nomor Kartu / ID Pelanggan'; }

    return ctx.editMessageText(
        `📂 *${title}*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `Silakan kirim *${placeholder}* Anda ke chat ini:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback('« Batalkan & Kembali', 'back_home')]])
        }
    );
});

// Tangkap Input Teks & Mengelola Live Chat / PPOB
bot.on('text', async (ctx, next) => {
    const text = ctx.message.text.trim();
    if (text === '/start') {
        delete userSession[ctx.from.id];
        return showMainMenu(ctx, true);
    }

    const userId = ctx.from.id.toString();

    // 1. JIKA ADMIN MEMBALAS PESAN DI TELEGRAM (Reply pesan yang diforward dari user)
    if (userId === ADMIN_TELEGRAM_ID.toString() && ctx.message.reply_to_message) {
        const repliedText = ctx.message.reply_to_message.text || '';
        // Ekstraksi ID User dari teks forward / pesan asli
        const matchId = repliedText.match(/ID User:\s*`(\d+)`/) || repliedText.match(/Dari:\s*`(\d+)`/);
        
        if (matchId) {
            const targetUserChatId = matchId[1];
            try {
                await bot.telegram.sendMessage(
                    targetUserChatId,
                    `💬 *Pesan dari Admin INDOSAKU:*\n\n${text}`,
                    { parse_mode: 'Markdown' }
                );
                return ctx.reply('✅ Balasan berhasil dikirim ke user.');
            } catch (err) {
                return ctx.reply('❌ Gagal mengirim pesan ke user (mungkin user memblokir bot).');
            }
        }
    }

    // 2. JIKA USER SEDANG DALAM MODE LIVE CHAT
    if (userSession[userId] && userSession[userId].mode === 'live_chat') {
        const userName = ctx.from.first_name || 'Tanpa Nama';
        const userUsername = ctx.from.username ? `@${ctx.from.username}` : 'Tanpa Username';
        
        // Kirim notifikasi/forward pesan user ke Telegram Admin
        try {
            await bot.telegram.sendMessage(
                ADMIN_TELEGRAM_ID,
                `🔔 *PESAN LIVE CHAT MASUK*\n` +
                `━━━━━━━━━━━━━━━━━━━\n` +
                `👤 Nama: ${userName} (${userUsername})\n` +
                `🆔 ID User: \`${userId}\`\n\n` +
                `💬 *Pesan:* ${text}\n\n` +
                `_⚠️ (Reply pesan ini langsung di Telegram untuk membalas user)_`,
                { parse_mode: 'Markdown' }
            );
            return ctx.reply('💬 Pesan Anda telah dikirim ke Admin. Mohon tunggu balasan dari kami ya!');
        } catch (err) {
            return ctx.reply('❌ Gagal mengirim pesan live chat. Silakan coba beberapa saat lagi.');
        }
    }

    // 3. JIKA USER SEDANG DALAM PROSES CUSTOM NOMINAL
    if (userSession[userId] && userSession[userId].waitingCustomAmount) {
        const customAmount = parseInt(text.replace(/[^0-9]/g, ''));
        if (isNaN(customAmount) || customAmount < 1000) {
            return ctx.reply('⚠️ Nominal tidak valid. Masukkan angka minimal Rp 1.000.');
        }
        userSession[userId].waitingCustomAmount = false;
        userSession[userId].amount = customAmount.toString();
        return askPaymentMethod(ctx, customAmount);
    }

    // 4. JIKA USER MENGIRIM NOMOR TUJUAN PPOB
    if (!userSession[userId]) {
        userSession[userId] = { category: 'pulsa' };
    }

    userSession[userId].targetNo = text;
    const cat = userSession[userId].category;

    if (cat === 'pascabayar') {
        return ctx.reply(
            `📄 *PILIH JENIS TAGIHAN PASCABAYAR*\n` +
            `Tujuan: \`${text}\`\n\n` +
            `Silakan pilih kategori tagihan di bawah:`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('⚡ PLN Pascabayar', 'post_PLNPOSTPAIDB')],
                    [Markup.button.callback('💧 PDAM Daerah', 'post_PDAM1001'), Markup.button.callback('🏥 BPJS Kesehatan', 'post_BPJSKES')],
                    [Markup.button.callback('📞 Telkom / Indihome', 'post_TELKOMPSTN'), Markup.button.callback('📺 TV Berbayar', 'post_TVINDVS')],
                    [Markup.button.callback('« Batalkan', 'back_home')]
                ])
            }
        );
    }

    return ctx.reply(
        `🎯 *TUJUAN: \`${text}\`*\n` +
        `Silakan pilih nominal atau gunakan tombol *Custom Nominal* untuk mengisi nominal sendiri:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('Rp 5.000', 'nom_5000'), Markup.button.callback('Rp 10.000', 'nom_10000')],
                [Markup.button.callback('Rp 20.000', 'nom_20000'), Markup.button.callback('Rp 25.000', 'nom_25000')],
                [Markup.button.callback('Rp 50.000', 'nom_50000'), Markup.button.callback('Rp 100.000', 'nom_100000')],
                [Markup.button.callback('Rp 200.000', 'nom_200000'), Markup.button.callback('✍️ Custom Nominal', 'nom_custom')],
                [Markup.button.callback('« Batalkan & Kembali', 'back_home')]
            ])
        }
    );
});

// Handler Pilihan Nominal Tetap
bot.action(/nom_(\d+)/, (ctx) => {
    const nominal = ctx.match[1];
    const userId = ctx.from.id;
    if (!userSession[userId]) userSession[userId] = {};
    userSession[userId].amount = nominal;

    return askPaymentMethod(ctx, nominal);
});

// Handler Custom Nominal
bot.action('nom_custom', (ctx) => {
    const userId = ctx.from.id;
    userSession[userId].waitingCustomAmount = true;
    return ctx.editMessageText(
        `✍️ *CUSTOM NOMINAL PEMBAYARAN*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `Silakan ketik angka nominal saja di chat (Contoh: \`15000\` atau \`75000\` tanpa titik/koma):`,
        { parse_mode: 'Markdown' }
    );
});

const askPaymentMethod = async (ctx, amount) => {
    const formattedAmount = parseInt(amount).toLocaleString('id-ID');
    const text = 
        `💰 *TOTAL PEMBAYARAN: Rp ${formattedAmount}*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `Pilih metode pembayaran otomatis via BinderPay:`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('⚡ QRIS Instant (All Payment / E-Wallet)', `pay_qris_${amount}`)],
        [Markup.button.callback('🏦 Virtual Account BCA', `pay_va_BCA_${amount}`)],
        [Markup.button.callback('🏦 Virtual Account BRI', `pay_va_BRI_${amount}`)],
        [Markup.button.callback('🏦 Virtual Account Mandiri', `pay_va_MANDIRI_${amount}`)],
        [Markup.button.callback('🏦 Virtual Account BSI / Permata', `pay_va_PERMATA_${amount}`)],
        [Markup.button.callback('« Kembali ke Menu Utama', 'back_home')]
    ]);

    try {
        return ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
    } catch (e) {
        return ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
    }
};

// 1. Eksekusi Pembayaran QRIS (Service 47)
bot.action(/pay_qris_(\d+)/, async (ctx) => {
    const amount = ctx.match[1];
    const trxId = `INDOSAKU-QR-${Date.now()}`;

    try {
        await ctx.reply('⏳ Menghubungkan ke gateway BinderPay untuk membuat QRIS...');
        const res = await binderPayClient.qris.generate({
            partnerReferenceNo: trxId,
            amount: { value: `${amount}.00`, currency: 'IDR' },
            additionalInfo: { isStatic: false }
        });

        if (res.responseCode === '2004700') {
            await ctx.reply(
                `✅ *QRIS INSTANT BERHASIL DIBUAT*\n` +
                `━━━━━━━━━━━━━━━━━━━\n` +
                `🆔 Ref ID: \`${trxId}\`\n` +
                `💰 Total Bayar: *Rp ${parseInt(amount).toLocaleString('id-ID')}*\n\n` +
                `Silakan scan menggunakan BCA Mobile, DANA, OVO, GoPay, ShopeePay, atau Mobile Banking lainnya:`,
                { parse_mode: 'Markdown' }
            );
            return ctx.replyWithPhoto(res.qrUrl, {
                ...Markup.inlineKeyboard([[Markup.button.callback('« Selesai / Menu Utama', 'back_home')]])
            });
        }
        return ctx.reply(`⚠️ Gagal membuat QRIS: ${res.responseMessage || 'Kesalahan sistem'}`);
    } catch (err) {
        console.error(err);
        return ctx.reply('❌ Gagal terhubung ke server pembayaran BinderPay.');
    }
});

// 2. Eksekusi Pembayaran Virtual Account (Service 27)
bot.action(/pay_va_([^_]+)_(\d+)/, async (ctx) => {
    const channel = ctx.match[1];
    const amount = ctx.match[2];
    const trxId = `INDOSAKU-VA-${Date.now()}`;
    const userId = ctx.from.id;
    const customerNo = userSession[userId]?.targetNo || '08123456789';

    try {
        await ctx.reply(`⏳ Membuat Virtual Account ${channel}...`);
        const res = await binderPayClient.virtualAccount.create({
            customerNo: customerNo,
            virtualAccountName: `INDOSAKU - ${ctx.from.first_name || 'User'}`,
            trxId: trxId,
            totalAmount: { value: `${amount}.00`, currency: 'IDR' },
            virtualAccountTrxType: 'C',
            additionalInfo: { channel: channel }
        });

        if (res.responseCode === '2002700') {
            const va = res.virtualAccountData;
            return ctx.reply(
                `✅ *VIRTUAL ACCOUNT ${channel} BERHASIL*\n` +
                `━━━━━━━━━━━━━━━━━━━\n` +
                `🔢 No. VA: \`${va.virtualAccountNo}\`\n` +
                `👤 Atas Nama: ${va.virtualAccountName}\n` +
                `💰 Total Tagihan: *Rp ${parseInt(amount).toLocaleString('id-ID')}*\n\n` +
                `Silakan transfer ke nomor VA di atas. Status transaksi akan terverifikasi otomatis.`,
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback('« Selesai / Menu Utama', 'back_home')]])
                }
            );
        }
        return ctx.reply(`⚠️ Gagal membuat VA: ${res.responseMessage || 'Kesalahan sistem'}`);
    } catch (err) {
        console.error(err);
        return ctx.reply('❌ Terjadi kesalahan koneksi VA BinderPay.');
    }
});

module.exports = async (req, res) => {
    try {
        if (req.method === 'POST') {
            await bot.handleUpdate(req.body);
            return res.status(200).send('OK');
        }
        return res.status(200).send('Bot INDOSAKU PPOB Aktif & Berjalan di Vercel!');
    } catch (error) {
        console.error('Webhook Error:', error);
        return res.status(500).send('Internal Server Error');
    }
};
