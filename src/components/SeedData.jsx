import React, { useState } from 'react';
import { db } from '../firebase';
import { writeBatch, collection, doc, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Database } from 'lucide-react';

const SeedData = () => {
    const [loading, setLoading] = useState(false);

    // 1. Data Tabel PRODUCTS (Menu Makanan/Minuman)
    const productsData = [
        {
            name: "Mie Iblis Level 1",
            price: 10000,
            stock: 50,
            category: "Makanan",
            image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=300"
        },
        {
            name: "Udang Keju",
            price: 9000,
            stock: 20,
            category: "Dimsum",
            image: "https://images.unsplash.com/photo-1496116218417-1a781b1c423c?w=300"
        },
        {
            name: "Es Genderuwo",
            price: 9000,
            stock: 100,
            category: "Minuman",
            image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=300"
        }
        // Tambahkan menu lain jika perlu
    ];

    const handleSetupDatabase = async () => {
        setLoading(true);
        const batch = writeBatch(db);

        try {
            // --- A. SETUP TABEL CONFIG ---
            // Membuat dokumen 'mainConfig' di dalam koleksi 'config'
            // Isinya: { adminFee: 500 }
            const configRef = doc(db, "config", "storeSettings");
            batch.set(configRef, {
                adminFee: 500,
                storeName: "Cafe Gacoan KW",
                printerIp: "192.168.1.100" // Contoh setting tambahan
            });

            // --- B. SETUP TABEL PRODUCTS ---
            // Memasukkan semua menu ke koleksi 'products'
            productsData.forEach((item) => {
                const productRef = doc(collection(db, "products")); // ID otomatis
                batch.set(productRef, item);
            });

            // --- C. SETUP TABEL ORDERS (Contoh Data) ---
            // Kita buat 1 data dummy supaya koleksi 'orders' langsung muncul di Firebase
            // Struktur: { tableNumber, items, total, status, timestamp, paymentStatus }
            const dummyOrderRef = doc(collection(db, "orders"));
            batch.set(dummyOrderRef, {
                tableNumber: 99, // Meja contoh
                items: [
                    { name: "Mie Iblis Level 1", price: 10000, qty: 1 },
                    { name: "Es Genderuwo", price: 9000, qty: 1 }
                ],
                total: 19500, // 19000 + 500 admin
                adminFee: 500,
                status: "completed", // Supaya tidak muncul sebagai order aktif
                paymentStatus: "paid",
                createdAt: Timestamp.now()
            });

            // EKSEKUSI SEMUA KE FIREBASE
            await batch.commit();

            toast.success("Database berhasil dibuat! (Products, Orders, Config)");
        } catch (error) {
            console.error("Error setup database:", error);
            toast.error("Gagal membuat database: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm max-w-md mx-auto mt-4 text-center">
            <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Database className="text-blue-600" size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Inisialisasi Database</h3>
            <p className="text-gray-500 text-sm mb-6">
                Klik tombol ini <b>sekali saja</b> saat pertama kali install.
                Ini akan membuat tabel <code>products</code>, <code>orders</code>, dan <code>config</code> secara otomatis.
            </p>

            <button
                onClick={handleSetupDatabase}
                disabled={loading}
                className={`w-full py-3 rounded-lg text-white font-bold transition flex items-center justify-center gap-2
          ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
                {loading ? "Sedang Membuat Tabel..." : "BUAT STRUKTUR DATABASE"}
            </button>
        </div>
    );
};

export default SeedData;