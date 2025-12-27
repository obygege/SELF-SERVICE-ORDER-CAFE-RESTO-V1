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
            console.error("Listener Error:", error);
            setLoading(false);
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
                note: 'Bukti pembayaran diperbarui.'
            });
            toast.success("Berhasil kirim ulang!");
            setActiveReuploadId(null);
            setSelectedFile(null);
            setPreviewUrl(null);
        } catch (error) {
            toast.error("Gagal kirim bukti");
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
        if (status === 'payment_rejected') return { label: 'PEMBAYARAN DITOLAK', color: 'bg-red-500 text-white', icon: <XCircle size={14} /> };
        if (status === 'completed') return { label: 'PESANAN SELESAI', color: 'bg-slate-900 text-white', icon: <CheckCircle size={14} /> };

        if (paymentStatus === 'paid') {
            switch (status) {
                case 'pending': return { label: 'DIKONFIRMASI (ANTRI)', color: 'bg-green-600 text-white', icon: <Clock size={14} /> };
                case 'cooking': return { label: 'SEDANG DIMASAK', color: 'bg-orange-500 text-white', icon: <ChefHat size={14} /> };
                case 'ready': return { label: 'SIAP DIANTAR', color: 'bg-blue-600 text-white', icon: <BellRing size={14} className="animate-bounce" /> };
                default: return { label: 'DIPROSES', color: 'bg-green-600 text-white', icon: <Clock size={14} /> };
            }
        } else {
            return { label: 'MENUNGGU VERIFIKASI', color: 'bg-yellow-400 text-yellow-900', icon: <Clock size={14} /> };
        }
    };

    if (loading && orders.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-3">
                <Loader2 className="animate-spin text-orange-600" size={40} />
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Sinkronisasi Realtime...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center gap-4 border-b border-gray-100">
                <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full transition-all">
                    <ArrowLeft size={24} className="text-slate-900" />
                </button>
                <h1 className="font-black text-lg uppercase tracking-tighter text-slate-900">Pesanan Saya</h1>
            </header>

            <div className="p-4 space-y-4">
                {orders.length === 0 ? (
                    <div className="text-center py-20 flex flex-col items-center">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                            <ShoppingBag size={40} className="text-gray-200" />
                        </div>
                        <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Belum ada pesanan aktif</p>
                        <button onClick={() => navigate('/')} className="mt-6 bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95 transition-all">Pesan Sekarang</button>
                    </div>
                ) : (
                    orders.map(order => {
                        const statusInfo = getStatusInfo(order.status, order.paymentStatus);
                        const isRejected = order.status === 'payment_rejected';
                        const isPaid = order.paymentStatus === 'paid';

                        return (
                            <div key={order.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden mb-6 transition-all hover:shadow-md">
                                <div className={`p-4 flex justify-between items-center ${statusInfo.color}`}>
                                    <div className="flex items-center gap-2">
                                        {statusInfo.icon}
                                        <span className="font-black text-[10px] uppercase tracking-widest">{statusInfo.label}</span>
                                    </div>
                                    <span className="text-[10px] font-black opacity-60">ID: {order.orderId?.slice(-6)}</span>
                                </div>

                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status Bayar</p>
                                            <div className="flex items-center gap-2">
                                                <div className={`h-2 w-2 rounded-full ${isPaid ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                                                <span className={`text-xs font-black uppercase ${isPaid ? 'text-green-600' : 'text-red-600'}`}>
                                                    {isPaid ? 'Pembayaran Lunas' : 'Menunggu Konfirmasi'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nomor Meja</p>
                                            <span className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{order.tableNumber}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-3xl border border-slate-100 border-dashed">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-xs font-bold uppercase text-slate-600">
                                                <span className="flex-1 truncate mr-4"><span className="text-orange-600">{item.qty}x</span> {item.name}</span>
                                                <span className="text-slate-900">Rp {(item.price * item.qty).toLocaleString()}</span>
                                            </div>
                                        ))}
                                        <div className="pt-3 border-t border-slate-200 mt-2 flex justify-between items-center font-black">
                                            <span className="text-[10px] text-slate-400 uppercase">Total Akhir</span>
                                            <span className="text-base text-orange-600 tracking-tighter">Rp {order.total?.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {isRejected && (
                                        <div className="bg-red-50 border-2 border-red-100 rounded-3xl p-5">
                                            <div className="flex items-start gap-4 mb-5">
                                                <div className="p-2 bg-red-100 rounded-xl text-red-600">
                                                    <AlertTriangle size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-red-700 text-xs uppercase tracking-tight">Verifikasi Ditolak</h4>
                                                    <p className="text-[10px] font-bold text-red-500 mt-1 leading-relaxed">{order.note}</p>
                                                </div>
                                            </div>

                                            {activeReuploadId === order.id ? (
                                                <div className="space-y-4">
                                                    {previewUrl && <img src={previewUrl} className="h-48 w-full object-cover rounded-[1.5rem] shadow-sm border-2 border-white" alt="Preview" />}
                                                    <div className="flex gap-2">
                                                        <button onClick={cancelReupload} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase bg-white border border-gray-200 rounded-2xl active:scale-95 transition-all">Batal</button>
                                                        <button
                                                            onClick={() => handleReupload(order.id)}
                                                            disabled={uploadingId === order.id}
                                                            className="flex-2 px-8 py-4 text-[10px] font-black text-white bg-red-600 rounded-2xl shadow-lg shadow-red-100 flex justify-center items-center gap-2 active:scale-95 transition-all"
                                                        >
                                                            {uploadingId === order.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                                            Kirim Ulang
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <label className="w-full bg-white border-2 border-dashed border-red-200 text-red-500 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 cursor-pointer hover:bg-red-50 transition-all active:scale-95">
                                                    <Upload size={16} /> Perbarui Bukti Bayar
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