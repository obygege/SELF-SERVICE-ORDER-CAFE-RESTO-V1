import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Clock, ShoppingBag, ChefHat, Loader2, BellRing, AlertCircle, XCircle, CheckCircle, AlertTriangle, Upload, RefreshCw, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const OrderHistory = () => {
    const { currentUser } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // State untuk Re-upload Bukti Bayar
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
            where("customerEmail", "==", currentUser.email),
            orderBy("createdAt", "desc")
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOrders(list);
            setLoading(false);
        });

        return () => unsub();
    }, [currentUser]);

    // --- FUNGSI HANDLE FILE ---
    const handleFileSelect = (e, orderId) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error("Ukuran file maksimal 2MB");
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
                status: 'pending',        // Reset status agar masuk ke antrian admin lagi
                paymentStatus: 'unpaid',  // Reset status bayar
                note: 'Bukti pembayaran telah diperbarui oleh customer (Revisi).'
            });

            toast.success("Bukti pembayaran berhasil dikirim ulang!");
            setActiveReuploadId(null);
            setSelectedFile(null);
            setPreviewUrl(null);
        } catch (error) {
            console.error(error);
            toast.error("Gagal mengirim ulang bukti");
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
        // Prioritas Cek Status
        if (status === 'payment_rejected') return { label: 'PEMBAYARAN DITOLAK', color: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle size={16} /> };
        if (paymentStatus === 'paid') return { label: 'LUNAS / SELESAI', color: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle size={16} /> };

        switch (status) {
            case 'pending': return { label: 'MENUNGGU KONFIRMASI', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <Clock size={16} /> };
            case 'cooking': return { label: 'SEDANG DISIAPKAN', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <ChefHat size={16} /> };
            case 'ready': return { label: 'SIAP DIANTAR', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <BellRing size={16} /> };
            case 'completed': return { label: 'SELESAI', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: <CheckCircle size={16} /> };
            default: return { label: status, color: 'bg-gray-100', icon: <BellRing size={16} /> };
        }
    };

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
                <h1 className="font-bold text-lg">Riwayat Pesanan</h1>
            </header>

            <div className="p-4 space-y-4">
                {orders.length === 0 && (
                    <div className="text-center py-12">
                        <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <ShoppingBag size={40} />
                        </div>
                        <h3 className="font-bold text-gray-800">Belum ada pesanan</h3>
                        <button onClick={() => navigate('/')} className="mt-6 bg-orange-600 text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-orange-700 transition">
                            Pesan Sekarang
                        </button>
                    </div>
                )}

                {orders.map(order => {
                    const statusInfo = getStatusInfo(order.status, order.paymentStatus);
                    const isRejected = order.status === 'payment_rejected';

                    return (
                        <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition hover:shadow-md">

                            {/* HEADER CARD */}
                            <div className={`p-3 flex justify-between items-center ${statusInfo.color} border-b`}>
                                <div className="flex items-center gap-2">
                                    {statusInfo.icon}
                                    <span className="font-bold text-xs tracking-wide">{statusInfo.label}</span>
                                </div>
                                <span className="text-[10px] font-mono opacity-80 bg-white/50 px-1 rounded">{order.orderId}</span>
                            </div>

                            <div className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1">Tanggal Pesan</p>
                                        <p className="text-xs text-gray-600 font-medium">
                                            {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString('id-ID') : '-'}
                                        </p>
                                    </div>

                                    <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border ${order.diningOption === 'takeaway' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                                        {order.diningOption === 'takeaway' ? <ShoppingBag size={12} /> : <ChefHat size={12} />}
                                        {order.diningOption === 'takeaway' ? 'AMBIL SENDIRI' : 'DINE IN'}
                                    </div>
                                </div>

                                {/* LIST MENU */}
                                <div className="space-y-2 mb-4 bg-gray-50 p-3 rounded-lg">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-sm text-gray-700">
                                            <span className="line-clamp-1 w-3/4"><b>{item.qty}x</b> {item.name}</span>
                                            <span>Rp {(item.price * item.qty).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* TOTAL HARGA */}
                                <div className="flex justify-between items-center border-t pt-3 mb-2">
                                    <span className="text-sm text-gray-500">Total Bayar</span>
                                    <span className="font-bold text-lg text-orange-600">Rp {order.total?.toLocaleString()}</span>
                                </div>

                                {/* --- BAGIAN KHUSUS JIKA DITOLAK (RE-UPLOAD) --- */}
                                {isRejected && (
                                    <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 animate-in fade-in">
                                        <div className="flex items-start gap-3 mb-3">
                                            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                                            <div>
                                                <h4 className="font-bold text-red-700 text-sm">Pembayaran Ditolak Admin</h4>
                                                <p className="text-xs text-red-600 mt-1">{order.note || "Bukti tidak sesuai. Silakan upload ulang."}</p>
                                            </div>
                                        </div>

                                        {activeReuploadId === order.id ? (
                                            <div className="bg-white p-3 rounded-lg border border-red-100">
                                                {previewUrl && (
                                                    <div className="mb-3 text-center">
                                                        <img src={previewUrl} alt="Preview" className="h-32 mx-auto object-contain rounded border" />
                                                        <p className="text-[10px] text-green-600 font-bold mt-1">Foto terpilih</p>
                                                    </div>
                                                )}
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={cancelReupload}
                                                        className="flex-1 py-2 text-xs font-bold text-gray-500 bg-gray-100 rounded hover:bg-gray-200"
                                                    >
                                                        Batal
                                                    </button>
                                                    <button
                                                        onClick={() => handleReupload(order.id)}
                                                        disabled={uploadingId === order.id}
                                                        className="flex-1 py-2 text-xs font-bold text-white bg-red-600 rounded hover:bg-red-700 flex justify-center items-center gap-1"
                                                    >
                                                        {uploadingId === order.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                                        Kirim Ulang
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <label className="w-full bg-white border-2 border-dashed border-red-300 text-red-500 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer hover:bg-red-50 transition shadow-sm">
                                                <Upload size={14} /> Upload Bukti Baru
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handleFileSelect(e, order.id)}
                                                />
                                            </label>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default OrderHistory;