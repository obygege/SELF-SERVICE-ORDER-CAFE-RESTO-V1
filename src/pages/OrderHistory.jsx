import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Clock, ShoppingBag, ChefHat, Loader2, BellRing, AlertCircle } from 'lucide-react';

const OrderHistory = () => {
    const { currentUser } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(''); // State untuk pesan error
    const navigate = useNavigate();

    useEffect(() => {
        // 1. Jika User belum login / Auth belum siap
        if (!currentUser) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setErrorMsg('');

        // 2. Query Database
        // PERHATIAN: Kombinasi 'where' dan 'orderBy' butuh INDEX di Firestore Console
        const q = query(
            collection(db, "orders"),
            where("customerEmail", "==", currentUser.email),
            orderBy("createdAt", "desc")
        );

        const unsub = onSnapshot(q,
            (snapshot) => {
                const now = new Date().getTime();
                const cutoffTime = 42 * 60 * 60 * 1000;

                const list = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(order => {
                        if (order.status === 'completed' && order.createdAt) {
                            const orderTime = order.createdAt.seconds * 1000;
                            if ((now - orderTime) > cutoffTime) {
                                return false;
                            }
                        }
                        return true;
                    });

                setOrders(list);
                setLoading(false); // Stop loading jika sukses
            },
            (error) => {
                // 3. Tangkap Error (Biasanya karena Index Missing)
                console.error("Error Fetching History:", error);

                if (error.message.includes("index")) {
                    setErrorMsg("Sistem membutuhkan Index Database. Buka Console (F12) untuk link pembuatannya.");
                } else {
                    setErrorMsg("Gagal memuat riwayat. Coba refresh.");
                }
                setLoading(false); // Stop loading jika error
            }
        );

        return () => unsub();
    }, [currentUser]);

    const getStatusInfo = (status) => {
        switch (status) {
            case 'pending': return { label: 'MENUNGGU KONFIRMASI', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
            case 'cooking': return { label: 'SEDANG DISIAPKAN', color: 'bg-blue-100 text-blue-700 border-blue-200' };
            case 'ready': return { label: 'SIAP DIANTAR/DIAMBIL', color: 'bg-green-100 text-green-700 border-green-200' };
            case 'completed': return { label: 'SELESAI', color: 'bg-gray-100 text-gray-600 border-gray-200' };
            default: return { label: status, color: 'bg-gray-100' };
        }
    };

    // Tampilan Loading
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-3">
                <Loader2 className="animate-spin text-orange-600" size={40} />
                <p className="text-gray-400 text-sm">Memuat riwayat...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center gap-4">
                <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft size={24} className="text-gray-700" />
                </button>
                <h1 className="font-bold text-lg">Riwayat Pesanan Saya</h1>
            </header>

            <div className="p-4 space-y-4">

                {/* TAMPILKAN ERROR JIKA ADA */}
                {errorMsg && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex gap-3 text-red-700 items-start">
                        <AlertCircle size={24} className="shrink-0" />
                        <div className="text-sm">
                            <p className="font-bold">Terjadi Kesalahan</p>
                            <p>{errorMsg}</p>
                        </div>
                    </div>
                )}

                {/* TAMPILAN KOSONG */}
                {!errorMsg && orders.length === 0 && (
                    <div className="text-center py-12">
                        <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <Clock size={40} />
                        </div>
                        <h3 className="font-bold text-gray-800">Tidak ada pesanan aktif</h3>
                        <p className="text-sm text-gray-500 mt-2 px-6">
                            Mulai pesan makanan favoritmu sekarang!
                        </p>
                        <button onClick={() => navigate('/')} className="mt-6 bg-orange-600 text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-orange-700 transition">
                            Pesan Sekarang
                        </button>
                    </div>
                )}

                {/* LIST PESANAN */}
                {orders.map(order => {
                    const statusInfo = getStatusInfo(order.status);
                    return (
                        <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition hover:shadow-md">

                            <div className={`p-3 flex justify-between items-center ${statusInfo.color} border-b`}>
                                <div className="flex items-center gap-2">
                                    <BellRing size={16} />
                                    <span className="font-bold text-xs tracking-wide">{statusInfo.label}</span>
                                </div>
                                <span className="text-[10px] font-mono opacity-80 bg-white/50 px-1 rounded">{order.orderId}</span>
                            </div>

                            <div className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1">Tanggal Pesan</p>
                                        <p className="text-xs text-gray-600 font-medium">
                                            {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString() : 'Baru saja...'}
                                        </p>
                                    </div>

                                    <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border ${order.diningOption === 'takeaway' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                                        {order.diningOption === 'takeaway' ? <ShoppingBag size={12} /> : <ChefHat size={12} />}
                                        {order.diningOption === 'takeaway' ? 'AMBIL SENDIRI' : 'DINE IN (MEJA)'}
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4 bg-gray-50 p-3 rounded-lg">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-sm text-gray-700">
                                            <span className="line-clamp-1 w-3/4"><b>{item.qty || item.quantity}x</b> {item.name}</span>
                                            <span>Rp {(item.price * (item.qty || item.quantity)).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-between items-center border-t pt-3">
                                    <span className="text-sm text-gray-500">Total Bayar</span>
                                    <span className="font-bold text-lg text-gray-800">Rp {order.total?.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default OrderHistory;