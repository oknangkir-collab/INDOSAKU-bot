const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Fungsi Handler Menu Utama
const showMainMenu = async (ctx, isEdit = false) => {
    const userName = ctx.from.first_name || 'Pelanggan';
    const text = `Halo *${userName}*! Selamat datang di *INDOSAKU Bot* ⚡\n\n` +
                 `Pusat transaksi Pulsa, PPOB, E-Wallet, dan Voucher Game terpercaya.\n\n` +
                 `Silakan pilih menu transaksi di bawah ini:`;
    
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📱 Pulsa & Paket Data', 'menu_pulsa_data')],
        [Markup.button.callback('💡 Tagihan PPOB (PLN/BPJS/PDAM)', 'menu_ppob_tagihan')],
        [Markup.button.callback('💳 Top Up E-Wallet', 'menu_ewallet')],
        [Markup.button.callback('🎮 Voucher Game', 'menu_games')],
        [Markup.button.callback('📞 Hubungi Admin / CS', 'contact_admin')]
    ]);

    if (isEdit) {
        return ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
    } else {
        return ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
    }
};

// Command /start
bot.start((ctx) => {
    return showMainMenu(ctx, false);
});

// 1. Menu Pulsa & Paket Data
bot.action('menu_pulsa_data', (ctx) => {
    return ctx.editMessageText(
        `*📱 MENU PULSA & PAKET DATA*\n\n` +
        `Silakan kirim nomor handphone tujuan Anda ke chat ini dengan format:\n` +
        `Contoh: \`08123456789\`\n\n` +
        `_(Bot akan otomatis mendeteksi operator setelah Anda mengirim nomor)_`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback('« Kembali ke Menu Utama', 'back_home')]])
        }
    );
});

// 2. Menu Tagihan PPOB
bot.action('menu_ppob_tagihan', (ctx) => {
    return ctx.editMessageText(
        `*💡 MENU TAGIHAN PPOB*\n\n` +
        `Pilih jenis tagihan yang ingin Anda cek atau bayar:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('⚡ Token / Tagihan Listrik PLN', 'tagihan_pln')],
                [Markup.button.callback('🏥 BPJS Kesehatan', 'tagihan_bpjs')],
                [Markup.button.callback('🚰 PDAM Air Bersih', 'tagihan_pdam')],
                [Markup.button.callback('« Kembali ke Menu Utama', 'back_home')]
            ])
        }
    );
});

// 3. Menu Top Up E-Wallet
bot.action('menu_ewallet', (ctx) => {
    return ctx.editMessageText(
        `*💳 MENU TOP UP E-WALLET*\n\n` +
        `Pilih saldo dompet digital yang ingin diisi:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🟢 Saldo DANA', 'topup_dana'), Markup.button.callback('🔵 Saldo OVO', 'topup_ovo')],
                [Markup.button.callback('🟠 Saldo ShopeePay', 'topup_shopeepay'), Markup.button.callback('🟣 Saldo GoPay', 'topup_gopay')],
                [Markup.button.callback('« Kembali ke Menu Utama', 'back_home')]
            ])
        }
    );
});

// 4. Menu Voucher Game
bot.action('menu_games', (ctx) => {
    return ctx.editMessageText(
        `*🎮 MENU VOUCHER GAME*\n\n` +
        `Pilih game populer untuk pembelian diamond/UC:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔥 Mobile Legends (Diamond)', 'game_ml'), Markup.button.callback('⚔️ Free Fire (Diamond)', 'game_ff')],
                [Markup.button.callback('🎯 PUBG Mobile (UC)', 'game_pubg'), Markup.button.callback('⚡ Genshin Impact (Genesis)', 'game_genshin')],
                [Markup.button.callback('« Kembali ke Menu Utama', 'back_home')]
            ])
        }
    );
});

// Sub-menu Tagihan PLN / BPJS / PDAM
bot.action(['tagihan_pln', 'tagihan_bpjs', 'tagihan_pdam'], (ctx) => {
    const layanan = ctx.match[0] === 'tagihan_pln' ? 'Listrik PLN' : ctx.match[0] === 'tagihan_bpjs' ? 'BPJS Kesehatan' : 'PDAM Air Bersih';
    return ctx.editMessageText(
        `*💡 PEMBAYARAN ${layanan.toUpperCase()}*\n\n` +
        `Silakan balas chat ini dengan mengetikkan *Nomor Pelanggan / ID Billing* Anda.\n` +
        `Contoh: \`123456789012\`\n\n` +
        `_(Sistem akan mengecek rincian tagihan secara otomatis)_`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback('« Kembali ke Menu PPOB', 'menu_ppob_tagihan')]])
        }
    );
});

