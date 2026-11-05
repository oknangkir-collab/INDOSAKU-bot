const { Webhook } = require('binderpay-nodejs');
const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const rawBody = JSON.stringify(req.body);
        const publicKey = process.env.BINDERPAY_PUBLIC_KEY;

        const isValid = Webhook.verifyCallbackSignature(req.headers, rawBody, publicKey);
        if (!isValid) {
            return res.status(401).json({ responseCode: '4010000', responseMessage: 'Invalid signature' });
        }

        const callbackData = Webhook.parseCallback(req.body);

        // Jika ingin mengirim pesan sukses ke user via Telegram (opsional)
        // if (callbackData.trxId) { ... }

        if (callbackData.type === 'VA') {
            return res.status(200).json({ responseCode: '2002500', responseMessage: 'Successful' });
        } else if (callbackData.type === 'QRIS') {
            return res.status(200).json({ responseCode: '2005200', responseMessage: 'Successful' });
        }

        return res.status(200).json({ responseCode: '2000000', responseMessage: 'Successful' });
    } catch (error) {
        console.error('Webhook Error:', error);
        return res.status(500).send('Internal Server Error');
    }
};
