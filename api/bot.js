const { Telegraf, Markup } = require('telegraf');
const crypto = require('crypto');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Konfigurasi Kredensial Topupku
const MERCHANT_ID = process.env.MERCHANT_ID || 'MID9B4963992206';
const API_KEY = process.env.API_KEY || 'ISI_API_KEY_ANDA';
const TOPUPKU_URL = 'https://api.topupku.com'; // Sesuaikan domain API Topupku

// Fungsi helper untuk melakukan request ke Topupku API
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
        return await response.json();
    } catch (error) {
        console.error('Topupku API Error:', error);
        return { status: false, msg: error.message };
    }
}

// Handler Perintah /start
bot.start((ctx) => {
    return ctx.reply(
        `🤖 *SELAMAT DATANG DI PPOB INDOSAKU*\n\n` +
        `Silakan pilih menu transaksi atau buat tagihan pembayaran instan (Snap Deposit) melalui tombol di bawah:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('💳 Buat Tagihan / Deposit', 'menu_channels')],
                [Markup.button.callback('ℹ️ Cek Status Akun', 'check_profile')]
            ])
        }
    );
});

// Menu Pilihan Kanal Pembayaran Berdasarkan Referensi Postman
bot.action('menu_channels', async (ctx) => {
    await ctx.editMessageText(
        `📌 *PILIH KANAL PEMBAYARAN*\n\n` +
        `Silakan pilih kategori metode pembayaran yang diinginkan oleh pelanggan:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('📱 QRIS (SP / NQ)', 'pay_qris')],
                [Markup.button.callback('👛 E-Wallet (DANA/OVO/Gopay)', 'pay_ewallet')],
                [Markup.button.callback('🏦 Transfer Bank (BCA/BRI/Mandiri)', 'pay_bank')],
                [Markup.button.callback('🏪 Ritel (Indomaret / Alfamart)', 'pay_retail')],
                [Markup.button.callback('« Menu Utama', 'back_home')]
            ])
        }
    );
});

// Sub-menu QRIS
bot.action('pay_qris', async (ctx) => {
    await ctx.editMessageText(
        `📌 *PILIH KODE QRIS*\n\n` +
        `• SP = QRIS Utama\n` +
        `• NQ = QRIS Alternatif`,
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
        `• DA = DANA | OV = OVO\n` +
        `• LA = LinkAja | SA/SHOPEEPAY = ShopeePay\n` +
        `• GOPAY = GoPay | ASTRAPAY = AstraPay`,
        Markup.inlineKeyboard([
            [Markup.button.callback('DANA (DA)', 'create_dep_DA'), Markup.button.callback('OVO (OV)', 'create_dep_OV')],
            [Markup.button.callback('ShopeePay (SA)', 'create_dep_SA'), Markup.button.callback('GoPay (GOPAY)', 'create_dep_GOPAY')],
            [Markup.button.callback('« Kembali', 'menu_channels')]
        ])
    );
});

// Sub-menu Bank
bot.action('pay_bank', async (ctx) => {
    await ctx.editMessageText(
        `📌 *PILIH VIRTUAL ACCOUNT BANK*\n\n` +
        `• BCAVA = BCA | M2 = Mandiri\n` +
        `• BR = BRI | I1 = BNI | B1 = CIMB Niaga`,
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
        `• FT = Pegadaian / Alfamart / Pos`,
        Markup.inlineKeyboard([
            [Markup.button.callback('Indomaret', 'create_dep_INDOMARET'), Markup.button.callback('Alfamart/FT (FT)', 'create_dep_FT')],
            [Markup.button.callback('« Kembali', 'menu_channels')]
        ])
    );
});

// Aksi Eksekusi Pembuatan Deposit / Tagihan Berdasarkan Kode Bank yang Dipilih
bot.action(/^create_dep_(.+)$/, async (ctx) => {
    const kodeBank = ctx.match[1];
    const reffId = `INDOSAKU-${Date.now().toString().slice(-8)}`;
    const nominal = 10000; // Contoh nominal default, bisa disesuaikan

    await ctx.editMessageText(`⏳ Sedang membuat tautan pembayaran untuk kanal *${kodeBank}*...`, { parse_mode: 'Markdown' });

    // Enkripsi Signature 2 lapis HMAC-SHA256
    const stringToSign = `${MERCHANT_ID}:${reffId}`;
    const signature = crypto.createHmac('sha256', API_KEY).update(stringToSign).digest('hex');

    // Request ke endpoint /api/deposit sesuai referensi cURL Postman
    const response = await topupRequest('/api/deposit', {
        reff_id: reffId,
        kode_bank: kodeBank,
        nominal: nominal.toString()
    }, {
        "Authorization": MERCHANT_ID,
        "X-Order-Signature": signature
    });

    if (response && response.status) {
        const data = response.data || {};
        const paymentUrl = data.payment_url || data.checkout_url || `https://topupku.com/pay/${reffId}`;
        
        await ctx.reply(
            `✅ *TAGIHAN PEMBAYARAN BERHASIL DIBUAT*\n\n` +
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
            `❌ *Gagal Membuat Tagihan*\n\nPesan: ${response.msg || 'Terjadi kesalahan pada server.'}`,
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
                [Markup.button.callback('💳 Buat Tagihan / Deposit', 'menu_channels')],
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