// Sub-menu E-Wallet & Game
bot.action(/^(topup_|game_).+/, (ctx) => {
    return ctx.reply(
        `📱 Produk berhasil dipilih.\n\n` +
        `Silakan ketik nomor HP terdaftar (untuk E-Wallet) atau *User ID & Server ID* (untuk Game) di kolom chat untuk melanjutkan ke pembayaran QRIS.`,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('« Batalkan', 'back_home')]]) }
    );
});

// Kontak Admin / CS (Tanpa Email)
bot.action('contact_admin', (ctx) => {
    return ctx.reply(
        `*📞 LAYANAN PELANGGAN INDOSAKU*\n\n` +
        `• WhatsApp: \`08131611563\`\n\n` +
        `Silakan klik tombol di bawah untuk chat langsung dengan Admin:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.url('💬 Chat WhatsApp Admin', 'https://wa.me/628131611563?text=Halo%20Admin%20INDOSAKU,%20saya%20butuh%20bantuan.')],
                [Markup.button.callback('« Kembali ke Menu Utama', 'back_home')]
            ])
        }
    );
});

// Tombol Kembali ke Beranda
bot.action('back_home', (ctx) => {
    return showMainMenu(ctx, true);
});

// Handler Input Teks
bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();

    if (text === '/start') {
        return showMainMenu(ctx, false);
    }

    if (text.startsWith('08') || text.startsWith('+62') || text.startsWith('62')) {
        return ctx.reply(
            `📱 Nomor Tujuan: *${text}* terdeteksi.\n\n` +
            `Pilih nominal pengisian:`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('Pulsa Rp 10.000 (QRIS)', 'checkout_qris_10k'), Markup.button.callback('Pulsa Rp 20.000 (QRIS)', 'checkout_qris_20k')],
                    [Markup.button.callback('Pulsa Rp 50.000 (QRIS)', 'checkout_qris_50k'), Markup.button.callback('Pulsa Rp 100.000 (QRIS)', 'checkout_qris_100k')],
                    [Markup.button.callback('« Batalkan', 'back_home')]
                ])
            }
        );
    }
    return ctx.reply(`Format teks diterima. Jika ingin kembali ke menu utama, silakan ketik /start.`);
});

// Simulasi Checkout / Pembuatan QRIS Payment Gateway
bot.action(/checkout_qris_.+/, async (ctx) => {
    const data = ctx.match[0];
    let nominal = 'Rp 20.000';
    let amountNum = 20000;
    
    if (data.includes('10k')) { nominal = 'Rp 10.000'; amountNum = 10000; }
    else if (data.includes('50k')) { nominal = 'Rp 50.000'; amountNum = 50000; }
    else if (data.includes('100k')) { nominal = 'Rp 100.000'; amountNum = 100000; }

    const simulatedQrisUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=INDOSAKU_PAYMENT_${amountNum}`;

    await ctx.reply(
        `✅ *Tagihan Pembayaran Berhasil Dibuat!*\n\n` +
        `📦 Kategori: Pulsa Elektrik\n` +
        `💰 Total Tagihan: *${nominal}*\n` +
        `⏳ Status: Menunggu Pembayaran\n\n` +
        `Silakan scan QRIS di bawah ini menggunakan Mobile Banking atau E-Wallet:`,
        { parse_mode: 'Markdown' }
    );

    return ctx.replyWithPhoto(simulatedQrisUrl, {
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Cek Status Pembayaran', 'check_payment')],
            [Markup.button.callback('« Batalkan Transaksi', 'back_home')]
        ])
    });
});

// Cek Status Pembayaran
bot.action('check_payment', (ctx) => {
    return ctx.reply(
        `⏳ Pembayaran belum terdeteksi. Sistem akan otomatis memproses pesanan setelah pembayaran QRIS Anda berhasil.`,
        { ...Markup.inlineKeyboard([[Markup.button.callback('« Kembali ke Menu', 'back_home')]]) }
    );
});

// Vercel Serverless Function Handler
module.exports = async (req, res) => {
    try {
        if (req.method === 'POST') {
            await bot.handleUpdate(req.body);
            res.status(200).send('OK');
        } else {
            res.status(200).send('Bot Telegram INDOSAKU Berjalan Aktif!');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};
