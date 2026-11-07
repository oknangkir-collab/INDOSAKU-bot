const { Telegraf, Markup } = require('telegraf');
const crypto = require('crypto');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Konfigurasi Kredensial Topupku
const MERCHANT_ID = process.env.MERCHANT_ID || 'MID9B4963992206';
const API_KEY = process.env.API_KEY || 'ISI_API_KEY_ANDA';
const TOPUPKU_URL = process.env.TOPUPKU_DOMAIN || 'https://api.topupku.com';

// Fungsi helper aman untuk request ke Topupku API (Anti HTML/JSON Parse Error)
async function topupRequest(endpoint, payload, headers = {}) {
    try {
        const response = await fetch(`${TOPUPKU_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            body: JSON.stringify(payload)
        });

        const textResponse = await response.text();
        
        // Deteksi jika server mengembalikan halaman HTML (Error 404/500/Cloudflare)
        if (textResponse.trim().startsWith('<') || textResponse.includes('<!DOCTYPE')) {
            console.error('HTML Error Response:', textResponse);
            return { status: false, msg: 'Server Topupku mengembalikan halaman error (HTML). Periksa endpoint atau domain.' };
        }

        return JSON.parse(textResponse);
    } catch (error) {
        console.error('Topupku API Error:', error);
        return { status: false, msg: error.message };
    }
}

// Handler Perintah /start
bot.start((ctx) => {
    return ctx.reply(
        `🤖 *SELAMAT DATANG DI PPOB INDOSAKU*\n\n` +
        `Silakan pilih menu transaksi atau buat deposit/tagihan pembayaran melalui tombol di bawah:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('💳 Buat Deposit / Tagihan', 'menu_channels')],
                [Markup.button.callback('ℹ️ Cek Status Akun', 'check_profile')]
            ])
        }
    );
});

// Menu Pilihan Kanal Pembayaran Berdasarkan Referensi Postman
bot.action('menu_channels', async (ctx) => {
    await ctx.editMessageText(
        `📌 *PILIH KANAL PEMBAYARAN*\n\n` +
        `Silakan pilih kategori metode pembayaran yang diinginkan:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('📱 QRIS (SP / NQ)', 'pay_qris')],
                [Markup.button.callback('👛 E-Wallet (DA/OV/GOPAY)', 'pay_ewallet')],
                [Markup.button.callback('🏦 Transfer Bank (BCA/BRI/Mandiri/CIMB)', 'pay_bank')],
                [Markup.button.callback('🏪 Ritel (Indomaret / FT)', 'pay_retail')],
                [Markup.button.callback('« Menu Utama', 'back_home')]
            ])
        }
    );
});

// Sub-menu QRIS
bot.action('pay_qris', async (ctx) => {
    await ctx.editMessageText(
        `📌 *PILIH KODE QRIS*\n\n` +
        `• SP = qris\n` +
        `• NQ = qris2`,
        Markup.inlineKeyboard([
            [Markup.button.callback('Pilih SP (QRIS)', 'create_dep_SP')],
            [Markup.button.callback('Pilih NQ (QRIS 2)', 'create_dep_NQ')],
            [Markup.button.callback('« Kembali', 'menu_channels')]
        ])
    );
});

// Sub-menu E-Wallet
bot.action('pay_ewallet', async (ctx) => {
    await ctx.editMessageText(
        `📌 *PILIH E-WALLET*\n\n` +
        `• DA = dana | OV = ovo\n` +
        `• LA = linkaja | SA = shopeepay\n` +
        `• GOPAY = gopay | ASTRAPAY = astrapay`,
        Markup.inlineKeyboard([
            [Markup.button.callback('DANA (DA)', 'create_dep_DA'), Markup.button.callback('OVO (OV)', 'create_dep_OV')],
            [Markup.button.callback('GoPay (GOPAY)', 'create_dep_GOPAY'), Markup.button.callback('ShopeePay (SA)', 'create_dep_SA')],
            [Markup.button.callback('« Kembali', 'menu_channels')]
        ])
    );
});

// Sub-menu Bank
bot.action('pay_bank', async (ctx) => {
    await ctx.editMessageText(
        `📌 *PILIH VIRTUAL ACCOUNT BANK*\n\n` +
        `• BCAVA = bca | M2 = mandiri\n` +
        `• BR = bri | I1 = bni | B1 = CIMB Niaga`,
        Markup.inlineKeyboard([
            [Markup.button.callback('BCA (BCAVA)', 'create_dep_BCAVA'), Markup.button.callback('Mandiri (M2)', 'create_dep_M2')],
            [Markup.button.callback('BRI (BR)', 'create_dep_BR'), Markup.button.callback('CIMB (B1)', 'create_dep_B1')],
            [Markup.button.callback('« Kembali', 'menu_channels')]
        ])
    );
});

// Sub-menu Retail
bot.action('pay_retail', async (ctx) => {
    await ctx.editMessageText(
        `📌 *PILIH PEMBAYARAN RITEL*\n\n` +
        `• INDOMARET = Indomaret\n` +
        `• FT = Pegadaian/ALFA/Pos`,
        Markup.inlineKeyboard([
            [Markup.button.callback('Indomaret (INDOMARET)', 'create_dep_INDOMARET'), Markup.button.callback('Alfamart/Pos (FT)', 'create_dep_FT')],
            [Markup.button.callback('« Kembali', 'menu_channels')]
        ])
    );
});

// Aksi Eksekusi Pembuatan Deposit Berdasarkan Kanal yang Dipilih (/api/deposit)
bot.action(/^create_dep_(.+)$/, async (ctx) => {
    const kodeBank = ctx.match[1];
    const reffId = `INDOSAKU-${Date.now().toString().slice(-8)}`;
    const nominal = "10000"; // Nominal default transaksi (bisa disesuaikan)

    await ctx.editMessageText(`⏳ Sedang memproses deposit untuk kanal *${kodeBank}*...`, { parse_mode: 'Markdown' });

    // Enkripsi Signature HMAC-SHA256
    const stringToSign = `${MERCHANT_ID}:${reffId}`;
    const signature = crypto.createHmac('sha256', API_KEY).update(stringToSign).digest('hex');

    // Request ke endpoint /api/deposit sesuai dokumentasi Postman
    const response = await topupRequest('/api/deposit', {
        reff_id: reffId,
        kode_bank: kodeBank,
        nominal: nominal
    }, {
        "Authorization": MERCHANT_ID,
        "X-Order-Signature": signature
    });

    if (response && response.status) {
        const data = response.data || {};
        const paymentUrl = data.payment_url || data.checkout_url || `https://topupku.com/pay/${reffId}`;
        
        await ctx.reply(
            `✅ *DEPOSIT BERHASIL DIBUAT*\n\n` +
            `🆔 Reff ID: \`${reffId}\`\n` +
            `🏦 Kanal: \`${kodeBank}\`\n` +
            `💰 Nominal: Rp ${Number(nominal).toLocaleString('id-ID')}\n` +
            `📊 Status: *Unpaid*\n\n` +
            `Silakan klik tombol di bawah untuk menyelesaikan pembayaran:`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.url('🌐 Buka Link Pembayaran', paymentUrl)],
                    [Markup.button.callback('« Menu Utama', 'back_home')]
                ])
            }
        );
    } else {
        await ctx.reply(
            `❌ *Gagal Membuat Deposit*\n\nPesan: ${response.msg || 'Terjadi kesalahan pada server.'}`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback('« Kembali', 'menu_channels')]])
            }
        );
    }
});

