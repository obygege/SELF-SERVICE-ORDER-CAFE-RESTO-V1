import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Clock, ShoppingBag, ChefHat, Loader2, BellRing, CheckCircle, XCircle, AlertTriangle, Upload, RefreshCw, X, Receipt, User } from 'lucide-react';
import toast from 'react-hot-toast';

const OrderHistory = () => {
    const { currentUser, loading: authLoading } = useAuth();
    const [orders, setOrders] = useState([]);
    const [fetching, setFetching] = useState(true);
    const navigate = useNavigate();

    const [uploadingId, setUploadingId] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [activeReuploadId, setActiveReuploadId] = useState(null);
    const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);

    useEffect(() => {
        if (authLoading) return;

        if (!currentUser) {
            setFetching(false);
            return;
        }

        const q = query(
            collection(db, "orders"),
            where("userId", "==", currentUser.uid),
            orderBy("createdAt", "desc")
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setOrders(list);
            setFetching(false);
        }, (error) => {
            const qSimple = query(
                collection(db, "orders"),
                where("userId", "==", currentUser.uid)
            );

            onSnapshot(qSimple, (snap) => {
                const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const sorted = list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setOrders(sorted);
                setFetching(false);
            });
        });

        return () => unsub();
    }, [currentUser, authLoading]);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 1 * 1024 * 1024) {
                toast.error("File terlalu besar (Maks 1MB)");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedFile(reader.result);
                setPreviewUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleReupload = async (orderId) => {
        if (!selectedFile) return toast.error("Silakan pilih foto terlebih dahulu");
        setUploadingId(orderId);
        try {
            await updateDoc(doc(db, "orders", orderId), {
                proofImage: selectedFile,
                status: 'pending',
                paymentStatus: 'unpaid',
                note: 'Bukti pembayaran telah diupload ulang.'
            });
            toast.success("Bukti berhasil dikirim ulang!");
            setActiveReuploadId(null);
            setSelectedFile(null);
            setPreviewUrl(null);
        } catch (error) {
            toast.error("Gagal mengirim ulang bukti.");
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
        if (status === 'payment_rejected') return { label: 'DITOLAK', color: 'bg-red-600 text-white', icon: <XCircle size={14} /> };
        if (status === 'completed') return { label: 'SELESAI', color: 'bg-slate-900 text-white', icon: <CheckCircle size={14} /> };

        if (paymentStatus === 'paid') {
            switch (status) {
                case 'pending': return { label: 'ANTRIAN', color: 'bg-green-600 text-white', icon: <CheckCircle size={14} /> };
                case 'cooking': return { label: 'DIMASAK/DISIAPKAN', color: 'bg-orange-500 text-white', icon: <ChefHat size={14} /> };
                case 'ready': return { label: 'SEDANG DIANTAR', color: 'bg-blue-600 text-white', icon: <BellRing size={14} className="animate-bounce" /> };
                default: return { label: 'PROSES', color: 'bg-green-600 text-white', icon: <Clock size={14} /> };
            }
        }
        return { label: 'VERIFIKASI', color: 'bg-yellow-400 text-yellow-900', icon: <Clock size={14} /> };
    };

    if (fetching && orders.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-3">
                <Loader2 className="animate-spin text-orange-600" size={40} />
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Sinkronisasi...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center gap-4">
                <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full transition-all">
                    <ArrowLeft size={24} className="text-slate-900" />
                </button>
                <h1 className="font-black text-lg uppercase tracking-tighter">Riwayat Pesanan</h1>
            </header>

            <div className="p-4 space-y-4">
                {orders.length === 0 ? (
                    <div className="text-center py-20 flex flex-col items-center">
                        <ShoppingBag size={50} className="text-gray-200 mb-4" />
                        <p className="text-gray-400 font-bold text-xs uppercase">Belum ada pesanan</p>
                    </div>
                ) : (
                    orders.map(order => {
                        const statusInfo = getStatusInfo(order.status, order.paymentStatus);
                        return (
                            <div key={order.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden mb-4 transition-all">
                                <div onClick={() => setSelectedOrderDetail(order)} className={`p-4 flex justify-between items-center cursor-pointer ${statusInfo.color}`}>
                                    <div className="flex items-center gap-2">
                                        {statusInfo.icon}
                                        <span className="font-black text-[10px] uppercase">{statusInfo.label}</span>
                                    </div>
                                    <span className="text-[10px] font-bold opacity-70">#{order.orderId?.slice(-6)}</span>
                                </div>
                                <div className="p-6">
                                    <div onClick={() => setSelectedOrderDetail(order)} className="cursor-pointer">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-xs font-black uppercase text-gray-400">Meja {order.tableNumber}</span>
                                            <span className="text-sm font-black text-orange-600">Rp {order.total?.toLocaleString()}</span>
                                        </div>
                                        <div className="space-y-1 mb-4 border-b pb-4 text-[11px] font-bold text-gray-600 uppercase">
                                            {order.items.slice(0, 2).map((item, i) => (
                                                <div key={i} className="flex justify-between">
                                                    <span>{item.qty}x {item.name}</span>
                                                </div>
                                            ))}
                                            {order.items.length > 2 && <p className="text-[9px] text-gray-400 italic text-center mt-2">+{order.items.length - 2} menu lainnya</p>}
                                        </div>
                                    </div>

                                    {order.status === 'payment_rejected' && (
                                        <div className="mt-2 space-y-3 bg-red-50 p-4 rounded-2xl border border-red-100">
                                            <div className="flex items-center gap-2 text-red-600 mb-2">
                                                <AlertTriangle size={16} />
                                                <span className="text-[10px] font-black uppercase">Alasan: {order.note}</span>
                                            </div>

                                            {activeReuploadId === order.id ? (
                                                <div className="space-y-3">
                                                    <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-2 bg-white">
                                                        {previewUrl ? (
                                                            <img src={previewUrl} className="h-40 w-full object-cover rounded-xl shadow-sm" alt="Preview" />
                                                        ) : (
                                                            <div className="h-40 flex flex-col items-center justify-center text-slate-400">
                                                                <Upload size={24} className="mb-2" />
                                                                <span className="text-[10px] font-bold uppercase">Ketuk untuk Pilih Foto</span>
                                                            </div>
                                                        )}
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                                            onChange={handleFileSelect}
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={cancelReupload} className="flex-1 py-3 text-[10px] font-bold bg-gray-200 text-gray-700 rounded-xl uppercase transition-all active:scale-95">Batal</button>
                                                        <button
                                                            onClick={() => handleReupload(order.id)}
                                                            disabled={uploadingId === order.id || !selectedFile}
                                                            className="flex-2 py-3 px-4 text-[10px] font-bold bg-red-600 text-white rounded-xl uppercase flex items-center justify-center gap-2 disabled:bg-red-300 shadow-lg active:scale-95 transition-all"
                                                        >
                                                            {uploadingId === order.id ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                                                            Kirim Ulang
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setActiveReuploadId(order.id)}
                                                    className="w-full py-4 bg-white text-red-600 border-2 border-red-200 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-red-50 transition-all active:scale-95"
                                                >
                                                    <Upload size={16} /> Pilih Bukti Baru & Kirim
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {selectedOrderDetail && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-300">
                        <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Receipt size={24} className="text-orange-400" />
                                <div>
                                    <h2 className="font-black text-sm uppercase tracking-widest">Detail Pesanan</h2>
                                    <p className="text-[10px] text-slate-400 font-mono tracking-widest">#{selectedOrderDetail.orderId}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedOrderDetail(null)} className="p-2 hover:bg-slate-700 rounded-full transition"><X size={24} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <span className="text-[9px] text-slate-400 uppercase font-black block mb-1">Nama Pemesan</span>
                                    <span className="font-black text-slate-800 flex items-center gap-2 uppercase text-xs truncate"><User size={14} /> {selectedOrderDetail.customerName}</span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                                    <span className="text-[9px] text-slate-400 uppercase font-black block mb-1">Nomor Meja</span>
                                    <span className="font-black text-2xl text-orange-600">{selectedOrderDetail.tableNumber}</span>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><ChefHat size={16} /> Rincian Menu</h3>
                                <div className="space-y-3">
                                    {selectedOrderDetail.items?.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-start py-2 border-b border-slate-200 last:border-0">
                                            <div className="flex gap-3">
                                                <div className="bg-slate-900 text-white w-6 h-6 rounded-lg flex items-center justify-center font-black text-[9px] shrink-0 mt-0.5">{item.qty}x</div>
                                                <div>
                                                    <span className="font-black text-slate-700 text-xs uppercase block">{item.name}</span>
                                                    <span className="text-[9px] font-bold text-gray-400">@ Rp {item.price?.toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <span className="font-black text-slate-900 text-xs shrink-0">Rp {(item.price * item.qty).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl">
                                <div className="flex justify-between mb-2 text-[10px] text-slate-400 uppercase font-black tracking-widest">
                                    <span>Subtotal</span>
                                    <span>Rp {selectedOrderDetail.subTotal?.toLocaleString()}</span>
                                </div>
                                {selectedOrderDetail.uniqueCode > 0 && (
                                    <div className="flex justify-between mb-2 text-[10px] text-orange-400 uppercase font-black tracking-widest">
                                        <span>Kode Unik</span>
                                        <span>+{selectedOrderDetail.uniqueCode}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-3 border-t border-slate-700">
                                    <span className="font-black text-xs uppercase tracking-widest text-orange-400">Total Bayar</span>
                                    <span className="font-black text-2xl text-white tracking-tighter">Rp {selectedOrderDetail.total?.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t">
                            <button onClick={() => setSelectedOrderDetail(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all">Tutup</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderHistory;