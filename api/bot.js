const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Link Logo Resmi INDOSAKU
const INDOSAKU_LOGO_URL = 'https://ibb.co.com/1G94Bcm9'; 

// Fungsi Utama Menampilkan Menu (Dengan Foto/Logo Banner)
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
            return ctx.replyWithPhoto(INDOSAKU_LOGO_URL, {
                caption: captionText,
                parse_mode: 'Markdown',
                ...keyboard
            });
        } else {
            return ctx.reply(captionText, {
                parse_mode: 'Markdown',
                ...keyboard
            });
        }
    } catch (err) {
        return ctx.reply(captionText, { parse_mode: 'Markdown', ...keyboard });
    }
};

// Command /start
bot.start((ctx) => {
    return showMainMenu(ctx, true);
});

// 1. Menu Pulsa & Paket Data
bot.action('menu_pulsa_data', (ctx) => {
    return ctx.editMessageCaption(
        `📱 *MENU PULSA & PAKET DATA*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `Silakan kirim nomor handphone tujuan Anda ke chat ini dengan format:\n` +
        `Contoh: \`08123456789\`\n\n` +
        `_(Sistem otomatis mendeteksi operator)_`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback('« Kembali ke Menu Utama', 'back_home')]])
        }
    ).catch(() => ctx.reply('Silakan ketik /start untuk kembali ke menu utama.'));
});

// 2. Menu Tagihan PPOB
bot.action('menu_ppob_tagihan', (ctx) => {
    return ctx.editMessageCaption(
        `💡 *MENU TAGIHAN PPOB*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
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
    ).catch(() => {});
});

// 3. Menu Top Up E-Wallet
bot.action('menu_ewallet', (ctx) => {
    return ctx.editMessageCaption(
        `💳 *MENU TOP UP E-WALLET*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `Pilih saldo dompet digital tujuan Anda:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🟢 DANA', 'topup_dana'), Markup.button.callback('🔵 OVO', 'topup_ovo')],
                [Markup.button.callback('🟠 ShopeePay', 'topup_shopeepay'), Markup.button.callback('🟣 GoPay', 'topup_gopay')],
                [Markup.button.callback('« Kembali ke Menu Utama', 'back_home')]
            ])
        }
    ).catch(() => {});
});

// 4. Menu Voucher Game
bot.action('menu_games', (ctx) => {
    return ctx.editMessageCaption(
        `🎮 *MENU VOUCHER GAME*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `Pilih game favorit Anda untuk top up diamond/UC:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔥 Mobile Legends', 'game_ml'), Markup.button.callback('⚔️ Free Fire', 'game_ff')],
                [Markup.button.callback('🎯 PUBG Mobile', 'game_pubg'), Markup.button.callback('⚡ Genshin Impact', 'game_genshin')],
                [Markup.button.callback('« Kembali ke Menu Utama', 'back_home')]
            ])
        }
    ).catch(() => {});
});

// Sub-menu Tagihan PLN / BPJS / PDAM
bot.action(['tagihan_pln', 'tagihan_bpjs', 'tagihan_pdam'], (ctx) => {
    const layanan = ctx.match[0] === 'tagihan_pln' ? 'Listrik PLN' : ctx.match[0] === 'tagihan_bpjs' ? 'BPJS Kesehatan' : 'PDAM Air Bersih';
    return ctx.reply(
        `💡 *PEMBAYARAN ${layanan.toUpperCase()}*\n\n` +
        `Silakan ketik *Nomor Pelanggan / ID Billing* Anda di chat.\n` +
        `Contoh: \`123456789012\``,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('« Kembali', 'menu_ppob_tagihan')]]) }
    );
});

// Sub-menu E-Wallet & Game
bot.action(/^(topup_|game_).+/, (ctx) => {
    return ctx.reply(
        `📱 *INPUT TUJUAN TRANSAKSI*\n\n` +
        `Silakan ketik nomor HP terdaftar (untuk E-Wallet) atau *User ID & Server ID* (untuk Game) di kolom chat untuk memproses tagihan.`,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('« Batalkan', 'back_home')]]) }
    );
});

