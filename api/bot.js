const { Telegraf, Markup } = require('telegraf');
const { BinderPay } = require('binderpay-nodejs');
const crypto = require('crypto');

const bot = new Telegraf(process.env.BOT_TOKEN);

const PARTNER_ID = process.env.BINDERPAY_PARTNER_ID || 'BP984265';
const PRIVATE_KEY = (process.env.BINDERPAY_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();
const IS_PRODUCTION = true;

const binderPayClient = new BinderPay({
    partnerId: PARTNER_ID,
    privateKey: PRIVATE_KEY,
    channelId: 'BCA',
    isProduction: IS_PRODUCTION
});

// Helper untuk Signature SNAP Standard
const generateSnapHeaders = (method, endpoint) => {
    const timestamp = new Date().toISOString().replace(/\.\d+Z$/, '+07:00');
    const externalId = crypto.randomUUID();
    const stringToSign = `${PARTNER_ID}|${timestamp}|${externalId}`;
    
    let signature = '';
    try {
        const sign = crypto.createSign('SHA256');
        sign.update(stringToSign);
        sign.end();
        signature = sign.sign({
            key: PRIVATE_KEY,
            padding: crypto.constants.RSA_PKCS1_PADDING
        }, 'base64');
    } catch (e) {
        console.error('Signature Generation Error:', e);
    }

    return {
        'Content-Type': 'application/json',
        'X-Timestamp': timestamp,
        'X-Partner-ID': PARTNER_ID,
        'X-External-ID': externalId,
        'X-Signature': signature,
        'Channel-ID': 'PPOB'
    };
};

const fetchPrepaidPrice = async (category, number) => {
    try {
        const host = IS_PRODUCTION ? 'https://api.binderpay.id' : 'https://api-sandbox.binderpay.id';
        const endpoint = `/v1.0/bill-payment/prepaid/price?category=${category}&number=${number}`;
        const headers = generateSnapHeaders('GET', endpoint);

        const response = await fetch(`${host}${endpoint}`, {
            method: 'GET',
            headers: headers
        });
        return await response.json();
    } catch (error) {
        console.error('API Price Error:', error.message);
        return { responseCode: '500', responseMessage: error.message };
    }
};

const INDOSAKU_LOGO_URL = 'https://ibb.co.com/1G94Bcm9';
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '123456789'; 

const userSession = {};

const detectOperator = (phone) => {
    let cleanNo = phone.replace(/[^0-9]/g, '');
    if (cleanNo.startsWith('62')) cleanNo = '0' + cleanNo.slice(2);
    const prefix4 = cleanNo.slice(0, 4);

    const telkomsel = ['0811', '0812', '0813', '0821', '0822', '0823', '0851', '0852', '0853'];
    const indosat = ['0814', '0815', '0816', '0855', '0856', '0857', '0858'];
    const xl = ['0817', '0818', '0819', '0859', '0877', '0878'];
    const axis = ['0831', '0832', '0833', '0838'];
    const tri = ['0895', '0896', '0897', '0898', '0899'];
    const smartfren = ['0881', '0882', '0883', '0884', '0885', '0886', '0887', '0888', '0889'];

    if (telkomsel.includes(prefix4) || telkomsel.some(p => cleanNo.startsWith(p))) return 'TELKOMSEL';
    if (indosat.includes(prefix4) || indosat.some(p => cleanNo.startsWith(p))) return 'INDOSAT OOREDOO';
    if (xl.includes(prefix4) || xl.some(p => cleanNo.startsWith(p))) return 'XL AXIATA';
    if (axis.includes(prefix4) || axis.some(p => cleanNo.startsWith(p))) return 'AXIS';
    if (tri.includes(prefix4) || tri.some(p => cleanNo.startsWith(p))) return 'TRI (3)';
    if (smartfren.includes(prefix4) || smartfren.some(p => cleanNo.startsWith(p))) return 'SMARTFREN';
    return 'SELULER UMUM';
};

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

bot.action('start_live_chat', async (ctx) => {
    const userId = ctx.from.id;
    userSession[userId] = { mode: 'live_chat' };

    return await ctx.reply(
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

bot.action(/cat_(.+)/, async (ctx) => {
    const category = ctx.match[1];
    const userId = ctx.from.id;
    userSession[userId] = { category };

    if (category === 'ewallet') {
        userSession[userId].mode = 'sub_select';
        return await ctx.reply(
            `💳 *PILIH PROVIDER E-WALLET*\n` +
            `━━━━━━━━━━━━━━━━━━━\n` +
            `Silakan pilih dompet digital tujuan Anda:`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🟢 DANA', 'sub_DANA'), Markup.button.callback('🟣 OVO', 'sub_OVO')],
                    [Markup.button.callback('🔵 GoPay', 'sub_GOPAY'), Markup.button.callback('🟠 ShopeePay', 'sub_SHOPEEPAY')],
                    [Markup.button.callback('🟡 LinkAja', 'sub_LINKAJA')],
                    [Markup.button.callback('« Batalkan', 'back_home')]
                ])
            }
        );
    }

    if (category === 'game') {
        userSession[userId].mode = 'sub_select';
        return await ctx.reply(
            `🎮 *PILIH VOUCHER GAME*\n` +
            `━━━━━━━━━━━━━━━━━━━\n` +
            `Silakan pilih game favorit Anda:`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('⚔️ Mobile Legends', 'sub_ML'), Markup.button.callback('🔥 Free Fire', 'sub_FF')],
                    [Markup.button.callback('🎯 PUBG Mobile', 'sub_PUBG'), Markup.button.callback('🪙 Valorant', 'sub_VALORANT')],
                    [Markup.button.callback('🎲 Higgs Domino', 'sub_DOMINO'), Markup.button.callback('⚡ Genshin Impact', 'sub_GENSHIN')],
                    [Markup.button.callback('« Batalkan', 'back_home')]
                ])
            }
        );
    }

    if (category === 'voucher') {
        userSession[userId].mode = 'sub_select';
        return await ctx.reply(
            `🎫 *PILIH VOUCHER DIGITAL*\n` +
            `━━━━━━━━━━━━━━━━━━━\n` +
            `Silakan pilih jenis voucher digital:`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('▶️ Google Play', 'sub_GOOGLEPLAY'), Markup.button.callback('🍏 App Store / iTunes', 'sub_ITUNES')],
                    [Markup.button.callback('🎮 Steam Wallet', 'sub_STEAM'), Markup.button.callback('📺 Netflix / Vidio', 'sub_STREAMING')],
                    [Markup.button.callback('« Batalkan', 'back_home')]
                ])
            }
        );
    }

    if (category === 'etoll') {
        userSession[userId].mode = 'sub_select';
        return await ctx.reply(
            `🚗 *PILIH KARTU E-TOLL / E-MONEY*\n` +
            `━━━━━━━━━━━━━━━━━━━\n` +
            `Silakan pilih jenis kartu emoney Anda:`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('💳 Mandiri e-Toll / e-Money', 'sub_ETOH_MANDIRI')],
                    [Markup.button.callback('💳 BCA Flazz', 'sub_ETOH_FLAZZ')],
                    [Markup.button.callback('💳 BNI TapCash', 'sub_ETOH_TAPCASH')],
                    [Markup.button.callback('« Batalkan', 'back_home')]
                ])
            }
        );
    }

    if (category === 'pascabayar') {
        userSession[userId].mode = 'postpaid_select';
        return await ctx.reply(
            `📄 *PILIH KATEGORI PASCABAYAR*\n` +
            `━━━━━━━━━━━━━━━━━━━\n` +
            `Silakan pilih jenis tagihan pascabayar:`,
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

    let title = 'LAYANAN';
    let placeholder = 'Nomor HP / ID Tujuan';

    if (category === 'pulsa') { title = '📱 PULSA REGULER'; placeholder = '08123456789'; }
    else if (category === 'data') { title = '🌐 PAKET INTERNET / DATA'; placeholder = '08123456789'; }
    else if (category === 'listrik') { title = '⚡ TOKEN PLN PRABAYAR'; placeholder = 'Nomor Meter / ID Pelanggan (11-12 digit)'; }

    userSession[userId].mode = 'waiting_target';

    return await ctx.reply(
        `📂 *${title}*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `Silakan kirim *${placeholder}* Anda ke chat ini:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback('« Batalkan', 'back_home')]])
        }
    );
});

