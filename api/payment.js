// api/payment.js
const midtransClient = require('midtrans-client');

export default async function handler(req, res) {
    // Izinkan akses dari mana saja (CORS manual untuk Vercel)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle Preflight Request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { orderId, total, items, customer } = req.body;

        // Gunakan Environment Variable (Nanti disetting di Dashboard Vercel)
        const snap = new midtransClient.Snap({
            isProduction: false,
            serverKey: process.env.MIDTRANS_SERVER_KEY
        });

        const parameter = {
            transaction_details: {
                order_id: orderId,
                gross_amount: total
            },
            credit_card: { secure: true },
            item_details: items,
            customer_details: {
                first_name: customer.name,
                email: customer.email
            }
        };

        const transaction = await snap.createTransaction(parameter);
        res.status(200).json({ token: transaction.token });

    } catch (error) {
        console.error("Midtrans Error:", error);
        res.status(500).json({ error: error.message });
    }
}