const express = require('express');
const cors = require('cors');
const midtransClient = require('midtrans-client');

const app = express();
app.use(cors());
app.use(express.json());

// GANTI DENGAN SERVER KEY MIDTRANS SANDBOX ANDA
const snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: 'Mid-server-_me4GdmlxcS5FlNmSDV0Po53'
});

app.post('/api/payment', async (req, res) => {
    const { orderId, total, items, customer } = req.body;

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

    try {
        const transaction = await snap.createTransaction(parameter);
        res.json({ token: transaction.token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(5000, () => console.log('Server Midtrans running on port 5000'));