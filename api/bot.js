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
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '123456789'; 

const userSession = {};

const showMainMenu = async (ctx) => {
    const userName = ctx.from.first_name || 'Sobat INDOSAKU';
    const text = 
        `⚡ *INDOSAKU DIGITAL & PPOB* ⚡\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `Halo *${userName}*! Platform transaksi digital & PPOB terpercaya di Cibinong, Bogor.\n\n` +
        `💡 *Silakan pilih layanan di bawah ini:*`;
    
    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('📱 Pulsa Reguler', 'cat_pulsa'),
            Markup.button.callback('🌐 Paket Internet', 'cat_data')
        ],
        [
            Markup.button.callback('⚡ Token PLN', 'cat_listrik'),
            Markup.button.callback('💳 TopUp E-Wallet', 'cat_ewallet')
        ],
        [
            Markup.button.callback('🎮 Voucher Game', 'cat_game'),
            Markup.button.callback('🎫 Voucher Digital', 'cat_voucher')
        ],
        [
            Markup.button.callback('🚗 TopUp E-Toll', 'cat_etoll'),
            Markup.button.callback('📄 Tagihan Pascabayar', 'cat_pascabayar')
        ],
        [
            Markup.button.callback('💬 Live Chat dengan Admin (CS)', 'start_live_chat')
        ]
    ]);

    try {
        return ctx.replyWithPhoto(INDOSAKU_LOGO_URL, { caption: text, parse_mode: 'Markdown', ...keyboard });
    } catch (e) {
        return ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
    }
};

bot.start((ctx) => {
    delete userSession[ctx.from.id];
    return showMainMenu(ctx);
});

bot.action('back_home', (ctx) => {
    delete userSession[ctx.from.id];
    return ctx.reply('🏠 *MENU UTAMA INDOSAKU*\nSilakan kirim /start untuk menampilkan panel utama.', { parse_mode: 'Markdown' });
});

// --- LIVE CHAT ADMIN VIA BOT ---
bot.action('start_live_chat', (ctx) => {
    const userId = ctx.from.id;
    userSession[userId] = { mode: 'live_chat' };

    return ctx.reply(
        `💬 *LIVE CHAT DENGAN ADMIN INDOSAKU*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `Silakan ketik pesan atau kendala transaksi Anda di chat ini. Admin akan segera merespons.\n\n` +
        `_Ketik /start jika ingin keluar dari mode live chat._`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback('« Akhiri Chat & Kembali', 'back_home')]])
        }
    );
});

// --- PILIH KATEGORI PRABAYAR / PASCABAYAR ---
bot.action(/cat_(.+)/, async (ctx) => {
    const category = ctx.match[1];
    const userId = ctx.from.id;
    userSession[userId] = { category };

    let title = 'LAYANAN';
    let placeholder = 'Nomor HP / ID Tujuan';

    if (category === 'pulsa') { title = '📱 PULSA REGULER'; placeholder = '08123456789'; }
    else if (category === 'data') { title = '🌐 PAKET INTERNET / DATA'; placeholder = '08123456789'; }
    else if (category === 'listrik') { title = '⚡ TOKEN PLN PRABAYAR'; placeholder = 'Nomor Meter / ID Pelanggan (11-12 digit)'; }
    else if (category === 'ewallet') { title = '💳 TOP-UP E-WALLET (DANA/OVO/GoPay/ShopeePay)'; placeholder = 'Nomor HP Akun (08xxxx)'; }
    else if (category === 'game') { title = '🎮 VOUCHER GAME'; placeholder = 'User ID & Server ID Game'; }
    else if (category === 'voucher') { title = '🎫 VOUCHER DIGITAL'; placeholder = 'ID Pelanggan / Nomor Tujuan'; }
    else if (category === 'etoll') { title = '🚗 TOP-UP E-TOLL / E-MONEY'; placeholder = 'Nomor Kartu E-Toll'; }
    else if (category === 'pascabayar') {
        userSession[userId].mode = 'postpaid_select';
        return ctx.reply(
            `📄 *PILIH KATEGORI PASCABAYAR*\n` +
            `━━━━━━━━━━━━━━━━━━━\n` +
            `Silakan pilih jenis tagihan pascabayar yang ingin dicek:`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('⚡ PLN Pascabayar', 'postcode_PLNPOSTPAIDB')],
                    [Markup.button.callback('💧 PDAM Daerah', 'postcode_PDAM1001')],
                    [Markup.button.callback('📱 Telco Pascabayar (Halo/Matrix)', 'postcode_DMATRIX')],
                    [Markup.button.callback('🏥 BPJS Kesehatan', 'postcode_BPJSKES')],
                    [Markup.button.callback('📺 TV Berbayar', 'postcode_TVINDVS'), Markup.button.callback('🔥 Gas PGN', 'postcode_PGN')],
                    [Markup.button.callback('« Batalkan', 'back_home')]
                ])
            }
        );
    }

    return ctx.reply(
        `📂 *${title}*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `Silakan kirim *${placeholder}* Anda ke chat ini:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback('« Batalkan', 'back_home')]])
        }
    );
});

