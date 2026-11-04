const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

module.exports = async (req, res) => {
    // Pastikan request yang masuk adalah POST dari server Payment Gateway
    if (req.method !== 'POST') {
        return res.status(405.json({ error: 'Method not allowed' }));
    }

    try {
        const paymentData = req.body;

        // Sesuaikan parameter di bawah ini dengan struktur JSON Callback/Webhook dari dokumentasi BinderPay Anda
        // Contoh umum parameter: order_id, status, customer_phone, amount, dll.
        const orderId = paymentData.order_id || 'INV-INDOSAKU';
        const status = paymentData.status; // Contoh: 'SUCCESS', 'PAID', 'SETTLED'
        const telegramChatId = paymentData.chat_id; // ID Telegram pelanggan (jika disimpan saat pembuatan invoice)
        const productName = paymentData.product_name || 'Pulsa / Tagihan PPOB';
        const amount = paymentData.amount || 0;

        // Cek jika status pembayaran berhasil/lunas
        if (status === 'SUCCESS' || status === 'PAID' || status === 'SETTLED') {
            
            // Jika Anda menyimpan chat_id Telegram pelanggan, bot bisa langsung mengirim notifikasi ke chat mereka:
            if (telegramChatId) {
                await bot.telegram.sendMessage(
                    telegramChatId,
                    `🎉 *PEMBAYARAN BERHASIL & TERVERIFIKASI!*\n\n` +
                    `📦 Produk: *${productName}*\n` +
                    `🆔 No. Ref: \`${orderId}\`\n` +
                    `💰 Nominal: *Rp ${parseInt(amount).toLocaleString('id-ID')}*\n\n` +
                    `Sistem sedang memproses pengisian ke nomor/tujuan Anda secara otomatis. Terima kasih telah berbelanja di INDOSAKU!`,
                    { parse_mode: 'Markdown' }
                );
            }

            return res.status(200).json({ status: 'success', message: 'Webhook processed successfully' });
        }

        // Jika status belum lunas atau dibatalkan
        return res.status(200).json({ status: 'ignored', message: 'Payment status not settled' });

    } catch (error) {
        console.error('Webhook Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
