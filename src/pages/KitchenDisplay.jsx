import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from '../context/AuthContext';
import { ChefHat, Clock, CheckCircle, PlayCircle, Printer, Volume2, X, Bell, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

const isDrinkCategory = (category) => {
    if (!category) return false;
    const lower = category.toLowerCase();
    return ['minuman', 'drink', 'coffee', 'kopi', 'tea', 'teh', 'ice', 'jus', 'juice', 'squash', 'latte', 'non-coffee', 'water', 'mineral', 'air'].some(k => lower.includes(k));
};

const KitchenReceipt = React.forwardRef(({ order }, ref) => {
    if (!order) return null;
    const myItems = order.items.filter(i => !isDrinkCategory(i.category));
    if (myItems.length === 0) return null;

    const dateObj = order.createdAt ? new Date(order.createdAt.seconds * 1000) : new Date();
    const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    return (
        <div ref={ref} className="bg-white text-black font-mono p-2 mx-auto" style={{ width: '58mm', fontSize: '12px' }}>
            <style media="print">{`@page { size: 58mm auto; margin: 0; } body { margin: 0; padding: 0; font-family: monospace; }`}</style>

            <div className="text-center border-b-2 border-black pb-2 mb-2">
                <h2 className="font-black text-lg uppercase tracking-tighter">ORDER DAPUR (FOOD)</h2>
                <div className="flex justify-between text-[10px] mt-1 px-1 font-bold">
                    <span>{dateStr}</span>
                    <span>{timeStr}</span>
                </div>
            </div>

            <div className="space-y-1 mb-2 px-1 text-[11px]">
                <div className="flex justify-between italic text-[10px]">
                    <span>Admin:</span>
                    <span className="font-bold uppercase">Staff Kitchen</span>
                </div>
                <div className="flex justify-between">
                    <span>Pelanggan:</span>
                    <span className="font-bold uppercase truncate max-w-[100px]">{order.customerName}</span>
                </div>
                <div className="text-center py-2 border-y border-black my-1">
                    <span className="text-2xl font-black">MEJA {order.tableNumber}</span>
                </div>
            </div>

            <div className="flex flex-col gap-3 mt-2 px-1">
                {myItems.map((item, i) => (
                    <div key={i} className="leading-tight border-b border-gray-200 pb-1 last:border-0">
                        <div className="flex items-start gap-2">
                            <span className="font-black text-xl">{item.qty}x</span>
                            <span className="font-bold text-[13px] uppercase">{item.name}</span>
                        </div>
                        {item.note && (
                            <div className="ml-6 text-[10px] bg-black text-white px-1 inline-block mt-1 font-bold uppercase">
                                * {item.note}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {order.note && (
                <div className="mt-3 p-1 border-2 border-black text-[10px] font-black uppercase text-center leading-none">
                    Catatan Order: {order.note}
                </div>
            )}

            <div className="mt-4 pt-2 border-t border-black text-center text-[9px] font-bold">
                ID: {order.orderId}
            </div>
        </div>
    );
});

const KitchenDisplay = () => {
    const { logout } = useAuth();
    const [orders, setOrders] = useState([]);
    const [printingOrder, setPrintingOrder] = useState(null);
    const [previewOrder, setPreviewOrder] = useState(null);
    const [lastProcessedId, setLastProcessedId] = useState(null);

    const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));
    const componentRef = useRef();

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        onAfterPrint: () => {
            setPrintingOrder(null);
        }
    });

    useEffect(() => {
        if (printingOrder) handlePrint();
    }, [printingOrder, handlePrint]);

    useEffect(() => {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(o =>
                    o.paymentStatus === 'paid' &&
                    o.status !== 'completed' &&
                    o.status !== 'payment_rejected' &&
                    o.items.some(i => !isDrinkCategory(i.category))
                );

            setOrders(list);

            const newest = list.find(o => o.status === 'pending');
            if (newest && newest.id !== lastProcessedId) {
                setLastProcessedId(newest.id);
                audioRef.current.play().catch(() => { });
                toast(`Pesanan Makanan Baru: Meja ${newest.tableNumber}`, {
                    icon: '👨‍🍳',
                    style: { borderRadius: '15px', background: '#e65100', color: '#fff', fontWeight: 'bold' }
                });
            }
        });
        return () => unsub();
    }, [lastProcessedId]);

    const updateStatus = async (id, newStatus) => {
        try {
            await updateDoc(doc(db, "orders", id), { status: newStatus });
            toast.success(newStatus === 'cooking' ? 'Sedang Dimasak...' : 'Pesanan Selesai!');
        } catch (error) {
            toast.error("Gagal update status");
        }
    };

    const handleLogout = async () => {
        if (window.confirm("Keluar dari sistem Kitchen?")) await logout();
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 font-sans">
            <div style={{ display: 'none' }}>
                <KitchenReceipt ref={componentRef} order={printingOrder || previewOrder} />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-3xl bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-200">
                        <ChefHat size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Kitchen Monitor</h1>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Live Realtime Order</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right mr-4 hidden md:block">
                        <p className="text-3xl font-black text-slate-900 leading-none">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Sistem Aktif</p>
                    </div>
                    <button onClick={handleLogout} className="w-14 h-14 flex items-center justify-center bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all duration-300 shadow-sm border border-red-100">
                        <LogOut size={24} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {orders.map(order => {
                    const myItems = order.items.filter(i => !isDrinkCategory(i.category));
                    const isCooking = order.status === 'cooking';
                    const isReady = order.status === 'ready';

                    return (
                        <div key={order.id} className={`flex flex-col rounded-[2.5rem] bg-white border-2 transition-all duration-500 shadow-sm ${isReady ? 'border-green-500 ring-4 ring-green-50' : isCooking ? 'border-orange-500 scale-[1.02] shadow-xl z-10' : 'border-slate-100'}`}>

                            <div className={`p-6 rounded-t-[2.3rem] flex justify-between items-center ${isReady ? 'bg-green-500 text-white' : isCooking ? 'bg-orange-500 text-white' : 'bg-slate-900 text-white'}`}>
                                <div>
                                    <h2 className="text-5xl font-black tracking-tighter leading-none">#{order.tableNumber}</h2>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-1 truncate max-w-[120px]">{order.customerName}</p>
                                </div>
                                <div className="text-right">
                                    <div className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-black mb-1">
                                        {new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <p className="text-[9px] font-black uppercase">{order.status}</p>
                                </div>
                            </div>

                            <div className="p-6 flex-1 space-y-4">
                                {myItems.map((item, idx) => (
                                    <div key={idx} className="flex gap-4 items-start border-b border-slate-50 pb-3 last:border-0">
                                        <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-slate-100 rounded-xl font-black text-xl text-slate-900">
                                            {item.qty}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-black text-slate-800 leading-tight uppercase text-sm tracking-tight">{item.name}</p>
                                            {item.note && (
                                                <div className="mt-1 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest inline-block">
                                                    {item.note}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {order.note && (
                                    <div className="mt-2 p-3 bg-slate-900 rounded-2xl">
                                        <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest mb-1">Catatan Pesanan:</p>
                                        <p className="text-white text-[10px] font-bold uppercase leading-tight">{order.note}</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 pt-0 space-y-3">
                                {order.status === 'pending' && (
                                    <button onClick={() => updateStatus(order.id, 'cooking')} className="w-full py-5 bg-slate-900 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3">
                                        <PlayCircle size={20} /> Mulai Masak
                                    </button>
                                )}

                                {isCooking && (
                                    <button onClick={() => updateStatus(order.id, 'ready')} className="w-full py-5 bg-green-500 hover:bg-green-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3">
                                        <CheckCircle size={20} /> Siap Diantar
                                    </button>
                                )}

                                {isReady && (
                                    <div className="w-full py-5 bg-green-100 text-green-600 font-black text-xs uppercase tracking-[0.2em] rounded-2xl border-2 border-green-200 flex items-center justify-center gap-3 animate-pulse">
                                        <Bell size={20} /> Menunggu Pickup
                                    </div>
                                )}

                                <button onClick={() => setPreviewOrder(order)} className="w-full py-3 bg-white text-slate-400 font-black text-[9px] uppercase tracking-widest rounded-xl border-2 border-slate-50 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                                    <Printer size={16} /> Preview Ticket
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {previewOrder && (
                <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-white rounded-[3rem] shadow-2xl p-8 w-full max-w-sm flex flex-col items-center">
                        <div className="flex justify-between items-center w-full mb-6">
                            <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest">Kitchen Ticket</h3>
                            <button onClick={() => setPreviewOrder(null)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors"><X size={24} /></button>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-200 mb-8 w-full flex justify-center overflow-y-auto max-h-[50vh]">
                            <KitchenReceipt order={previewOrder} />
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full">
                            <button onClick={() => setPreviewOrder(null)} className="py-4 rounded-2xl border-2 border-slate-100 font-black text-xs uppercase tracking-widest text-slate-400">Tutup</button>
                            <button onClick={() => { setPrintingOrder(previewOrder); setPreviewOrder(null); }} className="py-4 rounded-2xl bg-orange-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-200 flex items-center justify-center gap-2">
                                <Printer size={18} /> Print
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KitchenDisplay;