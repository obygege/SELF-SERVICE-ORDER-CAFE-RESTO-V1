import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from '../context/AuthContext';
import { ChefHat, BellRing, Printer, Search, Edit2, X, Plus, Minus, Banknote, AlertCircle, Clock, Coffee, Eye, XCircle, RefreshCw, Download, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const Receipt = React.forwardRef(({ order, role, adminName }, ref) => {
    if (!order) return null;

    const displayItems = role === 'kitchen' ? order.items.filter(i => i.category === 'food') :
        role === 'barista' ? order.items.filter(i => i.category === 'drink') :
            order.items;

    if (displayItems.length === 0) return null;

    const isPaid = order.paymentStatus === 'paid';
    const dateObj = order.createdAt ? new Date(order.createdAt.seconds * 1000) : new Date();

    const fullDateTime = dateObj.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    const isKitchenOrBar = role === 'kitchen' || role === 'barista';

    return (
        <div ref={ref} className="bg-white text-black font-mono p-2 mx-auto" style={{ width: '58mm', padding: '10px 5px', margin: '0', fontSize: '10px', color: '#000' }}>
            <style type="text/css" media="print">
                {`@page { size: 58mm auto; margin: 0; } body { margin: 0; padding: 0; font-family: monospace; } .no-print { display: none !important; }`}
            </style>

            <div className="text-center mb-2 flex flex-col items-center">
                <img
                    src="/assets/logo.png"
                    alt="LOGO"
                    style={{ height: '45px', width: '45px', objectFit: 'contain', marginBottom: '5px', filter: 'grayscale(100%)' }}
                    onError={(e) => e.target.style.display = 'none'}
                />
                <h2 className="font-extrabold text-lg uppercase leading-none mb-1">TAKI COFFEE & EATERY</h2>
                <div className="border-t border-black w-full my-1"></div>
                <div className="text-[7px] leading-tight uppercase">
                    <p>Jl. Taman Kenten, Duku, Kec. Ilir Tim. II</p>
                    <p>Kota Palembang, Sumatera Selatan 30114</p>
                    <p>Email: cafetaki@gmail.com</p>
                    <p>WA: 0812-3456-7890</p>
                </div>
                <div className="border-t border-black w-full my-1"></div>
                <p className="text-[8px] uppercase">{fullDateTime}</p>
            </div>

            <div className="space-y-0.5 text-[9px] mb-2">
                <div className="flex justify-between"><span>Admin:</span><span className="font-bold uppercase">{adminName || 'Staff'}</span></div>
                <div className="flex justify-between"><span>Pelanggan:</span><span className="font-bold uppercase">{order.customerName?.substring(0, 15)}</span></div>
                <div className="flex justify-between"><span>No. Trx:</span><span>{order.orderId}</span></div>
                <div className="flex justify-between mt-1"><span>Meja:</span><span className="font-extrabold text-[12px]">MEJA {order.tableNumber}</span></div>
            </div>

            <div className="border-b border-black border-dashed my-2"></div>

            <div className="flex flex-col gap-1 text-[9px]">
                {displayItems.map((item, i) => (
                    <div key={i} className="flex flex-col">
                        <div className="font-bold uppercase">{item.name}</div>
                        <div className="flex justify-between pl-2 italic">
                            <span>{item.qty} x {item.price.toLocaleString('id-ID')}</span>
                            <span>{(item.price * item.qty).toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="border-b border-black border-dashed my-2"></div>

            {!isKitchenOrBar && (
                <>
                    <div className="space-y-0.5 font-bold text-[10px]">
                        <div className="flex justify-between"><span>Subtotal</span><span>{order.subTotal?.toLocaleString('id-ID')}</span></div>
                        {order.uniqueCode > 0 && (
                            <div className="flex justify-between text-[9px]"><span>Kode Unik</span><span>{order.uniqueCode}</span></div>
                        )}
                        <div className="flex justify-between text-sm mt-1 pt-1 border-t border-black"><span>TOTAL</span><span>Rp {order.total?.toLocaleString('id-ID')}</span></div>
                    </div>
                    <div className="text-center mt-3 text-[10px] font-bold border border-black p-1 uppercase">
                        {isPaid ? 'Lunas / Paid' : 'Belum Bayar'}
                    </div>
                </>
            )}

            {order.note && (
                <div className="text-[9px] font-bold border border-black p-1 mt-2 text-center uppercase">
                    Catatan: {order.note}
                </div>
            )}

            <div className="text-center mt-4 text-[8px] uppercase italic">
                <p>Terima kasih telah berkunjung</p>
                <p className="mt-1">Taki Coffee & Eatery</p>
            </div>
        </div>
    );
});

const AdminLiveOrders = () => {
    const { currentUser } = useAuth();
    const role = currentUser?.role || 'admin';
    const adminName = currentUser?.displayName || 'Admin';

    const [orders, setOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [autoPrintOrder, setAutoPrintOrder] = useState(null);
    const [previewOrder, setPreviewOrder] = useState(null);
    const [proofModalOrder, setProofModalOrder] = useState(null);
    const [editingOrder, setEditingOrder] = useState(null);

    const [lastProcessedId, setLastProcessedId] = useState(null);

    const componentRef = useRef();
    const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `Struk-${autoPrintOrder?.orderId || previewOrder?.orderId}`,
        onAfterPrint: () => toast.success("Print Berhasil")
    });

    useEffect(() => {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snapshot) => {
            let list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(o => o.status !== 'completed');

            if (role === 'kitchen') {
                list = list.filter(o => o.items.some(i => i.category === 'food'));
            } else if (role === 'barista') {
                list = list.filter(o => o.items.some(i => i.category === 'drink'));
            }

            setOrders(list);

            if (list.length > 0) {
                const newestOrder = list[0];
                if (newestOrder.id !== lastProcessedId && newestOrder.status === 'pending') {
                    setLastProcessedId(newestOrder.id);
                    audioRef.current.play().catch(() => { });
                    toast("Pesanan Baru Masuk!", { icon: '🔔', duration: 4000 });
                    setAutoPrintOrder(newestOrder);
                }
            }
        });
        return () => unsub();
    }, [role, lastProcessedId]);

    const confirmPayment = async (id) => {
        if (window.confirm("Yakin konfirmasi pembayaran ini Valid & Lunas?")) {
            await updateDoc(doc(db, "orders", id), { paymentStatus: 'paid' });
            setProofModalOrder(null);
            toast.success("Pembayaran Lunas");
        }
    };

    const rejectPayment = async (id) => {
        const reason = window.prompt("Masukkan alasan penolakan:", "Nominal tidak sesuai");
        if (reason) {
            await updateDoc(doc(db, "orders", id), { status: 'payment_rejected', note: `Ditolak: ${reason}` });
            setProofModalOrder(null);
            toast.error("Pembayaran DITOLAK");
        }
    };

    const changeStatus = async (id, currentStatus) => {
        let nextStatus = '';

        if (role === 'kitchen' || role === 'barista') {
            if (currentStatus === 'pending') nextStatus = 'cooking';
            else if (currentStatus === 'cooking') nextStatus = 'ready';
        } else {
            if (window.confirm("Selesaikan pesanan ini?")) {
                nextStatus = 'completed';
            }
        }

        if (nextStatus) {
            await updateDoc(doc(db, "orders", id), { status: nextStatus });
            toast.success(`Status: ${nextStatus.toUpperCase()}`);
        }
    };

    const saveEditedOrder = async () => {
        try {
            await updateDoc(doc(db, "orders", editingOrder.id), {
                items: editingOrder.items,
                total: editingOrder.items.reduce((acc, item) => acc + (item.price * item.qty), 0) + (editingOrder.uniqueCode || 0)
            });
            setEditingOrder(null);
            toast.success("Order Diupdate");
        } catch (error) { toast.error("Gagal Edit"); }
    };

    const handleEditItemQty = (index, delta) => {
        if (!editingOrder) return;
        const newItems = [...editingOrder.items];
        newItems[index].qty += delta;
        if (newItems[index].qty < 1) newItems[index].qty = 1;
        setEditingOrder({ ...editingOrder, items: newItems });
    };

    const filteredOrders = orders.filter(o =>
        (o.orderId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="font-sans pb-10">
            <div style={{ display: 'none' }}>
                <Receipt ref={componentRef} order={autoPrintOrder || previewOrder} role={role} adminName={adminName} />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
                    <BellRing className="text-orange-600" size={32} />
                    {role === 'kitchen' ? 'Dapur' : role === 'barista' ? 'Bar' : 'Live Orders'}
                </h1>
                <div className="relative w-full md:w-auto">
                    <Search className="absolute left-4 top-3 text-slate-400" size={20} />
                    <input type="text" placeholder="Cari nama pelanggan..." className="pl-12 pr-4 py-3 border-2 border-slate-100 rounded-2xl outline-none w-full md:w-80 focus:border-orange-500 font-bold transition-all shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {filteredOrders.map(order => {
                    const isPaid = order.paymentStatus === 'paid';
                    const isRejected = order.status === 'payment_rejected';
                    const isQris = order.paymentMethod === 'QRIS Transfer';
                    const isProofUpdated = isQris && !isPaid && !isRejected && order.proofImage;
                    const isKitchenBar = role === 'kitchen' || role === 'barista';

                    const displayItems = role === 'kitchen' ? order.items.filter(i => i.category === 'food') :
                        role === 'barista' ? order.items.filter(i => i.category === 'drink') :
                            order.items;

                    return (
                        <div key={order.id} className={`bg-white rounded-[2rem] shadow-xl border-t-8 p-6 relative transition-all duration-300 hover:translate-y-[-4px] flex flex-col h-full ${isRejected ? 'border-gray-400 grayscale opacity-70' : isPaid ? 'border-green-500 shadow-green-100' : 'border-orange-500 shadow-orange-100'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="font-black text-2xl uppercase tracking-tighter text-slate-900">Meja {order.tableNumber}</span>
                                    <div className="text-[10px] text-slate-400 font-black flex items-center gap-1 mt-1 uppercase tracking-widest">
                                        <Clock size={12} /> {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-1">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] ${order.status === 'ready' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>{order.status}</span>
                                    {isPaid ? <span className="text-[9px] font-black text-green-600 uppercase">Lunas</span> : <span className="text-[9px] font-black text-red-500 animate-pulse uppercase">Belum Bayar</span>}
                                </div>
                            </div>

                            <div className="mb-4 text-[12px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">{order.customerName}</div>

                            <div className="space-y-2 mb-6 flex-1 bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-100">
                                {displayItems.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-slate-700 uppercase tracking-tight">
                                            <span className="text-orange-600 mr-2">{item.qty}x</span> {item.name}
                                        </span>
                                    </div>
                                ))}
                                {order.note && (
                                    <div className="mt-3 pt-3 border-t border-slate-200 text-[10px] font-bold text-red-500 italic">
                                        Note: {order.note}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                {isQris && !isKitchenBar && (
                                    <div className={`p-4 rounded-2xl border-2 ${isProofUpdated ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                                        <div className="flex justify-between font-black text-xs mb-3 text-slate-800">
                                            <span className="uppercase tracking-widest">Total</span><span>Rp {order.total?.toLocaleString()}</span>
                                        </div>
                                        {order.proofImage && (
                                            <button onClick={() => setProofModalOrder(order)} className={`w-full text-white py-3 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all ${isPaid ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100'}`}>
                                                <Eye size={16} /> {isPaid ? 'Cek Bukti' : 'Validasi Bayar'}
                                            </button>
                                        )}
                                    </div>
                                )}

                                {!isKitchenBar && !isPaid && !isQris && !isRejected && (
                                    <button onClick={() => confirmPayment(order.id)} className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex justify-center gap-2 shadow-lg shadow-green-100 transition-all active:scale-95"><Banknote size={18} /> Terima Tunai</button>
                                )}

                                <div className="flex gap-2">
                                    <button onClick={() => changeStatus(order.id, order.status)} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex justify-center items-center gap-2 transition-all active:scale-95 text-white ${isKitchenBar ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-100' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-200'} shadow-lg`}>
                                        {isKitchenBar ? (order.status === 'pending' ? 'Mulai Masak' : 'Set Siap Saji') : <><Check size={18} /> Selesai</>}
                                    </button>
                                    <button onClick={() => { setPreviewOrder(order); }} className="px-5 bg-white text-slate-400 rounded-2xl border-2 border-slate-100 hover:bg-slate-50 transition-all shadow-sm">
                                        <Printer size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {previewOrder && (
                <div className="fixed inset-0 bg-slate-900/90 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white rounded-[3rem] shadow-2xl p-10 w-full max-w-sm flex flex-col items-center border-4 border-slate-900">
                        <div className="flex justify-between items-center w-full mb-8">
                            <h3 className="font-black text-[10px] uppercase text-slate-400 tracking-[0.2em]">Preview Struk Pelanggan</h3>
                            <button onClick={() => setPreviewOrder(null)} className="p-2 bg-slate-50 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X size={24} /></button>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-[2rem] w-full flex justify-center overflow-auto max-h-[50vh] border-2 border-slate-100 shadow-inner">
                            <Receipt order={previewOrder} role={role} adminName={adminName} />
                        </div>
                        <div className="grid grid-cols-2 gap-4 w-full mt-10">
                            <button onClick={() => setPreviewOrder(null)} className="py-4 rounded-2xl border-2 border-slate-100 font-black text-[10px] uppercase tracking-widest text-slate-400">Tutup</button>
                            <button onClick={handlePrint} className="py-4 rounded-2xl bg-orange-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-200 flex items-center justify-center gap-2 transition-all active:scale-95">
                                <Printer size={18} /> Print
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {autoPrintOrder && (
                <div className="fixed inset-0 bg-slate-900/90 z-[110] flex items-center justify-center p-4 backdrop-blur-md animate-in zoom-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl p-10 flex flex-col items-center gap-6 max-w-sm w-full border-4 border-orange-500">
                        <div className="text-center animate-pulse">
                            <div className="bg-orange-100 p-4 rounded-full inline-block mb-2 text-orange-600"><BellRing size={32} /></div>
                            <h3 className="text-2xl font-black uppercase text-slate-900 tracking-tighter">Order Masuk!</h3>
                            <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">Meja {autoPrintOrder.tableNumber}</p>
                        </div>
                        <div className="border-2 border-slate-100 bg-slate-50 p-4 rounded-3xl w-full flex justify-center overflow-auto max-h-[35vh] shadow-inner">
                            <Receipt order={autoPrintOrder} role={role} adminName={adminName} />
                        </div>
                        <div className="flex w-full gap-4 mt-2">
                            <button onClick={() => setAutoPrintOrder(null)} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest">Nanti</button>
                            <button onClick={handlePrint} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"><Printer size={18} /> CETAK</button>
                        </div>
                    </div>
                </div>
            )}

            {proofModalOrder && (
                <div className="fixed inset-0 bg-slate-900/95 z-[90] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white rounded-[3rem] w-full max-w-md p-10 flex flex-col max-h-[90vh] shadow-2xl relative border-4 border-white">
                        <button onClick={() => setProofModalOrder(null)} className="absolute right-6 top-6 p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-colors"><X size={20} /></button>
                        <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-8 text-center underline decoration-orange-500 decoration-4 underline-offset-8">Validasi QRIS</h3>
                        <div className="flex-1 overflow-y-auto mb-8 bg-slate-100 rounded-[2rem] p-4 flex justify-center border-4 border-white shadow-inner">
                            <img src={proofModalOrder.proofImage} alt="Bukti" className="max-w-full object-contain rounded-xl" />
                        </div>
                        <div className="bg-orange-50 p-6 rounded-3xl mb-8 text-center border-2 border-orange-100">
                            <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Total Tagihan:</p>
                            <p className="text-4xl font-black text-slate-900 tracking-tighter">Rp {proofModalOrder.total?.toLocaleString()}</p>
                        </div>
                        {proofModalOrder.paymentStatus === 'paid' ? (
                            <button onClick={() => setProofModalOrder(null)} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl">Data Terarsip</button>
                        ) : (
                            <div className="grid grid-cols-2 gap-5">
                                <button onClick={() => rejectPayment(proofModalOrder.id)} className="bg-red-50 text-red-600 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest border-2 border-red-100 transition-all active:scale-95 shadow-lg shadow-red-50">❌ TOLAK</button>
                                <button onClick={() => confirmPayment(proofModalOrder.id)} className="bg-green-600 text-white py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-green-100 transition-all active:scale-95">✅ TERIMA</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminLiveOrders;