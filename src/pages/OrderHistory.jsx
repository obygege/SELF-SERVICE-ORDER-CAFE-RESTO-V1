import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Clock, ShoppingBag, ChefHat, Loader2, BellRing, CheckCircle, XCircle, AlertTriangle, Upload, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const OrderHistory = () => {
    const { currentUser } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const [uploadingId, setUploadingId] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [activeReuploadId, setActiveReuploadId] = useState(null);

    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }

        setLoading(true);

        const q = query(
            collection(db, "orders"),
            where("userId", "==", currentUser.uid),
            orderBy("createdAt", "desc")
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOrders(list);
            setLoading(false);
        }, (error) => {
            console.error("Firestore Error:", error);
            const qFallback = query(
                collection(db, "orders"),
                where("customerName", "==", currentUser.displayName || ""),
                orderBy("createdAt", "desc")
            );
            onSnapshot(qFallback, (snap) => {
                const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setOrders(list);
                setLoading(false);
            });
        });

        return () => unsub();
    }, [currentUser]);

    const handleFileSelect = (e, orderId) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error("Maksimal 2MB");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedFile(reader.result);
                setPreviewUrl(reader.result);
                setActiveReuploadId(orderId);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleReupload = async (orderId) => {
        if (!selectedFile) return;
        setUploadingId(orderId);
        try {
            await updateDoc(doc(db, "orders", orderId), {
                proofImage: selectedFile,
                status: 'pending',
                paymentStatus: 'unpaid',
                note: 'Bukti pembayaran telah diperbarui oleh pelanggan.'
            });
            toast.success("Bukti berhasil dikirim ulang!");
            setActiveReuploadId(null);
            setSelectedFile(null);
            setPreviewUrl(null);
        } catch (error) {
            toast.error("Gagal mengirim bukti");
        } finally {
            setUploadingId(null);
        }
    };

    const cancelReupload = () => {
        setActiveReuploadId(null);
        setSelectedFile(null);
        setPreviewUrl(null);
    };

    const getStatusInfo = (status, paymentStatus) => {
        if (status === 'payment_rejected') return { label: 'DITOLAK', color: 'bg-red-100 text-red-700', icon: <XCircle size={16} /> };
        if (status === 'completed') return { label: 'SELESAI', color: 'bg-gray-800 text-white', icon: <CheckCircle size={16} /> };

        switch (status) {
            case 'pending': return { label: paymentStatus === 'paid' ? 'DIKONFIRMASI' : 'MENUNGGU', color: 'bg-yellow-100 text-yellow-700', icon: <Clock size={16} /> };
            case 'cooking': return { label: 'DIPROSES', color: 'bg-blue-100 text-blue-700', icon: <ChefHat size={16} /> };
            case 'ready': return { label: 'SIAP ANTAR', color: 'bg-green-100 text-green-700', icon: <BellRing size={16} /> };
            default: return { label: 'DIPROSES', color: 'bg-gray-100 text-gray-700', icon: <Clock size={16} /> };
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-3">
                <Loader2 className="animate-spin text-orange-600" size={40} />
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Memuat Data...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center gap-4 border-b">
                <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft size={24} className="text-gray-700" />
                </button>
                <h1 className="font-black text-lg uppercase tracking-tighter">Status Pesanan</h1>
            </header>

            <div className="p-4 space-y-4">
                {orders.length === 0 ? (
                    <div className="text-center py-20 flex flex-col items-center">
                        <ShoppingBag size={60} className="text-gray-200 mb-4" />
                        <p className="text-gray-400 font-bold text-sm uppercase">Belum ada pesanan</p>
                        <button onClick={() => navigate('/')} className="mt-6 bg-orange-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-lg shadow-orange-200">Pesan Sekarang</button>
                    </div>
                ) : (
                    orders.map(order => {
                        const statusInfo = getStatusInfo(order.status, order.paymentStatus);
                        const isRejected = order.status === 'payment_rejected';
                        const isPaid = order.paymentStatus === 'paid';

                        return (
                            <div key={order.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-4 transition-all active:scale-[0.98]">
                                <div className={`p-4 flex justify-between items-center ${statusInfo.color} border-b`}>
                                    <div className="flex items-center gap-2">
                                        {statusInfo.icon}
                                        <span className="font-black text-[10px] uppercase tracking-wider">{statusInfo.label}</span>
                                    </div>
                                    <span className="text-[10px] font-black opacity-60 px-2 py-0.5 bg-white/30 rounded-lg">{order.orderId}</span>
                                </div>

                                <div className="p-5">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pembayaran</p>
                                            <span className={`text-xs font-black uppercase ${isPaid ? 'text-green-600' : 'text-red-600'}`}>
                                                {isPaid ? 'LUNAS' : 'MENUNGGU VERIFIKASI'}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nomor Meja</p>
                                            <span className="text-xl font-black text-slate-900 uppercase tracking-tighter">MEJA {order.tableNumber}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-5 bg-gray-50 p-4 rounded-2xl border border-gray-100 border-dashed">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-xs font-bold uppercase text-gray-600">
                                                <span className="flex-1 truncate mr-4">{item.qty}x {item.name}</span>
                                                <span className="text-slate-900">Rp {(item.price * item.qty).toLocaleString()}</span>
                                            </div>
                                        ))}
                                        <div className="pt-2 border-t border-gray-200 mt-2 flex justify-between items-center font-black">
                                            <span className="text-[10px] text-gray-400 uppercase">Total Bayar</span>
                                            <span className="text-sm text-orange-600">Rp {order.total?.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {isRejected && (
                                        <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-4">
                                            <div className="flex items-start gap-3 mb-4">
                                                <AlertTriangle className="text-red-500" size={20} />
                                                <div>
                                                    <h4 className="font-black text-red-700 text-xs uppercase">Pembayaran Bermasalah</h4>
                                                    <p className="text-[10px] font-bold text-red-600 mt-1 leading-relaxed">Pesan: {order.note}</p>
                                                </div>
                                            </div>

                                            {activeReuploadId === order.id ? (
                                                <div className="space-y-3 animate-in slide-in-from-top duration-300">
                                                    {previewUrl && <img src={previewUrl} className="h-40 w-full object-cover rounded-xl border-2 border-white shadow-md" alt="Preview" />}
                                                    <div className="flex gap-2">
                                                        <button onClick={cancelReupload} className="flex-1 py-3 text-[10px] font-black text-gray-400 uppercase bg-white border border-gray-200 rounded-xl">Batal</button>
                                                        <button onClick={() => handleReupload(order.id)} disabled={uploadingId === order.id} className="flex-2 px-6 py-3 text-[10px] font-black text-white bg-red-600 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-red-200">
                                                            {uploadingId === order.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                                            Update Bukti
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <label className="w-full bg-white border-2 border-dashed border-red-200 text-red-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 cursor-pointer hover:bg-red-50 transition-all">
                                                    <Upload size={16} /> Pilih Bukti Baru
                                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, order.id)} />
                                                </label>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default OrderHistory;