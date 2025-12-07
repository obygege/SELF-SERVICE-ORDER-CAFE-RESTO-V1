import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { writeBatch, collection, doc, Timestamp, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { Database, UserCheck, ShieldAlert, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const SetupPage = () => {
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);

    const addLog = (msg) => setLogs(prev => [...prev, msg]);

    // --- DATA MENU (MIE GACOAN KW) ---
    const productsData = [
        { name: "Mie Iblis Level 1", price: 10000, stock: 50, category: "Makanan", image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=300" },
        { name: "Mie Setan Level 3", price: 10000, stock: 45, category: "Makanan", image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300" },
        { name: "Mie Angel (No Pedas)", price: 9500, stock: 30, category: "Makanan", image: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=300" },
        { name: "Udang Keju", price: 9000, stock: 20, category: "Dimsum", image: "https://images.unsplash.com/photo-1496116218417-1a781b1c423c?w=300" },
        { name: "Udang Rambutan", price: 9000, stock: 25, category: "Dimsum", image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=300" },
        { name: "Siomay Ayam", price: 8500, stock: 40, category: "Dimsum", image: "https://images.unsplash.com/photo-1541696490-8744a570242e?w=300" },
        { name: "Es Genderuwo", price: 9000, stock: 100, category: "Minuman", image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=300" },
        { name: "Es Pocong", price: 8000, stock: 80, category: "Minuman", image: "https://images.unsplash.com/photo-1497534446932-c925b458314e?w=300" },
        { name: "Es Teh Manis", price: 4000, stock: 200, category: "Minuman", image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=300" }
    ];

    // --- DATA AKUN STAFF ---
    const staffAccounts = [
        { email: "admin@cafe.com", pass: "admin123", role: "admin", name: "Administrator" },
        { email: "head@cafe.com", pass: "head123", role: "head", name: "Kepala Toko" }
    ];

    const handleFullSetup = async () => {
        if (!window.confirm("Yakin ingin setup? Ini akan mengisi database.")) return;

        setLoading(true);
        setLogs([]); // Reset log
        const batch = writeBatch(db);

        try {
            addLog("🚀 Memulai proses setup...");

            // 1. SETUP FIRESTORE (Config & Products)
            addLog("📂 Membuat Collection 'config'...");
            const configRef = doc(db, "config", "storeSettings");
            batch.set(configRef, { adminFee: 500, storeName: "Cafe Futura", printerIp: "192.168.1.100" });

            addLog(`📂 Mengupload ${productsData.length} menu makanan...`);
            productsData.forEach((item) => {
                const productRef = doc(collection(db, "products"));
                batch.set(productRef, item);
            });

            // 2. SETUP COLLECTION USERS (Simpan Role di Database)
            addLog("📂 Membuat Collection 'users' untuk data role...");
            staffAccounts.forEach(acc => {
                // Kita simpan data role user di Firestore juga
                // ID Dokumen = Email (biar gampang dicari)
                const userRef = doc(db, "users", acc.email);
                batch.set(userRef, {
                    email: acc.email,
                    role: acc.role,
                    name: acc.name,
                    createdAt: Timestamp.now()
                });
            });

            await batch.commit();
            addLog("✅ Database Firestore Selesai!");

            // 3. SETUP AUTHENTICATION (Bikin Akun Login)
            addLog("🔐 Membuat akun Admin & Kepala di Auth...");

            // *Trik:* Kita harus buat satu-satu karena 'createUser' otomatis melogin user tersebut.
            for (const acc of staffAccounts) {
                try {
                    // Logout dulu biar aman
                    await signOut(auth);
                    // Buat akun
                    await createUserWithEmailAndPassword(auth, acc.email, acc.pass);
                    addLog(`✅ Sukses buat akun: ${acc.email} (Password: ${acc.pass})`);
                } catch (error) {
                    if (error.code === 'auth/email-already-in-use') {
                        addLog(`⚠️ Akun ${acc.email} sudah ada (Dilewati).`);
                    } else {
                        addLog(`❌ Gagal buat ${acc.email}: ${error.message}`);
                    }
                }
            }

            // Logout terakhir agar bersih
            await signOut(auth);

            addLog("🎉 SEMUA SELESAI! Silakan Login.");
            toast.success("Setup Toko Berhasil!");

        } catch (error) {
            console.error(error);
            addLog(`❌ Error Fatal: ${error.message}`);
            toast.error("Gagal Setup");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl overflow-hidden border border-gray-200">

                <div className="bg-slate-900 p-6 text-white text-center">
                    <ShieldAlert size={48} className="mx-auto mb-3 text-orange-500" />
                    <h1 className="text-2xl font-bold">Developer Setup Tool</h1>
                    <p className="text-slate-400 text-sm">Gunakan halaman ini hanya untuk inisialisasi Toko Baru.</p>
                </div>

                <div className="p-8">
                    <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-blue-800">
                        <strong>Fitur Otomatis:</strong>
                        <ul className="list-disc pl-4 mt-2 space-y-1">
                            <li>Isi Menu Makanan (Mie Gacoan KW)</li>
                            <li>Buat Config Toko</li>
                            <li>Buat Collection 'users' (Role)</li>
                            <li>Daftarkan Email: <b>admin@cafe.com</b> (Pass: admin123)</li>
                            <li>Daftarkan Email: <b>head@cafe.com</b> (Pass: head123)</li>
                        </ul>
                    </div>

                    <button
                        onClick={handleFullSetup}
                        disabled={loading}
                        className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition shadow-lg
              ${loading
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-orange-600 text-white hover:bg-orange-700 hover:scale-[1.02]'}`}
                    >
                        {loading ? (
                            <>Sedang Memproses...</>
                        ) : (
                            <><Database /> MULAI SETUP SEKARANG</>
                        )}
                    </button>

                    {/* LOG AREA */}
                    <div className="mt-6 bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs h-48 overflow-y-auto shadow-inner">
                        {logs.length === 0 ? "> Menunggu perintah..." : logs.map((log, i) => (
                            <div key={i} className="mb-1 border-b border-gray-800 pb-1 last:border-0">
                                {log}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SetupPage;