// Pilih Product Code Pascabayar
bot.action(/postcode_(.+)/, (ctx) => {
    const productCode = ctx.match[1];
    const userId = ctx.from.id;
    if (!userSession[userId]) userSession[userId] = {};
    
    userSession[userId].productCode = productCode;
    userSession[userId].mode = 'waiting_postpaid_customer';

    return ctx.reply(
        `📄 *INQUIRY PASCABAYAR (${productCode})*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `Silakan kirim *Nomor Pelanggan / ID Tagihan* Anda:`,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('« Batalkan', 'back_home')]]) }
    );
});

// --- MENANGANI PESAN TEKS MASUK ---
bot.on('text', async (ctx, next) => {
    const text = ctx.message.text.trim();
    if (text === '/start') {
        delete userSession[ctx.from.id];
        return showMainMenu(ctx);
    }

    const userId = ctx.from.id.toString();

    // 1. Admin Membalas Live Chat
    if (userId === ADMIN_TELEGRAM_ID.toString() && ctx.message.reply_to_message) {
        const repliedText = ctx.message.reply_to_message.text || '';
        const matchId = repliedText.match(/ID User:\s*`(\d+)`/) || repliedText.match(/Dari:\s*`(\d+)`/);
        if (matchId) {
            const targetUser = matchId[1];
            try {
                await bot.telegram.sendMessage(targetUser, `💬 *Pesan dari Admin INDOSAKU:*\n\n${text}`, { parse_mode: 'Markdown' });
                return ctx.reply('✅ Balasan terkirim ke user.');
            } catch (err) {
                return ctx.reply('❌ Gagal mengirim pesan.');
            }
        }
    }

    // 2. Mode Live Chat Pengguna Aktif
    if (userSession[userId] && userSession[userId].mode === 'live_chat') {
        try {
            await bot.telegram.sendMessage(
                ADMIN_TELEGRAM_ID,
                `🔔 *LIVE CHAT MASUK*\n👤 ${ctx.from.first_name} (\`${userId}\`)\n\n💬 ${text}`,
                { parse_mode: 'Markdown' }
            );
            return ctx.reply('💬 Pesan diteruskan ke Admin. Mohon tunggu balasan!');
        } catch (e) {
            return ctx.reply('❌ Gagal mengirim pesan live chat.');
        }
    }

    // 3. Proses Inquiry Pascabayar (Service 86)
    if (userSession[userId] && userSession[userId].mode === 'waiting_postpaid_customer') {
        const productCode = userSession[userId].productCode;
        const trxId = `INQ-POS-${Date.now()}`;

        await ctx.reply(`⏳ Memeriksa rincian tagihan untuk nomor \`${text}\`...`, { parse_mode: 'Markdown' });

        try {
            const inquiryRes = await binderPayClient.post('POST', '/v1.0/bill-payment/inquiry', {
                partnerServiceId: '86',
                customerNo: text,
                productCode: productCode,
                trxId: trxId,
                additionalInfo: {}
            });

            if (inquiryRes.responseCode === '2008600') {
                userSession[userId].billerRefId = inquiryRes.billerRefId;
                userSession[userId].customerNo = text;
                userSession[userId].totalAmount = inquiryRes.totalAmount.value;
                userSession[userId].productCode = productCode;

                return ctx.reply(
                    `✅ *TAGIHAN DITEMUKAN*\n` +
                    `━━━━━━━━━━━━━━━━━━━\n` +
                    `👤 Nama Pelanggan: *${inquiryRes.customerName}*\n` +
                    `🔢 No Pelanggan: \`${inquiryRes.customerNo}\`\n` +
                    `📄 Produk: ${productCode}\n` +
                    `💰 Tagihan: Rp ${parseInt(inquiryRes.billAmount.value).toLocaleString('id-ID')}\n` +
                    `📌 Admin Fee: Rp ${parseInt(inquiryRes.adminFee.value).toLocaleString('id-ID')}\n` +
                    `💵 *Total Tagihan: Rp ${parseInt(inquiryRes.totalAmount.value).toLocaleString('id-ID')}*`,
                    {
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback('💳 Bayar Tagihan Sekarang', 'pay_postpaid')],
                            [Markup.button.callback('« Batalkan', 'back_home')]
                        ])
                    }
                );
            }
            return ctx.reply(`⚠️ Gagal Inquiry: ${inquiryRes.responseMessage || 'Tagihan tidak ditemukan / sudah lunas.'}`);
        } catch (err) {
            console.error(err);
            return ctx.reply('❌ Terjadi kesalahan koneksi server Inquiry Pascabayar.');
        }
    }

    // 4. Proses Cek Harga Produk Prabayar (Service 85)
    if (!userSession[userId]) userSession[userId] = { category: 'pulsa' };
    userSession[userId].targetNo = text;
    const category = userSession[userId].category;

    await ctx.reply(`⏳ Mengambil katalog harga ${category} untuk tujuan \`${text}\`...`, { parse_mode: 'Markdown' });

    try {
        const priceRes = await binderPayClient.get(`/v1.0/bill-payment/prepaid/price?category=${category}&number=${text}`);

        if (priceRes.responseCode === '2008500' && priceRes.data && priceRes.data.length > 0) {
            userSession[userId].products = priceRes.data;

            // Buat tombol daftar produk rapi
            const buttons = priceRes.data.slice(0, 10).map(prod => [
                Markup.button.callback(`${prod.productName} - Rp ${parseInt(prod.price.value).toLocaleString('id-ID')}`, `buy_pre_${prod.productCode}`)
            ]);
            buttons.push([Markup.button.callback('« Batalkan & Kembali', 'back_home')]);

            return ctx.reply(
                `📱 *KATALOG PRODUK PRABAYAR*\n` +
                `Tujuan: \`${text}\`\n\n` +
                `Silakan pilih produk yang diinginkan:`,
                { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
            );
        }
        return ctx.reply(`⚠️ Produk tidak ditemukan untuk kategori atau nomor tersebut.`);
    } catch (e) {
        console.error(e);
        return ctx.reply('❌ Gagal mengambil daftar harga prabayar dari server.');
    }
});

// --- EKSEKUSI PEMBELIAN PRABAYAR (Service 88) ---
bot.action(/buy_pre_(.+)/, async (ctx) => {
    const productCode = ctx.match[1];
    const userId = ctx.from.id;
    const session = userSession[userId];

    if (!session || !session.products) {
        return ctx.reply('⚠️ Sesi telah kedaluwarsa. Silakan kirim /start untuk mengulang.');
    }

    const selectedProduct = session.products.find(p => p.productCode === productCode);
    if (!selectedProduct) return ctx.reply('⚠️ Produk tidak valid.');

    const trxId = `TRX-PRE-${Date.now()}`;
    await ctx.reply(`⏳ Memproses pembelian *${selectedProduct.productName}* ke nomor \`${session.targetNo}\`...`, { parse_mode: 'Markdown' });

    try {
        const purchaseRes = await binderPayClient.post('POST', '/v1.0/bill-payment/prepaid/purchase', {
            partnerServiceId: '88',
            customerNo: session.targetNo,
            productCode: productCode,
            trxId: trxId,
            totalAmount: {
                value: selectedProduct.price.value,
                currency: 'IDR'
            },
            additionalInfo: {
                category: session.category
            }
        });

        if (purchaseRes.responseCode === '2008800' && purchaseRes.status === 'SUCCESS') {
            return ctx.reply(
                `✅ *TRANSAKSI PRABAYAR BERHASIL*\n` +
                `━━━━━━━━━━━━━━━━━━━\n` +
                `📦 Produk: *${selectedProduct.productName}*\n` +
                `🎯 Tujuan: \`${purchaseRes.customerNo}\`\n` +
                `🆔 TRX ID: \`${purchaseRes.trxId}\`\n` +
                `🔢 SN / Token PLN: \`${purchaseRes.serialNumber || '-'}\`\n` +
                `💰 Total Terpotong: Rp ${parseInt(purchaseRes.totalAmount.value).toLocaleString('id-ID')}`,
                { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('« Menu Utama', 'back_home')]]) }
            );
        }
        return ctx.reply(`⚠️ Transaksi Gagal / Pending: ${purchaseRes.responseMessage || 'Periksa saldo akun merchant Anda.'}`);
    } catch (err) {
        console.error(err);
        return ctx.reply('❌ Terjadi kesalahan koneksi saat pembelian prabayar.');
    }
});

