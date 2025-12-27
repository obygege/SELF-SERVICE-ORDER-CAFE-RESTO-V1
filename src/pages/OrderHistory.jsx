import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Clock, ShoppingBag, ChefHat, Loader2, BellRing, CheckCircle, XCircle, AlertTriangle, Upload, RefreshCw } from 'lucide-react';
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
            console.error("Firestore Error:", error);

            if (error.code === 'failed-precondition') {
                toast.error("Sistem sedang menyiapkan database. Tunggu 1 menit.");
            }

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

    const handleFileSelect = (e, orderId) => {
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
                note: 'Bukti diperbarui.'
            });
            toast.success("Berhasil dikirim!");
            setActiveReuploadId(null);
            setSelectedFile(null);
            setPreviewUrl(null);
        } catch (error) {
            toast.error("Gagal mengirim.");
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
                case 'cooking': return { label: 'DIMASAK', color: 'bg-orange-500 text-white', icon: <ChefHat size={14} /> };
                case 'ready': return { label: 'SIAP ANTAR', color: 'bg-blue-600 text-white', icon: <BellRing size={14} className="animate-bounce" /> };
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
                <button onClick={() => navigate('/')} className="p-2"><ArrowLeft size={24} /></button>
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
                            <div key={order.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden mb-4">
                                <div className={`p-4 flex justify-between items-center ${statusInfo.color}`}>
                                    <div className="flex items-center gap-2">
                                        {statusInfo.icon}
                                        <span className="font-black text-[10px] uppercase">{statusInfo.label}</span>
                                    </div>
                                    <span className="text-[10px] font-bold opacity-70">#{order.orderId?.slice(-6)}</span>
                                </div>
                                <div className="p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-xs font-black uppercase text-gray-400">Meja {order.tableNumber}</span>
                                        <span className="text-sm font-black text-orange-600">Rp {order.total?.toLocaleString()}</span>
                                    </div>
                                    <div className="space-y-1 mb-4 border-b pb-4">
                                        {order.items.map((item, i) => (
                                            <div key={i} className="flex justify-between text-[11px] font-bold text-gray-600 uppercase">
                                                <span>{item.qty}x {item.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {order.status === 'payment_rejected' && (
                                        <div className="mt-2">
                                            {activeReuploadId === order.id ? (
                                                <div className="space-y-3">
                                                    {previewUrl && <img src={previewUrl} className="h-32 w-full object-cover rounded-xl" />}
                                                    <div className="flex gap-2">
                                                        <button onClick={cancelReupload} className="flex-1 py-3 text-[10px] font-bold bg-gray-100 rounded-xl">Batal</button>
                                                        <button onClick={() => handleReupload(order.id)} className="flex-2 py-3 text-[10px] font-bold bg-red-600 text-white rounded-xl">Kirim Ulang</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button onClick={() => { setActiveReuploadId(order.id) }} className="w-full py-3 bg-red-50 text-red-600 border-2 border-dashed border-red-200 rounded-xl text-[10px] font-bold">UPLOAD ULANG BUKTI</button>
                                            )}
                                            <input type="file" id={`file-${order.id}`} accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, order.id)} />
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