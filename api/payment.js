const midtransClient = require('midtrans-client');

export default async function handler(req, res) {
    // Handle CORS (Agar bisa diakses dari frontend)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { orderId, total, items, customer } = req.body;

        // Inisialisasi Midtrans (GANTI DENGAN SERVER KEY KAMU)
        // Sebaiknya taruh di .env: process.env.MIDTRANS_SERVER_KEY
        let snap = new midtransClient.Snap({
            isProduction: true, // Ganti false jika masih sandbox
            serverKey: 'Mid-server-_me4GdmlxcS5FlNmSDV0Po53'
        });

        let parameter = {
            transaction_details: {
                order_id: orderId,
                gross_amount: total
            },
            credit_card: {
                secure: true
            },
            item_details: items,
            customer_details: {
                first_name: customer.name || "Guest",
                email: customer.email || "robyakshay011@gmail.com",
            }
        };

        const transaction = await snap.createTransaction(parameter);
        res.status(200).json({ token: transaction.token });

    } catch (error) {
        console.error('Midtrans Error:', error);
        res.status(500).json({ error: error.message });
    }
}