bot.action(/sub_(.+)/, async (ctx) => {
    const subType = ctx.match[1];
    const userId = ctx.from.id;
    if (!userSession[userId]) userSession[userId] = {};

    userSession[userId].subType = subType;
    userSession[userId].mode = 'waiting_target';

    let placeholder = 'Nomor Tujuan / ID Pelanggan';
    if (['ML', 'FF', 'PUBG', 'VALORANT', 'DOMINO', 'GENSHIN'].includes(subType)) {
        placeholder = 'User ID & Server ID (Contoh: 12345678(1234))';
    } else if (['DANA', 'OVO', 'GOPAY', 'SHOPEEPAY', 'LINKAJA'].includes(subType)) {
        placeholder = `Nomor HP Akun ${subType} (Contoh: 08123456789)`;
    }

    return await ctx.reply(
        `🎯 *LAYANAN: ${subType.replace('_', ' ')}*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `Silakan kirim *${placeholder}* Anda ke chat ini:`,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('« Batalkan', 'back_home')]]) }
    );
});

bot.action(/postcode_(.+)/, async (ctx) => {
    const productCode = ctx.match[1];
    const userId = ctx.from.id;
    if (!userSession[userId]) userSession[userId] = {};
    
    userSession[userId].productCode = productCode;
    userSession[userId].mode = 'waiting_postpaid_customer';

    return await ctx.reply(
        `📄 *INQUIRY PASCABAYAR (${productCode})*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `Silakan kirim *Nomor Pelanggan / ID Tagihan* Anda:`,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('« Batalkan', 'back_home')]]) }
    );
});

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

            if (inquiryRes && inquiryRes.responseCode === '2008600') {
                userSession[userId].billerRefId = inquiryRes.billerRefId;
                userSession[userId].customerNo = text;
                userSession[userId].totalAmount = inquiryRes.totalAmount.value;
                userSession[userId].productCode = productCode;

                return await ctx.reply(
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
            return await ctx.reply(`⚠️ Gagal Inquiry: ${inquiryRes?.responseMessage || 'Tagihan tidak ditemukan / sudah lunas.'}`);
        } catch (err) {
            console.error(err);
            return await ctx.reply('❌ Terjadi kesalahan koneksi server Inquiry Pascabayar.');
        }
    }

    if (!userSession[userId]) userSession[userId] = { category: 'pulsa' };
    userSession[userId].targetNo = text;
    let category = userSession[userId].category;

    let apiCategory = category;
    if (['ewallet', 'game', 'voucher', 'etoll'].includes(category)) apiCategory = category;
    if (category === 'listrik') apiCategory = 'pln';

    let providerInfo = '';
    let subLabel = userSession[userId].subType ? ` (${userSession[userId].subType})` : '';
    if (category === 'pulsa' || category === 'data') {
        const detectedOp = detectOperator(text);
        providerInfo = `🔍 *Provider Terdeteksi:* ${detectedOp}\n`;
    }

    await ctx.reply(`⏳ ${providerInfo}Mengambil katalog harga ${category}${subLabel} untuk tujuan \`${text}\`...`, { parse_mode: 'Markdown' });

    try {
        const priceRes = await fetchPrepaidPrice(apiCategory, text);

        if (priceRes && priceRes.responseCode === '2008500' && priceRes.data && priceRes.data.length > 0) {
            userSession[userId].products = priceRes.data;

            const buttons = priceRes.data.slice(0, 10).map(prod => [
                Markup.button.callback(`${prod.productName} - Rp ${parseInt(prod.price.value).toLocaleString('id-ID')}`, `buy_pre_${prod.productCode}`)
            ]);
            buttons.push([Markup.button.callback('« Batalkan & Kembali', 'back_home')]);

            return await ctx.reply(
                `📱 *KATALOG PRODUK PRABAYAR*\n` +
                `${providerInfo}` +
                `🎯 Tujuan: \`${text}\`\n\n` +
                `Silakan pilih nominal / produk yang diinginkan:`,
                { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
            );
        }
        return await ctx.reply(`⚠️ Produk tidak tersedia atau nomor/ID tidak valid untuk kategori ini. (Respon: ${priceRes?.responseMessage || 'Kosong'})`);
    } catch (e) {
        console.error('BinderPay Price Error:', e);
        return await ctx.reply('❌ Gagal terhubung ke server BinderPay. Periksa kembali konfigurasi Private Key atau Partner ID Anda.');
    }
});

