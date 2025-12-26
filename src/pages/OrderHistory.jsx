import React, { useState, useEffect, useRef } from 'react';
import { db, requestForToken, onMessageListener } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Clock, ShoppingBag, ArrowLeft, BellRing, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const OrderHistory = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [prevStatuses, setPrevStatuses] = useState({});
    const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

    useEffect(() => {
        if (!currentUser) return;

        const setupNotifications = async () => {
            try {
                const token = await requestForToken();
                if (token) {
                    await updateDoc(doc(db, "users", currentUser.uid), {
                        fcmToken: token
                    });
                }
            } catch (err) {
                console.warn("Push notifications disabled");
            }
        };
        setupNotifications();

        // Listener pesan masuk
        const startMessageListener = async () => {
            try {
                const payload = await onMessageListener();
                toast.success(`${payload.notification.title}: ${payload.notification.body}`, {
                    icon: '🔔',
                    duration: 5000
                });
                audioRef.current.play().catch(() => { });
            } catch (err) {
                console.log("Not support messaging");
            }
        };
        startMessageListener();

    }, [currentUser]);

    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, "orders"),
            where("userId", "==", currentUser.uid),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const orderList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            orderList.forEach(order => {
                const oldStatus = prevStatuses[order.id];
                if (oldStatus && oldStatus !== order.status) {
                    handleLocalNotification(order);
                }
            });

            const newStatuses = {};
            orderList.forEach(o => { newStatuses[o.id] = o.status; });
            setPrevStatuses(newStatuses);
            setOrders(orderList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser, prevStatuses]);

    const handleLocalNotification = (order) => {
        audioRef.current.play().catch(() => { });
        let msg = "";
        if (order.status === 'cooking') msg = "Pesanan sedang dimasak!";
        if (order.status === 'ready') msg = "Pesanan siap diantar!";
        if (order.status === 'payment_rejected') msg = "Pembayaran ditolak!";

        if (msg) toast.success(msg, { duration: 5000 });
    };

    const getStatusStyles = (status) => {
        switch (status) {
            case 'pending': return 'bg-gray-100 text-gray-500';
            case 'queue': return 'bg-blue-100 text-blue-600';
            case 'cooking': return 'bg-orange-100 text-orange-600';
            case 'ready': return 'bg-green-100 text-green-600 animate-pulse';
            case 'completed': return 'bg-green-600 text-white';
            case 'payment_rejected': return 'bg-red-600 text-white';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-white p-4 sticky top-0 z-30 shadow-sm flex items-center gap-4">
                <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-black">Status Pesanan</h1>
            </header>

            <div className="p-4 max-w-2xl mx-auto space-y-4">
                {loading ? (
                    <div className="text-center py-20 font-bold text-gray-400">Memuat...</div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                        <ShoppingBag size={64} className="mx-auto text-gray-100 mb-4" />
                        <p className="text-gray-400 font-bold">Belum ada pesanan.</p>
                    </div>
                ) : (
                    orders.map((order) => (
                        <div key={order.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-tighter">ID: {order.orderId}</p>
                                        <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">Meja {order.tableNumber}</h3>
                                    </div>
                                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${getStatusStyles(order.status)}`}>
                                        {order.status}
                                    </span>
                                </div>
                                <div className="space-y-2 mb-4">
                                    {order.items?.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-sm font-bold bg-gray-50 p-2 rounded-xl">
                                            <span>{item.qty}x {item.name}</span>
                                            <span className="text-gray-400">Rp {(item.qty * item.price).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-dashed">
                                    <p className="text-lg font-black text-orange-600">Rp {order.total?.toLocaleString()}</p>
                                    <p className="text-[10px] font-bold text-gray-400">{order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString() : '-'}</p>
                                </div>
                            </div>
                            {order.status === 'ready' && (
                                <div className="bg-green-500 text-white p-2 text-center text-[10px] font-black uppercase animate-pulse flex items-center justify-center gap-2">
                                    <BellRing size={14} /> Pesanan diantar ke meja!
                                </div>
                            )}
                            {order.status === 'payment_rejected' && (
                                <div className="bg-red-600 text-white p-2 text-center text-[10px] font-black uppercase flex items-center justify-center gap-2">
                                    <XCircle size={14} /> Pembayaran Ditolak!
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