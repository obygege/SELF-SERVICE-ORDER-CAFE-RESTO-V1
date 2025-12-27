import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, ArrowLeft, BellRing, XCircle, Loader2, Upload, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const OrderHistory = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploadingId, setUploadingId] = useState(null);
    const statusRef = useRef({});
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
            const orderList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (!isFirstRun.current) {
                orderList.forEach(order => {
                    if (statusRef.current[order.id] && statusRef.current[order.id] !== order.status) {
                        audioRef.current.play().catch(() => { });
                        toast.success(`Update: Pesanan ${order.status.toUpperCase()}`, { position: 'top-center' });
                    }
                });
            }

            const currentStatuses = {};
            orderList.forEach(o => currentStatuses[o.id] = o.status);
            statusRef.current = currentStatuses;

            setOrders(orderList);
            setLoading(false);
            isFirstRun.current = false;
        }, (error) => {
            console.error(error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser?.uid]);

    const handleReupload = async (e, orderId) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingId(orderId);
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                await updateDoc(doc(db, "orders", orderId), {
                    proofImage: reader.result,
                    status: 'pending',
                    paymentStatus: 'unpaid',
                    note: 'Bukti diupload ulang'
                });
                toast.success("Bukti berhasil dikirim ulang!");
            } catch (error) {
                toast.error("Gagal upload");
            } finally {
                setUploadingId(null);
            }
        };
        reader.readAsDataURL(file);
    };

    const getStatusLabel = (s) => {
        const labels = { pending: 'Konfirmasi', cooking: 'Dimasak', ready: 'Siap', completed: 'Selesai', payment_rejected: 'Ditolak' };
        return labels[s] || s;
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            <header className="bg-white p-4 sticky top-0 z-30 shadow-sm flex items-center gap-4">
                <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={24} /></button>
                <h1 className="text-xl font-black uppercase tracking-tight">Riwayat</h1>
            </header>

            <div className="p-4 max-w-2xl mx-auto space-y-6">
                {loading ? <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-orange-600" size={40} /></div> :
                    orders.length === 0 ? <div className="text-center py-20 text-gray-400 font-bold uppercase"><ShoppingBag className="mx-auto mb-4" /> Kosong</div> :
                        orders.map((order) => (
                            <div key={order.id} className="bg-white rounded-[2rem] shadow-sm border overflow-hidden">
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">TRX: {order.orderId}</p>
                                            <h3 className="font-black text-xl text-slate-800">Meja {order.tableNumber}</h3>
                                        </div>
                                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border ${order.status === 'ready' ? 'bg-green-100 text-green-600 animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
                                            {getStatusLabel(order.status)}
                                        </span>
                                    </div>
                                    <div className="space-y-2 mb-6">
                                        {order.items?.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-xs font-bold uppercase text-slate-600">
                                                <span>{item.qty}x {item.name}</span>
                                                <span>Rp {(item.qty * item.price).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-end pt-5 border-t border-dashed">
                                        <div><p className="text-[9px] font-black text-gray-400 uppercase">Total</p><p className="text-xl font-black text-orange-600">Rp {order.total?.toLocaleString()}</p></div>
                                        <p className="text-[10px] font-bold text-gray-400">{order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString() : '-'}</p>
                                    </div>
                                </div>
                                {order.status === 'payment_rejected' && (
                                    <div className="bg-red-600 p-6 flex flex-col items-center gap-3">
                                        <p className="text-white font-black text-[10px] uppercase text-center leading-tight">Ditolak: {order.note}</p>
                                        <label className="bg-white text-red-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase cursor-pointer active:scale-95 transition-all">
                                            {uploadingId === order.id ? 'Mengupload...' : 'Upload Ulang Bukti'}
                                            <input type="file" accept="image/*" className="hidden" disabled={uploadingId === order.id} onChange={(e) => handleReupload(e, order.id)} />
                                        </label>
                                    </div>
                                )}
                            </div>
                        ))}
            </div>
        </div>
    );
};

export default OrderHistory;