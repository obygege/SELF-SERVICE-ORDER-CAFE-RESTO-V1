import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from '../context/AuthContext';
import { Coffee, Clock, CheckCircle, PlayCircle, Printer, Volume2, X, Bell, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

const isDrinkCategory = (category) => {
    if (!category) return false;
    const lower = category.toLowerCase();
    return ['minuman', 'drink', 'coffee', 'kopi', 'tea', 'teh', 'ice', 'jus', 'juice', 'squash', 'latte', 'non-coffee', 'water', 'mineral', 'air'].some(k => lower.includes(k));
};

const BaristaReceipt = React.forwardRef(({ order }, ref) => {
    if (!order) return null;

    const myItems = order.items.filter(i => isDrinkCategory(i.category));

    if (myItems.length === 0) return null;

    return (
        <div ref={ref} className="bg-white text-black font-mono p-4" style={{ width: '58mm', fontSize: '12px' }}>
            <style media="print">{`@page { size: 58mm auto; margin: 0; } body { margin: 0; padding: 0; font-family: monospace; }`}</style>
            <div className="text-center border-b-2 border-black pb-2 mb-2">
                <h2 className="font-black text-xl">BAR (DRINK)</h2>
                <p className="text-3xl font-black my-2">MEJA {order.tableNumber}</p>
                <p className="text-sm font-bold uppercase border-t border-black pt-1">{order.customerName}</p>
            </div>
            <div className="flex flex-col gap-4 mt-4">
                {myItems.map((item, i) => (
                    <div key={i} className="leading-tight">
                        <div className="flex items-start gap-2">
                            <span className="font-black text-xl">{item.qty}</span>
                            <span className="font-bold text-md">{item.name}</span>
                        </div>
                        {item.note && <div className="ml-6 text-[10px] bg-black text-white px-1 inline-block mt-1 font-bold">{item.note}</div>}
                    </div>
                ))}
            </div>
            <div className="border-t-2 border-black mt-6 pt-2 text-center text-[10px]">
                {order.orderId} • {new Date().toLocaleTimeString('id-ID')}
            </div>
        </div>
    );
});

const BaristaDisplay = () => {
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
            setPreviewOrder(null);
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
                    o.status !== 'pending' &&
                    o.status !== 'payment_rejected'
                );

            setOrders(list);

            const newest = list.find(o => o.status === 'queue');
            if (newest && newest.id !== lastProcessedId) {
                const hasMyItems = newest.items.some(i => isDrinkCategory(i.category));

                if (hasMyItems) {
                    setLastProcessedId(newest.id);
                    audioRef.current.play().catch(e => console.log("Audio play failed", e));
                    toast(`Order Minuman Baru Meja ${newest.tableNumber}!`, { icon: '🔔', style: { borderRadius: '10px', background: '#0284c7', color: '#fff' } });
                }
            }
        });
        return () => unsub();
    }, [lastProcessedId]);

    const updateStatus = async (id, status) => {
        await updateDoc(doc(db, "orders", id), { status });
        toast.success(status === 'cooking' ? 'Sedang Diracik...' : 'Minuman Siap Diantar!');
    };

    const handleLogout = async () => {
        if (window.confirm("Keluar dari Barista Monitor?")) {
            await logout();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans p-4">
            <div style={{ display: 'none' }}>
                <BaristaReceipt ref={componentRef} order={printingOrder || previewOrder} />
            </div>

            <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                        <Coffee size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-wider text-gray-800">
                            BARISTA MONITOR
                        </h1>
                        <p className="text-gray-500 text-sm font-medium">
                            {orders.filter(o => o.items.some(i => isDrinkCategory(i.category))).length} Pesanan Aktif • <span className="text-green-600 font-bold">Live Realtime</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                        <p className="text-4xl font-black text-gray-800">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <button onClick={handleLogout} className="bg-red-50 text-red-600 p-3 rounded-xl hover:bg-red-100 transition-colors border border-red-100" title="Keluar">
                        <LogOut size={24} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {orders.map(order => {
                    const myItems = order.items.filter(i => isDrinkCategory(i.category));

                    if (myItems.length === 0) return null;

                    const isCooking = order.status === 'cooking';
                    const isReady = order.status === 'ready';

                    return (
                        <div key={order.id} className={`flex flex-col rounded-xl overflow-hidden shadow-lg border-2 transition-all duration-300 ${isReady ? 'border-green-500 bg-green-50' : isCooking ? 'border-blue-400 bg-white scale-105 z-10 shadow-xl' : 'border-gray-200 bg-white'}`}>

                            <div className={`p-4 flex justify-between items-center ${isReady ? 'bg-green-100 text-green-800' : isCooking ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                                <div>
                                    <h2 className="text-4xl font-black">#{order.tableNumber}</h2>
                                    <p className="text-[10px] font-bold opacity-80 uppercase mt-1">{order.customerName}</p>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1 font-mono font-bold bg-white/50 px-2 py-1 rounded text-xs">
                                        <Clock size={12} />
                                        {new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="text-[10px] font-black uppercase mt-1">
                                        {isReady ? 'SIAP SAJI' : isCooking ? 'DIRACIK' : 'ANTRIAN'}
                                    </div>
                                </div>
                            </div>

                            <div className={`p-4 flex-1 space-y-4 overflow-y-auto max-h-[300px] ${isReady ? 'bg-green-50' : 'bg-white'}`}>
                                {myItems.map((item, idx) => (
                                    <div key={idx} className="flex gap-3 items-start border-b border-gray-100 pb-3 last:border-0">
                                        <div className={`w-10 h-10 flex items-center justify-center rounded-lg font-black text-xl shadow-sm border ${isReady ? 'bg-green-200 border-green-300 text-green-800' : isCooking ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                                            {item.qty}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-lg leading-tight text-gray-800">{item.name}</p>
                                            {item.note && (
                                                <div className="mt-1 bg-red-50 border border-red-100 text-red-600 text-xs px-2 py-1 rounded font-bold inline-flex items-center gap-1">
                                                    <Volume2 size={10} /> {item.note}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {order.note && (
                                    <div className="bg-red-50 border-l-4 border-red-400 p-3 text-red-600 text-sm font-bold">
                                        CATATAN: {order.note}
                                    </div>
                                )}
                            </div>

                            <div className="p-3 bg-gray-50 border-t border-gray-100 grid gap-2">
                                {order.status === 'queue' && (
                                    <button onClick={() => updateStatus(order.id, 'cooking')} className="w-full py-4 bg-gray-800 hover:bg-blue-600 text-white font-bold text-xl rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-gray-200">
                                        <PlayCircle size={24} /> MULAI RACIK
                                    </button>
                                )}

                                {order.status === 'cooking' && (
                                    <button onClick={() => updateStatus(order.id, 'ready')} className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-bold text-xl rounded-lg shadow-lg shadow-green-200 flex items-center justify-center gap-2 transition-transform active:scale-95">
                                        <CheckCircle size={24} /> SIAP DIANTAR
                                    </button>
                                )}

                                {order.status === 'ready' && (
                                    <div className="w-full py-4 bg-green-100 text-green-700 font-bold text-center rounded-lg border border-green-200 flex items-center justify-center gap-2 animate-pulse">
                                        <Bell size={20} /> MENUNGGU PICKUP
                                    </div>
                                )}

                                <button onClick={() => setPreviewOrder(order)} className="w-full py-2 bg-white hover:bg-gray-50 text-gray-500 font-bold text-xs rounded border border-gray-200 flex items-center justify-center gap-2 transition-colors">
                                    <Printer size={14} /> LIHAT STRUK
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {previewOrder && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm flex flex-col items-center animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center w-full mb-4 border-b pb-2">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Printer size={20} /> Preview Struk Bar</h3>
                            <button onClick={() => setPreviewOrder(null)} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
                        </div>

                        <div className="bg-gray-100 p-4 rounded border border-gray-200 mb-4 w-full flex justify-center shadow-inner overflow-y-auto max-h-[60vh]">
                            <BaristaReceipt order={previewOrder} />
                        </div>

                        <div className="grid grid-cols-2 gap-3 w-full">
                            <button onClick={() => setPreviewOrder(null)} className="py-3 rounded-lg border border-gray-300 font-bold text-gray-600 hover:bg-gray-50">
                                Batal
                            </button>
                            <button onClick={() => setPrintingOrder(previewOrder)} className="py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2">
                                <Printer size={18} /> Cetak
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BaristaDisplay;