// Tombol Kembali ke Menu Utama
bot.action('back_home', async (ctx) => {
    return ctx.editMessageText(
        `🤖 *PPOB INDOSAKU - MENU UTAMA*\n\nSilakan pilih menu transaksi di bawah:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('💳 Buat Deposit / Tagihan', 'menu_channels')],
                [Markup.button.callback('ℹ️ Cek Status Akun', 'check_profile')]
            ])
        }
    );
});

// Cek Profil / Status Akun
bot.action('check_profile', async (ctx) => {
    const reffId = `CHECK-${Date.now()}`;
    const stringToSign = `${MERCHANT_ID}:${reffId}`;
    const signature = crypto.createHmac('sha256', API_KEY).update(stringToSign).digest('hex');

    const res = await topupRequest('/api/profile', { reff_id: reffId }, {
        "Authorization": MERCHANT_ID,
        "X-Order-Signature": signature
    });

    if (res && res.status) {
        await ctx.editMessageText(
            `✅ *STATUS AKUN AKTIF*\n\n` +
            `👤 Nama: ${res.data?.name || 'Merchant INDOSAKU'}\n` +
            `💰 Saldo: Rp ${(res.data?.balance || 0).toLocaleString('id-ID')}\n`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback('« Menu Utama', 'back_home')]])
            }
        );
    } else {
        await ctx.editMessageText(
            `❌ *Gagal Memuat Profil*\nPesan: ${res.msg || 'Status akun bermasalah.'}`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback('« Menu Utama', 'back_home')]])
            }
        );
    }
});

// Ekspor handler serverless untuk Vercel (Webhook tunggal)
module.exports = async (req, res) => {
    try {
        if (req.method === 'POST') {
            await bot.handleUpdate(req.body);
            return res.status(200).json({ success: true });
        }
        return res.status(200).send('Bot PPOB INDOSAKU is running smoothly on Vercel!');
    } catch (e) {
        console.error('Webhook Error:', e);
        return res.status(500).json({ error: e.message });
    }
};
