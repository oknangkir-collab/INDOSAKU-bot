const { Telegraf, Markup } = require('telegraf');
const crypto = require('crypto');

const bot = new Telegraf(process.env.BOT_TOKEN);

const TOPUP_BASE_URL = "https://topupku.com";
const MERCHANT_ID = process.env.TOPUP_MERCHANT_ID || "MID9B4963992206";
const API_KEY = process.env.TOPUP_API_KEY || "79b07bea389c464c2b304725d01844af4e3a90bf09fbc74b76c230fe94d93aec";

const INDOSAKU_LOGO_URL = 'https://ibb.co.com/1G94Bcm9';
const ADMIN_TELEGRAM_ID = '8559448151'; 

const userSession = {};

// Helper untuk Request ke Topupku API
const topupRequest = async (endpoint, payload = {}, extraHeaders = {}) => {
    try {
        const headers = {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
            ...extraHeaders
        };
        const response = await fetch(`${TOPUP_BASE_URL}${endpoint}`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload)
        });
        return await response.json();
    } catch (error) {
        console.error(`Topupku API Error (${endpoint}):`, error);
        return { success: false, msg: error.message };
    }
};

// Menu Utama Bot (Tombol Cek Saldo Khusus Admin)
const showMainMenu = async (ctx) => {
    const userId = ctx.from.id.toString();
    const isAdmin = (userId === ADMIN_TELEGRAM_ID.toString());
    const userName = ctx.from.first_name || 'Sobat INDOSAKU';
    
    const text = 
        `⚡ *INDOSAKU DIGITAL & PPOB* ⚡\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `Halo *${userName}*! Terhubung ke Server Topupku.com.\n\n` +
        `💡 *Silakan pilih menu di bawah ini:*`;

    let keyboardRows = [
        [
            Markup.button.callback('📱 Pulsa & Data', 'cat_all'),
            Markup.button.callback('💳 TopUp E-Wallet', 'cat_all')
        ],
        [
            Markup.button.callback('🎮 Voucher Game', 'cat_all'),
            Markup.button.callback('💬 Live Chat dengan Admin', 'start_live_chat')
        ]
    ];

    if (isAdmin) {
        keyboardRows.push([
            Markup.button.callback('💰 [ADMIN] Cek Saldo Merchant', 'check_balance')
        ]);
    }
    
    const keyboard = Markup.inlineKeyboard(keyboardRows);

    try {
        return await ctx.replyWithPhoto(INDOSAKU_LOGO_URL, { caption: text, parse_mode: 'Markdown', ...keyboard });
    } catch (e) {
        return await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
    }
};

bot.start(async (ctx) => {
    delete userSession[ctx.from.id];
    return await showMainMenu(ctx);
});

bot.action('back_home', async (ctx) => {
    delete userSession[ctx.from.id];
    return await ctx.reply('🏠 *MENU UTAMA INDOSAKU*\nSilakan kirim /start untuk menampilkan panel utama.', { parse_mode: 'Markdown' });
});

// Cek Saldo / Profil Merchant (Khusus Admin)
bot.action('check_balance', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_TELEGRAM_ID.toString()) {
        return await ctx.answerCbQuery('⚠️ Menu ini khusus untuk Admin!', { show_alert: true });
    }

    await ctx.reply('⏳ Mengambil informasi saldo akun Topupku...');
    const res = await topupRequest('/api/profile');
    
    if (res && (res.success || res.data)) {
        const profile = res.data || res;
        return await ctx.reply(
            `💰 *INFORMASI SALDO AKUN (ADMIN)*\n` +
            `━━━━━━━━━━━━━━━━━━━\n` +
            `👤 Nama: *${profile.name || MERCHANT_ID}*\n` +
            `💵 Sisa Saldo: *Rp ${parseInt(profile.balance || profile.sisa_saldo || 0).toLocaleString('id-ID')}*`,
            { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('« Kembali ke Menu', 'back_home')]]) }
        );
    }
    return await ctx.reply(`⚠️ Gagal mengambil saldo: ${res?.msg || 'Kesalahan kredensial API / Akun nonaktif'}`);
});

bot.action('start_live_chat', async (ctx) => {
    const userId = ctx.from.id;
    userSession[userId] = { mode: 'live_chat' };

    return await ctx.reply(
        `💬 *LIVE CHAT DENGAN ADMIN INDOSAKU*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `Silakan ketik pesan atau kendala transaksi Anda di chat ini.\n\n` +
        `_Ketik /start jika ingin keluar dari mode live chat._`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback('« Kembali', 'back_home')]])
        }
    );
});