// --- EKSEKUSI PEMBAYARAN PASCABAYAR (Service 87) ---
bot.action('pay_postpaid', async (ctx) => {
    const userId = ctx.from.id;
    const session = userSession[userId];

    if (!session || !session.billerRefId) {
        return ctx.reply('⚠️ Data tagihan tidak ditemukan. Silakan ulangi proses dari awal.');
    }

    const trxId = `PAY-POS-${Date.now()}`;
    await ctx.reply(`⏳ Memproses pembayaran tagihan pascabayar...`);

    try {
        const payRes = await binderPayClient.post('POST', '/v1.0/bill-payment/payment', {
            partnerServiceId: '87',
            trxId: trxId,
            billerRefId: session.billerRefId,
            customerNo: session.customerNo,
            productCode: session.productCode,
            totalAmount: {
                value: session.totalAmount,
                currency: 'IDR'
            },
            additionalInfo: {}
        });

        if (payRes.responseCode === '2008700' && payRes.status === 'SUCCESS') {
            return ctx.reply(
                `✅ *PEMBAYARAN PASCABAYAR BERHASIL*\n` +
                `━━━━━━━━━━━━━━━━━━━\n` +
                `👤 Nama: ${payRes.customerName}\n` +
                `📄 Produk: ${payRes.productCode}\n` +
                `🔢 No Pelanggan: \`${payRes.customerNo}\`\n` +
                `🆔 TRX ID: \`${payRes.trxId}\`\n` +
                `🧾 No. SN / Ref: \`${payRes.serialNumber}\`\n` +
                `💰 Total Lunas: Rp ${parseInt(payRes.totalAmount.value).toLocaleString('id-ID')}`,
                { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('« Menu Utama', 'back_home')]]) }
            );
        }
        return ctx.reply(`⚠️ Pembayaran Gagal: ${payRes.responseMessage}`);
    } catch (e) {
        console.error(e);
        return ctx.reply('❌ Gagal mengeksekusi pembayaran tagihan pascabayar.');
    }
});

module.exports = async (req, res) => {
    try {
        if (req.method === 'POST') {
            await bot.handleUpdate(req.body);
            return res.status(200).send('OK');
        }
        return res.status(200).send('Bot Telegram INDOSAKU PPOB SNAP Full Features Berjalan di Vercel!');
    } catch (error) {
        console.error('Webhook Error:', error);
        return res.status(500).send('Internal Server Error');
    }
};