bot.action(/buy_pre_(.+)/, async (ctx) => {
    const productCode = ctx.match[1];
    const userId = ctx.from.id;
    const session = userSession[userId];

    if (!session || !session.products) {
        return await ctx.reply('⚠️ Sesi telah kedaluwarsa. Silakan kirim /start untuk mengulang.');
    }

    const selectedProduct = session.products.find(p => p.productCode === productCode);
    if (!selectedProduct) return await ctx.reply('⚠️ Produk tidak valid.');

    const trxId = `TRX-PRE-${Date.now()}`;
    await ctx.reply(`⏳ Memproses pembelian *${selectedProduct.productName}* ke tujuan \`${session.targetNo}\`...`, { parse_mode: 'Markdown' });

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
                category: session.category,
                subType: session.subType || ''
            }
        });

        if (purchaseRes && purchaseRes.responseCode === '2008800' && purchaseRes.status === 'SUCCESS') {
            return await ctx.reply(
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
        return await ctx.reply(`⚠️ Transaksi Gagal / Pending: ${purchaseRes?.responseMessage || 'Periksa saldo akun merchant Anda.'}`);
    } catch (err) {
        console.error(err);
        return await ctx.reply('❌ Terjadi kesalahan koneksi saat pembelian prabayar.');
    }
});

bot.action('pay_postpaid', async (ctx) => {
    const userId = ctx.from.id;
    const session = userSession[userId];

    if (!session || !session.billerRefId) {
        return await ctx.reply('⚠️ Data tagihan tidak ditemukan. Silakan ulangi proses dari awal.');
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

        if (payRes && payRes.responseCode === '2008700' && payRes.status === 'SUCCESS') {
            return await ctx.reply(
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
        return await ctx.reply(`⚠️ Pembayaran Gagal: ${payRes?.responseMessage}`);
    } catch (e) {
        console.error(e);
        return await ctx.reply('❌ Gagal mengeksekusi pembayaran tagihan pascabayar.');
    }
});

module.exports = async (req, res) => {
    try {
        if (req.method === 'POST') {
            await bot.handleUpdate(req.body);
            return res.status(200).send('OK');
        }
        return res.status(200).send('Bot Telegram INDOSAKU PPOB Aktif & Berjalan di Vercel!');
    } catch (error) {
        console.error('Webhook Error:', error);
        return res.status(200).send('OK');
    }
};
