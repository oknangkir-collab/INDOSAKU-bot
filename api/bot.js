const { Telegraf, Markup, Scenes, session } = require('telegraf');
const crypto = require('crypto');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Konfigurasi Kredensial & Lisensi Topupku
const MERCHANT_ID = process.env.MERCHANT_ID || 'MID9B4963992206';
const API_KEY = '79b07bea389c464c2b304725d01844af4e3a90bf09fbc74b76c230fe94d93aec';
const TOPUPKU_URL = 'https://topupku.com';
const LICENSE_CODE = 'LIC-Z3V8-2UNT-HAWQ-CTOT';

// Mengaktifkan session sederhana untuk menyimpan data sementara pengguna
const userState = {};

// Fungsi helper aman untuk request ke Topupku API
async function topupRequest(endpoint, payload, customHeaders = {}) {
    try {
        const response = await fetch(`${TOPUPKU_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-License-Code': LICENSE_CODE,
                'Authorization': `Bearer ${API_KEY}`,
                ...customHeaders
            },
            body: JSON.stringify(payload)
        });

        const textResponse = await response.text();
        
        if (textResponse.trim().startsWith('<') || textResponse.includes('<!DOCTYPE')) {
            console.error('HTML Error Response:', textResponse);
            return { status: false, msg: 'Server Topupku mengembalikan halaman error (HTML). Periksa endpoint API.' };
        }

        return JSON.parse(textResponse);
    } catch (error) {
        console.error('Topupku API Error:', error);
        return { status: false, msg: error.message };
    }
}

// Handler Perintah /start
bot.start((ctx) => {
    delete userState[ctx.from.id];
    return ctx.reply(
        `🤖 *SELAMAT DATANG DI PPOB INDOSAKU*\n\n` +
        `Silakan pilih menu transaksi atau buat tagihan pembayaran melalui tombol di bawah:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('💳 Buat Tagihan / Deposit', 'menu_channels')],
                [Markup.button.callback('ℹ️ Cek Status Akun', 'check_profile')]
            ])
        }
    );
});

// Menu Pilihan Kanal Pembayaran
bot.action('menu_channels', async (ctx) => {
    delete userState[ctx.from.id];
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
        `📌 *PILIH KODE QRIS*\n\n• SP = qris\n• NQ = qris2`,
        Markup.inlineKeyboard([
            [Markup.button.callback('Pilih SP (QRIS)', 'set_bank_SP')],
            [Markup.button.callback('Pilih NQ (QRIS 2)', 'set_bank_NQ')],
            [Markup.button.callback('« Kembali', 'menu_channels')]
        ])
    );
});

// Sub-menu E-Wallet
bot.action('pay_ewallet', async (ctx) => {
    await ctx.editMessageText(
        `📌 *PILIH E-WALLET*\n\n• DA = dana | OV = ovo\n• GOPAY = gopay | SA = shopeepay`,
        Markup.inlineKeyboard([
            [Markup.button.callback('DANA (DA)', 'set_bank_DA'), Markup.button.callback('OVO (OV)', 'set_bank_OV')],
            [Markup.button.callback('GoPay (GOPAY)', 'set_bank_GOPAY'), Markup.button.callback('ShopeePay (SA)', 'set_bank_SA')],
            [Markup.button.callback('« Kembali', 'menu_channels')]
        ])
    );
});

// Sub-menu Bank
bot.action('pay_bank', async (ctx) => {
    await ctx.editMessageText(
        `📌 *PILIH VIRTUAL ACCOUNT BANK*\n\n• BCAVA = bca | M2 = mandiri\n• BR = bri | B1 = CIMB Niaga`,
        Markup.inlineKeyboard([
            [Markup.button.callback('BCA (BCAVA)', 'set_bank_BCAVA'), Markup.button.callback('Mandiri (M2)', 'set_bank_M2')],
            [Markup.button.callback('BRI (BR)', 'set_bank_BR'), Markup.button.callback('CIMB (B1)', 'set_bank_B1')],
            [Markup.button.callback('« Kembali', 'menu_channels')]
        ])
    );
});

// Sub-menu Retail
bot.action('pay_retail', async (ctx) => {
    await ctx.editMessageText(
        `📌 *PILIH PEMBAYARAN RITEL*\n\n• INDOMARET = Indomaret\n• FT = Pegadaian/ALFA/Pos`,
        Markup.inlineKeyboard([
            [Markup.button.callback('Indomaret (INDOMARET)', 'set_bank_INDOMARET'), Markup.button.callback('Alfamart/Pos (FT)', 'set_bank_FT')],
            [Markup.button.callback('« Kembali', 'menu_channels')]
        ])
    );
});

// Ketika User Memilih Kanal -> Minta Masukkan Nominal
bot.action(/^set_bank_(.+)$/, async (ctx) => {
    const kodeBank = ctx.match[1];
    userState[ctx.from.id] = { step: 'WAITING_NOMINAL', kode_bank: kodeBank };

    await ctx.editMessageText(
        `🏦 Kanal Dipilih: \`${kodeBank}\`\n\n` +
        `💰 *SILAKAN KETIK NOMINAL PEMBAYARAN*\n` +
        `(Contoh: \`50000\` atau \`150000\`)`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback('« Batal / Menu Utama', 'back_home')]])
        }
    );
});

// Mendengarkan Pesan Teks dari Pengguna (Untuk Nominal & Keterangan)
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const state = userState[userId];

    if (!state) return; // Jika tidak sedang dalam sesi input, abaikan

    if (state.step === 'WAITING_NOMINAL') {
        const nominalInput = ctx.message.text.trim().replace(/[^0-9]/g, '');
        const nominal = parseInt(nominalInput);

        if (isNaN(nominal) || nominal <= 0) {
            return ctx.reply('❌ Nominal tidak valid. Harap masukkan angka saja (Contoh: 25000):');
        }

        state.nominal = nominal;
        state.step = 'WAITING_NOTE';

        return ctx.reply(
            `📝 *MASUKKAN KETERANGAN / NAMA PRODUK*\n` +
            `(Contoh: \`Topup Saldo / Bayar Pulsa\`)`,
            { parse_mode: 'Markdown' }
        );
    }

    if (state.step === 'WAITING_NOTE') {
        const note = ctx.message.text.trim();
        const kodeBank = state.kode_bank;
        const nominal = state.nominal;

        delete userState[userId]; // Reset sesi

        const processingMsg = await ctx.reply(`⏳ Sedang memproses pembuatan tagihan sebesar Rp ${nominal.toLocaleString('id-ID')}...`);

        const reffId = `ORDER-${Date.now().toString().slice(-8)}`;
        const stringToSign = `${MERCHANT_ID}:${reffId}`;
        const signature = crypto.createHmac('sha256', API_KEY).update(stringToSign).digest('hex');

        // Request ke endpoint /api/deposit dengan nominal & catatan dinamis
        const response = await topupRequest('/api/deposit', {
            reff_id: reffId,
            kode_bank: kodeBank,
            nominal: nominal.toString(),
            note: note
        }, {
            "X-Order-Signature": signature
        });

        // Hapus pesan loading
        try { await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id); } catch (e) {}

        if (response && response.status) {
            const data = response.data || {};
            const paymentUrl = data.payment_url || data.checkout_url || `https://topupku.com/pay/${reffId}`;
            
            await ctx.reply(
                `✅ *TAGIHAN PEMBAYARAN BERHASIL DIBUAT*\n\n` +
                `🆔 Reff ID: \`${reffId}\`\n` +
                `📌 Keterangan: *${note}*\n` +
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
    }
});

// Tombol Kembali ke Menu Utama
bot.action('back_home', async (ctx) => {
    delete userState[ctx.from.id];
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
    delete userState[ctx.from.id];
    const reffId = `CHECK-${Date.now()}`;
    const stringToSign = `${MERCHANT_ID}:${reffId}`;
    const signature = crypto.createHmac('sha256', API_KEY).update(stringToSign).digest('hex');

    const res = await topupRequest('/api/profile', { reff_id: reffId }, {
        "X-Order-Signature": signature
    });

    if (res && res.status) {
        await ctx.editMessageText(
            `✅ *STATUS AKUN AKTIF*\n\n` +
            `👤 Nama: ${res.data?.name || MERCHANT_ID}\n` +
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
