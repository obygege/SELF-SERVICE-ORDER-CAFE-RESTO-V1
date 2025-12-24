// Gunakan require, jangan import
const midtransClient = require('midtrans-client');

// Gunakan module.exports, JANGAN export default
module.exports = async (req, res) => {
    // 1. Handle CORS (Wajib agar frontend bisa akses)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // 2. Handle Preflight Request (Browser cek ombak)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 3. Hanya terima POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { orderId, total, items, customer } = req.body;

        // Pastikan Server Key Sandbox benar
        // GANTI 'SB-Mid-server-xxxx' DENGAN KEY KAMU YANG ASLI
        let snap = new midtransClient.Snap({
            isProduction: false,
            serverKey: 'Mid-server-_me4GdmlxcS5FlNmSDV0Po53'
        });

        let parameter = {
            transaction_details: {
                order_id: orderId,
                gross_amount: total
            },
            item_details: items,
            customer_details: {
                first_name: customer.name || "Guest",
                email: customer.email || "guest@example.com",
            }
        };

        const transaction = await snap.createTransaction(parameter);
        res.status(200).json({ token: transaction.token });

    } catch (error) {
        console.error('Midtrans Error:', error);
        res.status(500).json({ error: error.message });
    }
};