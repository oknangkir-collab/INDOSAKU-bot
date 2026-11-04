const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Menu Utama /start
bot.start((ctx) => {
    const userName = ctx.from.first_name || 'Pelanggan';
    return ctx.reply(
        `Halo *${userName}*! Selamat datang di *INDOSAKU Bot* ⚡\n\n` +
        `Pusat transaksi Pulsa, PPOB, dan Aksesoris HP terpercaya.\n\n` +
        `Silakan pilih menu transaksi di bawah ini:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('⚡ Pulsa & Paket Data', 'menu_pulsa')],
                [Markup.button.callback('💡 Bayar Tagihan PPOB', 'menu_ppob')],
                [Markup.button.callback('📞 Hubungi Admin / CS', 'contact_admin')]
            ])
        }
    );
});

// Menu Pulsa
bot.action('menu_pulsa', (ctx) => {
    return ctx.editMessageText(
        `*📱 MENU PULSA & PAKET DATA*\n\n` +
        `Silakan kirim nomor handphone tujuan Anda (Contoh: \`08131611563\`):`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback('« Kembali ke Menu Utama', 'back_home')]])
        }
    );
});

// Menu PPOB
bot.action('menu_ppob', (ctx) => {
    return ctx.editMessageText(
        `*💡 MENU TAGIHAN PPOB*\n\n` +
        `Pilih layanan tagihan yang ingin dibayar:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('⚡ Token / Tagihan PLN', 'pay_pln')],
                [Markup.button.callback('🏥 BPJS Kesehatan', 'pay_bpjs')],
                [Markup.button.callback('« Kembali ke Menu Utama', 'back_home')]
            ])
        }
    );
});

// Kontak Admin
bot.action('contact_admin', (ctx) => {
    return ctx.reply(
        `*📞 LAYANAN PELANGGAN INDOSAKU*\n\n` +
        `• WhatsApp: \`08131611563\`\n` +
        `• Email: \`aangpratama187@gmail.com\`\n\n` +
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

// Kembali ke Beranda
bot.action('back_home', (ctx) => {
    return ctx.editMessageText(
        `*INDOSAKU BOT - Menu Utama*\n\nSilakan pilih layanan yang Anda butuhkan:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('⚡ Pulsa & Paket Data', 'menu_pulsa')],
                [Markup.button.callback('💡 Bayar Tagihan PPOB', 'menu_ppob')],
                [Markup.button.callback('📞 Hubungi Admin / CS', 'contact_admin')]
            ])
        }
    );
});

// Deteksi Input Nomor HP untuk Pulsa
bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (text.startsWith('08') || text.startsWith('+62') || text.startsWith('62')) {
        return ctx.reply(
            `📱 Nomor Tujuan: *${text}* terdeteksi.\n\n` +
            `Pilih nominal pulsa:`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('Pulsa Rp 20.000 (QRIS)', 'checkout_qris_20k')],
                    [Markup.button.callback('Pulsa Rp 50.000 (QRIS)', 'checkout_qris_50k')],
                    [Markup.button.callback('« Batalkan', 'back_home')]
                ])
            }
        );
    }
    return ctx.reply(`Perintah tidak dikenali. Ketik /start untuk kembali ke menu utama.`);
});

// Simulasi Integrasi Pembuatan Transaksi / Payment Gateway
bot.action(/checkout_qris_.+/, async (ctx) => {
    const data = ctx.match[0];
    const nominal = data.includes('50k') ? 'Rp 50.000' : 'Rp 20.000';
    const amountNum = data.includes('50k') ? 50000 : 20000;

    // CATATAN: Di sinilah Anda nantinya melakukan fetch() ke API Payment Gateway (misal BinderPay / Xendit / Midtrans)
    // Contoh struktur request API Gateway:
    // const response = await fetch('https://api.binderpay.com/v1/payment', { method: 'POST', body: ... })
    
    // Simulasi hasil tagihan QRIS instan dari Gateway:
    const simulatedQrisUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=INDOSAKU_PAYMENT_${amountNum}`;

    await ctx.reply(
        `✅ *Tagihan Pembayaran Berhasil Dibuat!*\n\n` +
        `📦 Produk: Pulsa Elektrik\n` +
        `💰 Total Tagihan: *${nominal}*\n` +
        `⏳ Status: Menunggu Pembayaran\n\n` +
        `Silakan scan QRIS di bawah ini menggunakan aplikasi E-Wallet atau Mobile Banking Anda:`,
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
        `⏳ Pembayaran belum terdeteksi oleh sistem. Jika Anda sudah melakukan pembayaran, sistem akan otomatis memproses transaksi dalam 1-2 menit.`,
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
            res.status(200).send('Bot Telegram Payment Gateway INDOSAKU Aktif!');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};
