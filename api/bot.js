const { Telegraf, Markup } = require('telegraf');

// Ambil Token Bot dari Environment Variable Vercel
const bot = new Telegraf(process.env.BOT_TOKEN);

// Menu Utama /start
bot.start((ctx) => {
    const userName = ctx.from.first_name || 'Pelanggan';
    return ctx.reply(
        `Halo *${userName}*! Selamat datang di *INDOSAKU Bot* ⚡\n\n` +
        `Pusat transaksi Pulsa, PPOB (PLN, BPJS, PDAM, E-Wallet), dan Aksesoris HP terpercaya di Cibinong, Bogor.\n\n` +
        `Silakan pilih menu transaksi di bawah ini:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('⚡ Pulsa & Paket Data', 'menu_pulsa')],
                [Markup.button.callback('💡 Bayar Tagihan PPOB', 'menu_ppob')],
                [Markup.button.callback('🎧 Katalog Aksesoris HP', 'menu_aksesoris')],
                [Markup.button.callback('📞 Hubungi Admin / CS', 'contact_admin')]
            ])
        }
    );
});

// Action: Menu Pulsa
bot.action('menu_pulsa', (ctx) => {
    return ctx.editMessageText(
        `*📱 MENU PULSA & PAKET DATA*\n\n` +
        `Silakan kirim nomor handphone tujuan Anda dengan format:\n` +
        `Contoh: \`08131611563\`\n\n` +
        `_(Bot akan mendeteksi operator secara otomatis)_`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback('« Kembali ke Menu Utama', 'back_home')]])
        }
    );
});

// Action: Menu PPOB
bot.action('menu_ppob', (ctx) => {
    return ctx.editMessageText(
        `*💡 MENU TAGIHAN PPOB*\n\n` +
        `Pilih layanan tagihan yang ingin Anda cek atau bayar:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('⚡ Token / Tagihan PLN', 'ppob_pln')],
                [Markup.button.callback('🏥 BPJS Kesehatan', 'ppob_bpjs')],
                [Markup.button.callback('🚰 PDAM Air Bersih', 'ppob_pdam')],
                [Markup.button.callback('« Kembali ke Menu Utama', 'back_home')]
            ])
        }
    );
});

// Action: Menu Aksesoris
bot.action('menu_aksesoris', (ctx) => {
    return ctx.editMessageText(
        `*🎧 KATALOG AKSESORIS HP INDOSAKU*\n\n` +
        `1. Softcase Silikon Anti-Crack - Rp 25.000\n` +
        `2. Tempered Glass Full Glue 9H - Rp 20.000\n` +
        `3. Fast Charger Adapter 33W - Rp 75.000\n` +
        `4. TWS Bluetooth Earbuds Pro - Rp 125.000\n\n` +
        `Untuk memesan produk fisik, silakan kunjungi website resmi kami atau hubungi Admin via WhatsApp.`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.url('🌐 Buka Website INDOSAKU', 'https://indosaku.vercel.app')],
                [Markup.button.callback('« Kembali ke Menu Utama', 'back_home')]
            ])
        }
    );
});

// Action: Hubungi Admin
bot.action('contact_admin', (ctx) => {
    return ctx.reply(
        `*📞 LAYANAN PELANGGAN INDOSAKU*\n\n` +
        `• WhatsApp: \`08131611563\`\n` +
        `• Email: \`aangpratama187@gmail.com\`\n` +
        `• Lokasi: Cibinong, Kabupaten Bogor, Jawa Barat\n\n` +
        `Silakan klik tombol di bawah untuk langsung chat WhatsApp dengan Admin:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.url('💬 Chat WhatsApp Admin', 'https://wa.me/628131611563?text=Halo%20Admin%20INDOSAKU,%20saya%20butuh%20bantuan%20transaksi.')],
                [Markup.button.callback('« Kembali ke Menu Utama', 'back_home')]
            ])
        }
    );
});

// Action: Kembali ke Beranda
bot.action('back_home', (ctx) => {
    return ctx.editMessageText(
        `*INDOSAKU BOT - Menu Utama*\n\nSilakan pilih layanan yang Anda butuhkan:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('⚡ Pulsa & Paket Data', 'menu_pulsa')],
                [Markup.button.callback('💡 Bayar Tagihan PPOB', 'menu_ppob')],
                [Markup.button.callback('🎧 Katalog Aksesoris HP', 'menu_aksesoris')],
                [Markup.button.callback('📞 Hubungi Admin / CS', 'contact_admin')]
            ])
        }
    );
});

// Text Handler: Deteksi Nomor Telepon Input
bot.on('text', (ctx) => {
    const text = ctx.message.text.trim();
    if (text.startsWith('08') || text.startsWith('+62') || text.startsWith('62')) {
        return ctx.reply(
            `📱 Nomor Tujuan: *${text}* terdeteksi.\n\n` +
            `Silakan pilih nominal pulsa/paket data:`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('Pulsa Rp 10.000', 'buy_10k'), Markup.button.callback('Pulsa Rp 20.000', 'buy_20k')],
                    [Markup.button.callback('Pulsa Rp 50.000', 'buy_50k'), Markup.button.callback('Pulsa Rp 100.000', 'buy_100k')],
                    [Markup.button.callback('« Batalkan', 'back_home')]
                ])
            }
        );
    }
    return ctx.reply(`Perintah tidak dikenali. Ketik /start untuk kembali ke menu utama bot INDOSAKU.`);
});

// Action: Simulasi Pembelian
bot.action(/buy_.+/, (ctx) => {
    return ctx.reply(
        `✅ *Pesanan Berhasil Dibuat!*\n\n` +
        `Metode Pembayaran: *QRIS Instant / Virtual Account*\n` +
        `Silakan lakukan pembayaran agar sistem otomatis memproses pengisian ke nomor tujuan Anda.`,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('🔄 Transaksi Baru', 'back_home')]]) }
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
        res.status(500).send('Error internal server');
    }
};
