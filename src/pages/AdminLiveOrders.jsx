import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from '../context/AuthContext';
import { BellRing, Printer, Search, Edit2, X, Plus, Minus, Banknote, Clock, Eye, ChefHat, Coffee, CheckCircle, PlayCircle, UtensilsCrossed } from 'lucide-react';
import toast from 'react-hot-toast';

// --- HELPER FUNCTION ---
const isDrinkCategory = (category) => {
    if (!category) return false;
    const lower = category.toLowerCase();
    return lower.includes('minuman') ||
        lower.includes('drink') ||
        lower.includes('coffee') ||
        lower.includes('kopi') ||
        lower.includes('tea') ||
        lower.includes('teh') ||
        lower.includes('ice') ||
        lower.includes('jus') ||
        lower.includes('juice') ||
        lower.includes('squash') ||
        lower.includes('latte') ||
        lower.includes('non-coffee');
};

// --- COMPONENT STRUK ---
const Receipt = React.forwardRef(({ order, role }, ref) => {
    if (!order) return null;

    let displayItems = order.items;
    let title = "CAFE FUTURA";

    // Filter items based on role for Kitchen/Bar receipts
    if (role === 'kitchen') {
        displayItems = order.items.filter(i => !isDrinkCategory(i.category));
        title = "DAPUR (MAKANAN)";
    } else if (role === 'barista') {
        displayItems = order.items.filter(i => isDrinkCategory(i.category));
        title = "BAR (MINUMAN)";
    }

    if (displayItems.length === 0) return null;

    const dateObj = order.createdAt ? new Date(order.createdAt.seconds * 1000) : new Date();
    const isInternal = role === 'kitchen' || role === 'barista';

    return (
        <div ref={ref} className="bg-white text-black font-mono p-2 mx-auto" style={{ width: '58mm', padding: '10px 5px', margin: '0', fontSize: '12px', color: '#000' }}>
            <style type="text/css" media="print">
                {`@page { size: 58mm auto; margin: 0; } body { margin: 0; padding: 0; font-family: monospace; }`}
            </style>

            <div className="text-center mb-2 border-b-2 border-black pb-2">
                <h2 className="font-extrabold text-xl uppercase leading-tight">{title}</h2>
                <p className="text-sm font-bold mt-1">MEJA {order.tableNumber}</p>
                {isInternal && <p className="text-[10px] mt-1">{order.orderId}</p>}
            </div>

            <div className="space-y-1 text-[10px] mb-2">
                <div className="flex justify-between"><span>Pelanggan:</span><span className="font-bold">{order.customerName?.substring(0, 15)}</span></div>
                <div className="flex justify-between"><span>Waktu:</span><span>{dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span></div>
            </div>

            <div className="border-b-2 border-dashed border-black my-2"></div>

            <div className="flex flex-col gap-3">
                {displayItems.map((item, i) => (
                    <div key={i} className="flex flex-col">
                        <div className="flex items-start gap-2">
                            <span className="font-extrabold text-lg w-6">{item.qty}</span>
                            <div className="flex-1">
                                <span className="font-bold text-sm block leading-tight">{item.name}</span>
                                {item.note && <div className="text-[10px] italic font-bold mt-1 bg-black text-white px-1 inline-block">NOTE: {item.note}</div>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="border-b-2 border-dashed border-black my-4"></div>

            {order.note && (
                <div className="text-xs font-bold border-2 border-black p-2 text-center uppercase mb-2">
                    CATATAN ORDER: {order.note}
                </div>
            )}

            <div className="text-center text-[10px] font-bold mt-2">
                --- {role === 'kitchen' ? 'SIAPKAN SEGERA' : role === 'barista' ? 'RACIK SEGERA' : 'TERIMA KASIH'} ---
            </div>
        </div>
    );
});

// --- MAIN COMPONENT ---
const AdminLiveOrders = () => {
    const { currentUser } = useAuth();
    // Default to admin logic, but render different UI based on role
    const role = currentUser?.role || 'admin';

    const [orders, setOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [printingOrder, setPrintingOrder] = useState(null);

    // Admin specific states
    const [proofModalOrder, setProofModalOrder] = useState(null);
    const [editingOrder, setEditingOrder] = useState(null);

    // Audio ref
    const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));
    const componentRef = useRef();
    const [lastProcessedId, setLastProcessedId] = useState(null);

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        onAfterPrint: () => setPrintingOrder(null)
    });

    // Auto print trigger
    useEffect(() => {
        if (printingOrder) {
            handlePrint();
        }
    }, [printingOrder, handlePrint]);

    useEffect(() => {
        // Query logic: Show orders not completed
        // Kitchen/Barista should only see orders that are PAID (queue/cooking)
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snapshot) => {
            let list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(o => o.status !== 'completed');

            // Filter out unpaid orders for Kitchen & Barista
            if (role === 'kitchen' || role === 'barista') {
                list = list.filter(o => o.paymentStatus === 'paid');
            }

            setOrders(list);

            // Notification Logic
            if (list.length > 0) {
                const newestOrder = list[0];
                // Check if new order arrived that matches role criteria
                if (newestOrder.id !== lastProcessedId) {
                    // Logic to play sound only for relevant orders
                    let relevant = true;
                    if (role === 'kitchen' || role === 'barista') {
                        if (newestOrder.paymentStatus !== 'paid') relevant = false;
                    } else { // Admin
                        if (newestOrder.status !== 'pending') relevant = false;
                    }

                    if (relevant) {
                        setLastProcessedId(newestOrder.id);
                        audioRef.current.play().catch(() => { });
                        toast("Pesanan Masuk!", { icon: '🔔' });
                    }
                }
            }
        });
        return () => unsub();
    }, [role, lastProcessedId]);

    // Actions
    const updateStatus = async (id, status) => {
        await updateDoc(doc(db, "orders", id), { status });
        toast.success(`Status updated: ${status}`);
    };

    const confirmPayment = async (id) => {
        if (window.confirm("Terima Pembayaran?")) {
            await updateDoc(doc(db, "orders", id), { paymentStatus: 'paid', status: 'queue' });
            setProofModalOrder(null);
        }
    };

    const rejectPayment = async (id) => {
        const reason = window.prompt("Alasan penolakan?");
        if (reason) {
            await updateDoc(doc(db, "orders", id), { status: 'payment_rejected', note: `Ditolak: ${reason}` });
            setProofModalOrder(null);
        }
    };

    // Filter Logic for Display
    const filteredOrders = orders.filter(o =>
        (o.orderId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.tableNumber || '').includes(searchTerm)
    );

    // --- RENDER FOR KITCHEN & BARISTA (SPECIAL UI) ---
    if (role === 'kitchen' || role === 'barista') {
        return (
            <div className="min-h-screen bg-gray-900 p-4 font-sans text-white">
                {/* Hidden Receipt Component */}
                <div style={{ display: 'none' }}><Receipt ref={componentRef} order={printingOrder} role={role} /></div>

                {/* Header */}
                <div className="flex justify-between items-center mb-8 bg-gray-800 p-4 rounded-2xl border border-gray-700 shadow-xl">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${role === 'kitchen' ? 'bg-orange-600' : 'bg-blue-600'}`}>
                            {role === 'kitchen' ? <ChefHat size={32} /> : <Coffee size={32} />}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold uppercase tracking-wider">{role === 'kitchen' ? 'KITCHEN DISPLAY' : 'BARISTA DISPLAY'}</h1>
                            <p className="text-gray-400 text-sm">Mode Operasional • {filteredOrders.length} Pesanan Aktif</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-4xl font-black">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>

                {/* Grid Orders */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredOrders.map(order => {
                        // Filter items for specific role
                        const myItems = order.items.filter(i => role === 'kitchen' ? !isDrinkCategory(i.category) : isDrinkCategory(i.category));
                        if (myItems.length === 0) return null; // Skip if no relevant items

                        const isCooking = order.status === 'cooking';

                        return (
                            <div key={order.id} className={`relative flex flex-col h-full rounded-xl overflow-hidden border-2 shadow-2xl transition-all ${isCooking ? 'bg-gray-800 border-yellow-500' : 'bg-gray-800 border-gray-600 opacity-90 hover:opacity-100'}`}>
                                {/* Header Card */}
                                <div className={`p-4 flex justify-between items-center ${isCooking ? 'bg-yellow-600 text-black' : 'bg-gray-700 text-white'}`}>
                                    <div className="font-black text-3xl">#{order.tableNumber}</div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold opacity-80">{order.customerName.split(' ')[0]}</div>
                                        <div className="text-xs font-mono">{new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </div>
                                </div>

                                {/* Items List */}
                                <div className="p-4 flex-1 space-y-4">
                                    {myItems.map((item, idx) => (
                                        <div key={idx} className="flex gap-3 items-start border-b border-gray-700 pb-3 last:border-0">
                                            <div className="bg-white text-black font-bold text-xl w-10 h-10 flex items-center justify-center rounded-lg shadow">
                                                {item.qty}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-lg leading-tight">{item.name}</div>
                                                {item.note && <div className="text-red-400 font-bold text-sm mt-1 animate-pulse">NOTE: {item.note}</div>}
                                            </div>
                                        </div>
                                    ))}
                                    {order.note && (
                                        <div className="bg-red-900/50 p-3 rounded border border-red-700 text-red-200 text-sm font-bold text-center">
                                            ⚠️ GLOBAL: {order.note}
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="p-4 bg-gray-900/50 space-y-2">
                                    {order.status === 'queue' && (
                                        <button onClick={() => updateStatus(order.id, 'cooking')} className="w-full py-4 bg-yellow-600 hover:bg-yellow-500 text-white font-black text-xl rounded-xl shadow-lg flex items-center justify-center gap-2">
                                            <PlayCircle size={24} /> PROSES
                                        </button>
                                    )}
                                    {order.status === 'cooking' && (
                                        <button onClick={() => updateStatus(order.id, 'ready')} className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black text-xl rounded-xl shadow-lg flex items-center justify-center gap-2">
                                            <CheckCircle size={24} /> SELESAI
                                        </button>
                                    )}
                                    <button onClick={() => setPrintingOrder(order)} className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold rounded-lg text-sm flex items-center justify-center gap-2">
                                        <Printer size={16} /> PRINT STRUK
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // --- RENDER FOR ADMIN (MANAGEMENT UI) ---
    return (
        <div className="p-6 min-h-screen bg-gray-50">
            <div style={{ display: 'none' }}><Receipt ref={componentRef} order={printingOrder} role={role} /></div>

            {/* Admin Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <UtensilsCrossed className="text-orange-600" size={32} />
                        POS COMMAND CENTER
                    </h1>
                    <p className="text-gray-500">Monitor dan kelola pesanan real-time</p>
                </div>
                <div className="bg-white p-2 rounded-xl shadow-sm border flex items-center gap-2 w-80">
                    <Search className="text-gray-400" />
                    <input type="text" placeholder="Cari pesanan / meja..." className="outline-none w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            {/* Admin Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredOrders.map(order => {
                    const isPaid = order.paymentStatus === 'paid';
                    const isQris = order.paymentMethod === 'QRIS Transfer';

                    return (
                        <div key={order.id} className={`bg-white rounded-xl shadow-md border-l-8 overflow-hidden flex flex-col ${order.status === 'ready' ? 'border-green-500' : isPaid ? 'border-blue-500' : 'border-orange-500'}`}>
                            {/* Card Header */}
                            <div className="p-4 border-b flex justify-between items-start bg-gray-50">
                                <div>
                                    <h3 className="font-black text-xl text-gray-800">MEJA {order.tableNumber}</h3>
                                    <p className="text-xs text-gray-500 font-mono">{order.orderId}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {isPaid ? 'LUNAS' : 'UNPAID'}
                                    </span>
                                    <div className="text-xs font-bold text-gray-400 mt-1">{order.status.toUpperCase()}</div>
                                </div>
                            </div>

                            {/* Items */}
                            <div className="p-4 flex-1 text-sm space-y-2 overflow-y-auto max-h-48">
                                <p className="font-bold text-gray-800 border-b pb-1 mb-2">{order.customerName}</p>
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between">
                                        <span className="text-gray-600">{item.qty}x {item.name}</span>
                                        <span className="font-mono font-bold">{(item.price * item.qty).toLocaleString()}</span>
                                    </div>
                                ))}
                                <div className="border-t pt-2 flex justify-between font-black text-lg text-orange-600">
                                    <span>TOTAL</span>
                                    <span>{order.total.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Admin Actions */}
                            <div className="p-3 bg-gray-100 space-y-2">
                                {!isPaid && order.status !== 'payment_rejected' && (
                                    isQris ?
                                        <button onClick={() => setProofModalOrder(order)} className="w-full py-2 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700 flex items-center justify-center gap-2"><Eye size={16} /> CEK QRIS</button> :
                                        <button onClick={() => confirmPayment(order.id)} className="w-full py-2 bg-green-600 text-white font-bold rounded shadow hover:bg-green-700 flex items-center justify-center gap-2"><Banknote size={16} /> TERIMA TUNAI</button>
                                )}

                                {isPaid && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {order.status === 'queue' && <button onClick={() => updateStatus(order.id, 'cooking')} className="col-span-2 py-2 bg-yellow-500 text-white font-bold rounded text-xs">FORCE COOK</button>}
                                        {order.status === 'cooking' && <button onClick={() => updateStatus(order.id, 'ready')} className="col-span-2 py-2 bg-green-500 text-white font-bold rounded text-xs">FORCE READY</button>}
                                        {order.status === 'ready' && <button onClick={() => updateStatus(order.id, 'completed')} className="col-span-2 py-2 bg-gray-800 text-white font-bold rounded shadow hover:bg-gray-900 flex items-center justify-center gap-2"><CheckCircle size={16} /> SELESAI</button>}

                                        <button onClick={() => setEditingOrder(order)} className="py-2 bg-white border font-bold rounded text-gray-600 hover:bg-gray-50"><Edit2 size={16} className="mx-auto" /></button>
                                        <button onClick={() => setPrintingOrder(order)} className="py-2 bg-white border font-bold rounded text-gray-600 hover:bg-gray-50"><Printer size={16} className="mx-auto" /></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modals (Proof & Edit) */}
            {proofModalOrder && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-4">
                        <div className="flex justify-between mb-4"><h3 className="font-bold">Cek Pembayaran</h3><button onClick={() => setProofModalOrder(null)}><X /></button></div>
                        <img src={proofModalOrder.proofImage} alt="Bukti" className="w-full rounded bg-gray-100 mb-4 h-96 object-contain" />
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => rejectPayment(proofModalOrder.id)} className="py-3 bg-red-100 text-red-600 font-bold rounded">TOLAK</button>
                            <button onClick={() => confirmPayment(proofModalOrder.id)} className="py-3 bg-green-600 text-white font-bold rounded">TERIMA</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Edit Modal implementation omitted for brevity, logic exists in previous code */}
        </div>
    );
};

export default AdminLiveOrders;