// Ambil Semua Katalog Produk dari Topupku API
bot.action(/cat_(.+)/, async (ctx) => {
    const userId = ctx.from.id;
    userSession[userId] = { category: 'all' };

    await ctx.reply(`⏳ Mengambil daftar produk dari server Topupku...`);

    const res = await topupRequest('/api/service', {});

    if (res && res.data && res.data.length > 0) {
        userSession[userId].products = res.data;

        const buttons = res.data.slice(0, 10).map(prod => [
            Markup.button.callback(`${prod.product_name || prod.name} - Rp ${parseInt(prod.price).toLocaleString('id-ID')}`, `buy_${prod.sku_code}`)
        ]);
        buttons.push([Markup.button.callback('« Batalkan & Kembali', 'back_home')]);

        return await ctx.reply(
            `📦 *KATALOG PRODUK TERSEDIA*\n` +
            `━━━━━━━━━━━━━━━━━━━\n` +
            `Silakan pilih produk yang ingin dibeli:`,
            { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
        );
    }

    return await ctx.reply(`⚠️ Tidak ada produk ditemukan. Pastikan status akun API Anda sudah aktif.`);
});

// Pilih Produk -> Minta Target ID
bot.action(/buy_(.+)/, async (ctx) => {
    const skuCode = ctx.match[1];
    const userId = ctx.from.id;
    if (!userSession[userId]) userSession[userId] = {};

    userSession[userId].skuCode = skuCode;
    userSession[userId].mode = 'waiting_target_id';

    return await ctx.reply(
        `🎯 *MASUKKAN TUJUAN TRANSAKSI*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `Silakan kirim *Nomor HP / ID Tujuan* (misal: 08123456789 atau UserID Game) ke chat ini:`,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('« Batalkan', 'back_home')]]) }
    );
});

// Handle Pesan Teks
bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (text === '/start') {
        delete userSession[ctx.from.id];
        return await showMainMenu(ctx);
    }

    const userId = ctx.from.id.toString();

    if (userId === ADMIN_TELEGRAM_ID.toString() && ctx.message.reply_to_message) {
        const repliedText = ctx.message.reply_to_message.text || '';
        const matchId = repliedText.match(/ID User:\s*`(\d+)`/) || repliedText.match(/Dari:\s*`(\d+)`/);
        if (matchId) {
            const targetUser = matchId[1];
            try {
                await bot.telegram.sendMessage(targetUser, `💬 *Pesan dari Admin INDOSAKU:*\n\n${text}`, { parse_mode: 'Markdown' });
                return await ctx.reply('✅ Balasan terkirim ke user.');
            } catch (err) {
                return await ctx.reply('❌ Gagal mengirim pesan.');
            }
        }
    }

    if (userSession[userId] && userSession[userId].mode === 'live_chat') {
        try {
            await bot.telegram.sendMessage(
                ADMIN_TELEGRAM_ID,
                `🔔 *LIVE CHAT MASUK*\n👤 ${ctx.from.first_name} (\`${userId}\`)\n\n💬 ${text}`,
                { parse_mode: 'Markdown' }
            );
            return await ctx.reply('💬 Pesan diteruskan ke Admin. Mohon tunggu balasan!');
        } catch (e) {
            return await ctx.reply('❌ Gagal mengirim pesan live chat.');
        }
    }

    // Eksekusi Order ke Topupku saat User Mengirim Target ID
    if (userSession[userId] && userSession[userId].mode === 'waiting_target_id') {
        const targetId = text;
        const skuCode = userSession[userId].skuCode;
        const reffId = `INDOSAKU-${Date.now()}`;

        await ctx.reply(`⏳ Sedang memproses transaksi ke server Topupku (Reff ID: \`${reffId}\`)...`, { parse_mode: 'Markdown' });

        const stringToSign = `${MERCHANT_ID}:${reffId}`;
        const signature = crypto.createHmac('sha256', API_KEY).update(stringToSign).digest('hex');

        const orderRes = await topupRequest('/api/order', {
            reff_id: reffId,
            sku_code: skuCode,
            target_id: targetId,
            target_server: ""
        }, {
            "X-Order-Signature": signature
        });

        delete userSession[userId];

        if (orderRes && (orderRes.success || orderRes.data)) {
            const data = orderRes.data || orderRes;
            return await ctx.reply(
                `✅ *PESANAN BERHASIL DIPROSES*\n` +
                `━━━━━━━━━━━━━━━━━━━\n` +
                `📦 Produk: *${data.product_name || skuCode}*\n` +
                `🎯 Tujuan: \`${targetId}\`\n` +
                `🆔 Invoice: \`${data.invoice_number || '-'}\`\n` +
                `📌 Status: *${data.status || 'Process / Success'}*\n` +
                `💰 Harga: Rp ${parseInt(data.price || 0).toLocaleString('id-ID')}`,
                { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('« Menu Utama', 'back_home')]]) }
            );
        }

        return await ctx.reply(`❌ Transaksi Gagal: ${orderRes?.msg || 'Saldo tidak cukup atau SKU tidak valid.'}`);
    }

    return await ctx.reply(`✅ Pesan diterima. Silakan ketik /start untuk mulai bertransaksi.`);
});

// Vercel Serverless Handler
module.exports = async (req, res) => {
    try {
        if (req.method === 'POST') {
            const urlPath = req.url || '';

            if (urlPath.includes('/callback') || urlPath.includes('/webhook')) {
                const callbackData = req.body;
                console.log('Topupku Callback Received:', callbackData);
                return res.status(200).json({ success: true, message: 'Callback diterima' });
            }

            await bot.handleUpdate(req.body);
            return res.status(200).send('OK');
        }

        return res.status(200).send('Bot Telegram INDOSAKU & Topupku API Berjalan Normal di Vercel!');
    } catch (error) {
        console.error('Serverless Error:', error);
        return res.status(200).send('OK');
    }
};