// Kontak Admin / CS
bot.action('contact_admin', (ctx) => {
    return ctx.reply(
        `📞 *LAYANAN PELANGGAN INDOSAKU*\n\n` +
        `• WhatsApp: \`08131611563\`\n` +
        `• Lokasi: Cibinong, Kabupaten Bogor\n\n` +
        `Silakan klik tombol di bawah untuk terhubung langsung dengan Admin:`,
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
    return showMainMenu(ctx, false);
});

// Handler Input Teks
bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();

    if (text === '/start') {
        return showMainMenu(ctx, true);
    }

    if (text.startsWith('08') || text.startsWith('+62') || text.startsWith('62')) {
        return ctx.reply(
            `📱 *NOMOR TUJUAN TERDETEKSI*\n` +
            `Nomor: \`${text}\`\n\n` +
            `Pilih nominal pengisian pulsa/paket data:`,
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
    return ctx.reply(`Format teks diterima. Ketik /start untuk kembali ke menu utama INDOSAKU.`);
});

// Pemilihan Nominal -> Menampilkan Pilihan Metode Pembayaran (QRIS / Virtual Account BinderPay)
bot.action(/nominal_.+/, (ctx) => {
    const data = ctx.match[0];
    let nominalCode = '20k';
    if (data.includes('10k')) nominalCode = '10k';
    else if (data.includes('50k')) nominalCode = '50k';
    else if (data.includes('100k')) nominalCode = '100k';

    return ctx.editMessageText(
        `💳 *PILIH METODE PEMBAYARAN*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `Silakan pilih metode pembayaran yang Anda inginkan melalui BinderPay:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('⚡ QRIS Instant (All Payment)', `pay_qris_${nominalCode}`)],
                [Markup.button.callback('🏦 Virtual Account (BCA/BRI/BNI/Mandiri)', `pay_va_${nominalCode}`)],
                [Markup.button.callback('« Kembali', 'back_home')]
            ])
        }
    );
});

// 1. Eksekusi Pembayaran QRIS BinderPay
bot.action(/pay_qris_.+/, async (ctx) => {
    const data = ctx.match[0];
    let nominal = 'Rp 20.000';
    let amountNum = 20000;
    
    if (data.includes('10k')) { nominal = 'Rp 10.000'; amountNum = 10000; }
    else if (data.includes('50k')) { nominal = 'Rp 50.000'; amountNum = 50000; }
    else if (data.includes('100k')) { nominal = 'Rp 100.000'; amountNum = 100000; }

    // Simulasi QRIS URL (Nantinya diintegrasikan dengan fetch() API BinderPay QRIS)
    const simulatedQrisUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=INDOSAKU_QRIS_${amountNum}`;

    await ctx.reply(
        `✅ *TAGIHAN QRIS DIBUAT (BINDERPAY)*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `📦 Produk: Pulsa Elektrik\n` +
        `💰 Total: *${nominal}*\n` +
        `⏳ Status: Menunggu Pembayaran\n\n` +
        `Silakan scan QRIS di bawah ini:`,
        { parse_mode: 'Markdown' }
    );

    return ctx.replyWithPhoto(simulatedQrisUrl, {
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Cek Status Pembayaran', 'check_payment')],
            [Markup.button.callback('« Batalkan Transaksi', 'back_home')]
        ])
    });
});

// 2. Eksekusi Pembayaran Virtual Account (VA) BinderPay
bot.action(/pay_va_.+/, async (ctx) => {
    const data = ctx.match[0];
    let nominal = 'Rp 20.000';
    
    if (data.includes('10k')) { nominal = 'Rp 10.000'; }
    else if (data.includes('50k')) { nominal = 'Rp 50.000'; }
    else if (data.includes('100k')) { nominal = 'Rp 100.000'; }

    // Simulasi Nomor VA (Nantinya diganti dengan response asli dari endpoint API VA BinderPay)
    const simulatedVaNumber = '88001831611563'; 

    return ctx.reply(
        `✅ *TAGIHAN VIRTUAL ACCOUNT DIBUAT (BINDERPAY)*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `📦 Produk: Pulsa Elektrik\n` +
        `💰 Total Tagihan: *${nominal}*\n` +
        `🏦 Bank VA: *BCA / BRI / BNI / Mandiri*\n` +
        `🔢 Nomor VA: \`${simulatedVaNumber}\`\n\n` +
        `⚠️ *Instruksi:* Silakan lakukan transfer melalui Mobile Banking atau ATM menggunakan nomor Virtual Account di atas. Saldo akan otomatis terverifikasi.`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔄 Cek Status Pembayaran', 'check_payment')],
                [Markup.button.callback('« Batalkan Transaksi', 'back_home')]
            ])
        }
    );
});

// Cek Status Pembayaran
bot.action('check_payment', (ctx) => {
    return ctx.reply(
        `⏳ Pembayaran belum terdeteksi. Sistem akan otomatis memproses pesanan setelah pembayaran QRIS/VA BinderPay Anda berhasil.`,
        { ...Markup.inlineKeyboard([[Markup.button.callback('« Kembali ke Menu', 'back_home')]]) }
    );
});

// Vercel Handler
module.exports = async (req, res) => {
    try {
        if (req.method === 'POST') {
            await bot.handleUpdate(req.body);
            res.status(200).send('OK');
        } else {
            res.status(200).send('Bot Telegram INDOSAKU Pro (BinderPay QRIS & VA) Berjalan Aktif!');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};
