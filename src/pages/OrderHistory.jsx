import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Clock, ShoppingBag, ArrowLeft, BellRing, XCircle, Loader2, Upload, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const OrderHistory = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploadingId, setUploadingId] = useState(null);
    const prevStatuses = useRef({});
    const isFirstRun = useRef(true);
    const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

    useEffect(() => {
        if (!currentUser?.uid) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "orders"),
            where("userId", "==", currentUser.uid),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const orderList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            if (!isFirstRun.current) {
                orderList.forEach(order => {
                    const oldStatus = prevStatuses.current[order.id];
                    if (oldStatus && oldStatus !== order.status) {
                        handleLocalNotification(order);
                    }
                });
            }

            const newStatuses = {};
            orderList.forEach(o => {
                newStatuses[o.id] = o.status;
            });

            prevStatuses.current = newStatuses;
            setOrders(orderList);
            setLoading(false);
            isFirstRun.current = false;
        }, (error) => {
            console.error("Snapshot error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser?.uid]);

    const handleLocalNotification = (order) => {
        audioRef.current.play().catch(() => { });
        let msg = "";
        if (order.status === 'cooking') msg = `Pesanan #${order.orderId} sedang dimasak!`;
        if (order.status === 'ready') msg = `Pesanan #${order.orderId} siap diantar!`;
        if (order.status === 'payment_rejected') msg = `Pembayaran pesanan #${order.orderId} ditolak!`;
        if (order.status === 'completed') msg = `Pesanan #${order.orderId} telah selesai.`;

        if (msg) {
            toast.success(msg, {
                duration: 5000,
                position: 'top-center',
                style: { borderRadius: '12px', background: '#333', color: '#fff' }
            });
        }
    };

    const handleReuploadProof = async (e, orderId) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error("Ukuran file maksimal 2MB");
            return;
        }

        setUploadingId(orderId);
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const orderRef = doc(db, "orders", orderId);
                await updateDoc(orderRef, {
                    proofImage: reader.result,
                    status: 'pending',
                    note: 'Bukti bayar telah diupload ulang'
                });
                toast.success("Bukti bayar berhasil diperbarui!");
            } catch (error) {
                toast.error("Gagal mengupload bukti");
            } finally {
                setUploadingId(null);
            }
        };
        reader.readAsDataURL(file);
    };

    const getStatusStyles = (status) => {
        switch (status) {
            case 'pending': return 'bg-gray-100 text-gray-500 border-gray-200';
            case 'cooking': return 'bg-orange-100 text-orange-600 border-orange-200';
            case 'ready': return 'bg-green-100 text-green-600 border-green-200 animate-pulse';
            case 'completed': return 'bg-green-600 text-white border-green-700';
            case 'payment_rejected': return 'bg-red-600 text-white border-red-700';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'pending': return 'Menunggu Konfirmasi';
            case 'cooking': return 'Sedang Dimasak';
            case 'ready': return 'Siap Diantar';
            case 'completed': return 'Selesai';
            case 'payment_rejected': return 'Pembayaran Ditolak';
            default: return status;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            <header className="bg-white p-4 sticky top-0 z-30 shadow-sm flex items-center gap-4">
                <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-black text-slate-800">Riwayat Pesanan</h1>
            </header>

            <div className="p-4 max-w-2xl mx-auto space-y-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Loader2 className="animate-spin mb-4 text-orange-600" size={40} />
                        <p className="font-bold uppercase tracking-widest text-xs">Sinkronisasi Data...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200 shadow-inner">
                        <ShoppingBag size={80} className="mx-auto text-gray-100 mb-6" />
                        <p className="text-gray-400 font-black uppercase text-sm">Belum ada riwayat pesanan.</p>
                        <button onClick={() => navigate('/')} className="mt-6 text-orange-600 font-black uppercase text-xs hover:underline">
                            Pesan Menu Sekarang
                        </button>
                    </div>
                ) : (
                    orders.map((order) => (
                        <div key={order.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden relative transition-all">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-300 uppercase mb-1 tracking-widest">ID: {order.orderId}</p>
                                        <div className="flex items-center gap-3">
                                            <div className="bg-slate-900 text-white w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg">
                                                {order.tableNumber}
                                            </div>
                                            <h3 className="font-black text-slate-800 uppercase tracking-tight text-xl">Meja {order.tableNumber}</h3>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border tracking-widest shadow-sm ${getStatusStyles(order.status)}`}>
                                            {getStatusLabel(order.status)}
                                        </span>
                                        {order.paymentStatus === 'paid' && order.status !== 'payment_rejected' && (
                                            <span className="text-[9px] font-bold text-green-600 uppercase flex items-center gap-1">
                                                <CheckCircle size={10} /> Pembayaran Terverifikasi
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6">
                                    {order.items?.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                                            <span className="text-sm font-black text-slate-700">{item.qty}x <span className="ml-1 uppercase">{item.name}</span></span>
                                            <span className="text-xs font-bold text-gray-400 font-mono">Rp {(item.qty * item.price).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-between items-center pt-5 border-t border-dashed border-gray-200">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Total Dibayar</p>
                                        <p className="text-2xl font-black text-orange-600 tracking-tighter">Rp {order.total?.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Waktu Pesan</p>
                                        <p className="text-xs font-bold text-slate-500">
                                            {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {order.status === 'ready' && (
                                <div className="bg-green-500 text-white py-4 text-center text-[10px] font-black uppercase animate-pulse flex items-center justify-center gap-2 tracking-widest">
                                    <BellRing size={16} /> Pesanan Sedang Diantar ke Meja!
                                </div>
                            )}

                            {order.status === 'payment_rejected' && (
                                <div className="bg-red-600 p-6 flex flex-col items-center gap-3">
                                    <div className="flex items-center gap-2 text-white font-black uppercase text-xs tracking-widest">
                                        <XCircle size={20} /> Pembayaran Ditolak
                                    </div>
                                    <p className="text-red-100 text-[10px] text-center uppercase font-bold leading-tight mb-2">
                                        {order.note || "Bukti pembayaran tidak valid. Silakan upload ulang bukti yang benar."}
                                    </p>
                                    <label className={`w-full max-w-xs bg-white text-red-600 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-xl transition-transform active:scale-95 ${uploadingId === order.id ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        {uploadingId === order.id ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                                        Upload Ulang Bukti
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            disabled={uploadingId === order.id}
                                            onChange={(e) => handleReuploadProof(e, order.id)}
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default OrderHistory;