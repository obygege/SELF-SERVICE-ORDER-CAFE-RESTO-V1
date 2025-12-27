import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { ChefHat, CheckCircle, PlayCircle, Printer, X, Bell, LogOut, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const isDrinkCategory = (category) => {
    if (!category) return false;
    const lower = category.toLowerCase();
    return ['minuman', 'drink', 'coffee', 'kopi', 'tea', 'teh', 'ice', 'jus', 'juice', 'squash', 'latte', 'non-coffee', 'water', 'mineral', 'air'].some(k => lower.includes(k));
};

const KitchenDisplay = () => {
    const { logout } = useAuth();
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [lastProcessedId, setLastProcessedId] = useState(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const [previewOrder, setPreviewOrder] = useState(null);

    const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

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
                toast(`Pesanan Baru: Meja ${newest.tableNumber}`, {
                    icon: '👨‍🍳',
                    style: { borderRadius: '15px', background: '#e65100', color: '#fff', fontWeight: 'bold' }
                });
            }
        });
        return () => unsub();
    }, [lastProcessedId]);

    const handleNativePrint = (order) => {
        setSelectedOrder(order);
        setIsPrinting(true);
        setPreviewOrder(null);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
            setSelectedOrder(null);
        }, 500);
    };

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
        <div className="min-h-screen bg-slate-50 p-4 font-sans pb-20">
            <style>
                {`
                @media print {
                    body * { visibility: hidden; }
                    #kitchen-print-receipt, #kitchen-print-receipt * { visibility: visible; }
                    #kitchen-print-receipt {
                        position: absolute;
                        left: 0;
                        right: 0;
                        top: 0;
                        margin: 0 auto !important;
                        width: 46mm;
                        padding: 0;
                        background: white;
                        display: block !important;
                    }
                    @page { 
                        size: 58mm auto; 
                        margin: 0; 
                    }
                    html, body { height: auto; overflow: visible; }
                }
                `}
            </style>

            <div id="kitchen-print-receipt" className="hidden print:block bg-white text-black font-mono" style={{ width: '46mm', margin: '0 auto', padding: '5px', fontSize: '11px' }}>
                {selectedOrder && (
                    <div className="flex flex-col w-full text-center">
                        <div style={{ borderBottom: '1px solid black', paddingBottom: '2mm', marginBottom: '2mm', marginTop: '2mm' }}>
                            <h2 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0', textTransform: 'uppercase' }}>Dapur (Food)</h2>
                            <p style={{ fontSize: '8px', margin: '0', marginTop: '1mm' }}>
                                {selectedOrder.createdAt ? new Date(selectedOrder.createdAt.seconds * 1000).toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                            </p>
                        </div>

                        <div style={{ fontSize: '10px', textAlign: 'left', marginBottom: '2mm' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Admin:</span><span style={{ fontWeight: 'bold' }}>{selectedOrder.verifiedBy || 'Admin'}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Cust:</span><span style={{ fontWeight: 'bold' }}>{selectedOrder.customerName}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Trx:</span><span>{selectedOrder.orderId}</span></div>
                        </div>

                        <div style={{ borderY: '1px solid black', padding: '2mm 0', margin: '2mm 0', textAlign: 'center' }}>
                            <span style={{ fontSize: '20px', fontWeight: '900' }}>MEJA {selectedOrder.tableNumber}</span>
                        </div>

                        <div style={{ width: '100%', textAlign: 'left' }}>
                            {selectedOrder.items.filter(i => !isDrinkCategory(i.category)).map((item, i) => (
                                <div key={i} style={{ marginBottom: '3mm', borderBottom: '1px solid #eee', paddingBottom: '1mm' }}>
                                    <div style={{ display: 'flex', gap: '3mm', alignItems: 'start' }}>
                                        <span style={{ fontWeight: '900', fontSize: '16px' }}>{item.qty}x</span>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase' }}>{item.name}</span>
                                            {item.note && <span style={{ fontSize: '10px', fontStyle: 'italic', color: '#333' }}>* {item.note}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ textAlign: 'center', marginTop: '4mm', fontSize: '9px', borderTop: '1px solid black', paddingTop: '2mm' }}>
                            <p style={{ margin: '0', fontWeight: 'bold' }}>SILAKAN SEGERA DIPROSES</p>
                            {selectedOrder.note && <p style={{ margin: '1mm 0 0 0', fontSize: '9px', fontWeight: 'bold' }}>Catatan Order: {selectedOrder.note}</p>}
                        </div>
                        <div style={{ height: '10mm' }}></div>
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 no-print">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-3xl bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-200">
                        <ChefHat size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">MONITORING DAPUR</h1>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Pesanan Masuk Instan</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right mr-4 hidden md:block">
                        <p className="text-3xl font-black text-slate-900 leading-none">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Sistem Aktif</p>
                    </div>
                    <button onClick={handleLogout} className="w-14 h-14 flex items-center justify-center bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all duration-300 border border-red-100">
                        <LogOut size={24} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 no-print">
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
                                        <Bell size={20} /> Sudah Diantar
                                    </div>
                                )}
                                <button
                                    onClick={() => setPreviewOrder(order)}
                                    className="w-full py-3 bg-white text-slate-400 font-black text-[9px] uppercase tracking-widest rounded-xl border-2 border-slate-50 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <Printer size={16} /> Preview Ticket
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {previewOrder && (
                <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-4 backdrop-blur-md no-print">
                    <div className="bg-white rounded-[3rem] shadow-2xl p-8 w-full max-w-sm flex flex-col items-center max-h-[90vh] overflow-y-auto relative">
                        <div className="w-full flex justify-between items-center mb-6">
                            <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest">Kitchen Ticket Preview</h3>
                            <button onClick={() => setPreviewOrder(null)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors"><X size={24} /></button>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-200 mb-8 w-full">
                            <div className="bg-white p-4 shadow-sm font-mono text-[10px] w-full text-black">
                                <div className="text-center border-b border-black pb-2 mb-2 uppercase font-bold text-sm">Dapur (Food)</div>
                                <div className="text-[8px] text-center mb-2 uppercase">
                                    {previewOrder.createdAt ? new Date(previewOrder.createdAt.seconds * 1000).toLocaleString('id-ID') : ''}
                                </div>
                                <div className="flex justify-between mb-1"><span>Pelanggan:</span><span className="font-bold uppercase">{previewOrder.customerName}</span></div>
                                <div className="flex justify-between font-bold text-lg mb-2 border-y border-black py-2"><span>MEJA:</span><span>{previewOrder.tableNumber}</span></div>
                                {previewOrder.items.filter(i => !isDrinkCategory(i.category)).map((item, i) => (
                                    <div key={i} className="flex gap-2 mb-2 border-b border-gray-100 pb-1">
                                        <span className="font-black text-sm">{item.qty}x</span>
                                        <div className="flex flex-col">
                                            <span className="font-bold uppercase">{item.name}</span>
                                            {item.note && <span className="text-[9px] italic text-red-600 font-bold">* {item.note}</span>}
                                        </div>
                                    </div>
                                ))}
                                {previewOrder.note && (
                                    <div className="mt-2 text-center text-[9px] font-bold border-t border-black pt-2">
                                        Catatan Order: {previewOrder.note}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 w-full">
                            <button onClick={() => setPreviewOrder(null)} className="py-4 rounded-2xl border-2 border-slate-100 font-black text-xs uppercase tracking-widest text-slate-400">Tutup</button>
                            <button
                                onClick={() => handleNativePrint(previewOrder)}
                                disabled={isPrinting}
                                className="py-4 rounded-2xl bg-orange-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-200 flex items-center justify-center gap-2"
                            >
                                {isPrinting ? <Loader2 className="animate-spin" size={18} /> : <Printer size={18} />} Print
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KitchenDisplay;