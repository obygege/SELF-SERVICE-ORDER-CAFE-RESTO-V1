import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, ChefHat, BellRing, Printer, Search, Edit2, X, Plus, Minus, Banknote, AlertCircle, Clock, Coffee, Eye, XCircle, RefreshCw, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const Receipt = React.forwardRef(({ order, role }, ref) => {
    if (!order) return null;

    const displayItems = role === 'kitchen' ? order.items.filter(i => i.category === 'food') :
        role === 'barista' ? order.items.filter(i => i.category === 'drink') :
            order.items;

    if (displayItems.length === 0) return null;

    const isPaid = order.paymentStatus === 'paid';
    const dateObj = order.createdAt ? new Date(order.createdAt.seconds * 1000) : new Date();
    const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'long' });
    const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const isKitchenOrBar = role === 'kitchen' || role === 'barista';

    return (
        <div ref={ref} className="bg-white text-black font-mono p-2 mx-auto" style={{ width: '58mm', padding: '10px 5px', margin: '0', fontSize: '10px', color: '#000' }}>
            <style type="text/css" media="print">
                {`@page { size: 58mm auto; margin: 0; } body { margin: 0; padding: 0; font-family: monospace; } .no-print { display: none !important; }`}
            </style>

            <div className="text-center mb-2">
                {!isKitchenOrBar && (
                    <img src="/logo.png" alt="LOGO" style={{ height: '40px', margin: '0 auto 5px auto', filter: 'grayscale(100%)' }} onError={(e) => e.target.style.display = 'none'} />
                )}
                <h2 className="font-extrabold text-lg uppercase leading-none mb-1">TAKI COFFEE & EATERY</h2>
                {isKitchenOrBar ? (
                    <div className="border border-black p-1 inline-block font-bold mt-1 uppercase">
                        NOTA {role === 'kitchen' ? 'DAPUR' : 'BAR'}
                    </div>
                ) : (
                    <>
                        <p className="text-[9px]">Jl. Taman Kenten, Duku, Kec. Ilir Tim. II, Kota Palembang, Sumatera Selatan 30114</p>
                        <p className="text-[9px]">cafetaki@gmail.com</p>
                        <p className="text-[9px]">0812-3456-7890</p>
                    </>
                )}
            </div>

            <div className="border-b-2 border-dashed border-black my-2"></div>

            <div className="space-y-0.5 text-[9px]">
                <div className="flex justify-between"><span>No. Trx:</span><span>{order.orderId}</span></div>
                <div className="flex justify-between"><span>Waktu:</span><span className="text-right">{dayName}, {timeStr}<br />{dateStr}</span></div>
                <div className="flex justify-between mt-1"><span>Pelanggan:</span><span className="font-bold">{order.customerName?.substring(0, 15)}</span></div>
                <div className="flex justify-between"><span>Meja:</span><span className="font-bold text-[11px]">MEJA {order.tableNumber}</span></div>
            </div>

            <div className="border-b-2 border-dashed border-black my-2"></div>

            <div className="flex flex-col gap-1 text-[9px]">
                {displayItems.map((item, i) => (
                    <div key={i} className="flex flex-col">
                        <div className="font-bold">{item.name}</div>
                        {isKitchenOrBar ? (
                            <div className="pl-2 font-bold text-[11px]">Qty: {item.qty}</div>
                        ) : (
                            <div className="flex justify-between pl-2">
                                <span>{item.qty} x {item.price.toLocaleString('id-ID')}</span>
                                <span>{(item.price * item.qty).toLocaleString('id-ID')}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="border-b-2 border-dashed border-black my-2"></div>

            {!isKitchenOrBar && (
                <>
                    <div className="space-y-0.5 font-bold text-[10px]">
                        <div className="flex justify-between"><span>Subtotal</span><span>{order.subTotal?.toLocaleString('id-ID')}</span></div>
                        {order.uniqueCode > 0 && (
                            <div className="flex justify-between text-[9px]"><span>Kode Unik</span><span>{order.uniqueCode}</span></div>
                        )}
                        <div className="flex justify-between text-sm mt-1 pt-1 border-t border-black"><span>TOTAL</span><span>Rp {order.total?.toLocaleString('id-ID')}</span></div>
                    </div>

                    <div className="text-center mt-2 text-[9px] font-bold">
                        METODE: {order.paymentMethod === 'QRIS Transfer' ? 'QRIS' : 'TUNAI'}
                    </div>

                    <div className="text-center mt-4 text-xs font-bold border-2 border-black p-1 rounded">
                        {isPaid ? 'LUNAS' : 'BELUM BAYAR'}
                    </div>

                    <div className="text-center mt-4 text-[9px]">
                        <p>Terima kasih sudah berkunjung!</p>
                        <p className="mt-1">Wifi: FuturaGuest / 123456</p>
                    </div>
                </>
            )}

            {order.note && (
                <div className="text-[9px] font-bold border p-1 mt-2 text-center">
                    CATATAN: {order.note}
                </div>
            )}
        </div>
    );
});

const AdminLiveOrders = () => {
    const { currentUser } = useAuth();
    const role = currentUser?.role || 'admin';

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
            await updateDoc(doc(db, "orders", id), { paymentStatus: 'paid', status: 'cooking' });
            setProofModalOrder(null);
            toast.success("Pembayaran DITERIMA (Lunas)");
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
        if (currentStatus === 'pending') nextStatus = 'cooking';
        else if (currentStatus === 'cooking') nextStatus = 'ready';
        else if (currentStatus === 'ready') nextStatus = 'completed';

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
        <div>
            <div style={{ display: 'none' }}>
                <Receipt ref={componentRef} order={autoPrintOrder || previewOrder} role={role} />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <BellRing className="text-orange-600" />
                    {role === 'kitchen' ? 'Orderan Dapur' : role === 'barista' ? 'Orderan Bar' : 'Pesanan Masuk'}
                </h1>
                <div className="relative w-full md:w-auto">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input type="text" placeholder="Cari..." className="pl-10 pr-4 py-2 border rounded-xl outline-none w-full md:w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {filteredOrders.map(order => {
                    const isPaid = order.paymentStatus === 'paid';
                    const isRejected = order.status === 'payment_rejected';
                    const isQris = order.paymentMethod === 'QRIS Transfer';
                    const isProofUpdated = isQris && !isPaid && !isRejected && order.proofImage;

                    const displayItems = role === 'kitchen' ? order.items.filter(i => i.category === 'food') :
                        role === 'barista' ? order.items.filter(i => i.category === 'drink') :
                            order.items;

                    return (
                        <div key={order.id} className={`bg-white rounded-xl shadow-sm border-l-4 p-4 relative transition hover:shadow-md ${isRejected ? 'border-gray-400 opacity-70' : isPaid ? 'border-green-500' : 'border-orange-500'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="font-bold text-lg">Meja {order.tableNumber}</span>
                                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                        <Clock size={10} /> {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase block mb-1 bg-gray-100">{order.status}</span>
                                    {isRejected ? <span className="text-[10px] font-bold text-gray-500">DITOLAK</span> :
                                        isPaid ? <span className="text-[10px] font-bold text-green-600">LUNAS</span> :
                                            <span className="text-[10px] font-bold text-red-600 animate-pulse">BELUM BAYAR</span>}
                                </div>
                            </div>

                            <div className="mb-3 text-xs font-bold text-gray-500">{order.customerName}</div>

                            <div className="space-y-1 mb-4 text-sm border-t border-b py-2 border-dashed bg-gray-50 p-2 rounded">
                                {displayItems.map((item, idx) => (
                                    <div key={idx} className="flex justify-between">
                                        <span><b>{item.qty}x</b> {item.name}</span>
                                    </div>
                                ))}
                            </div>

                            {isQris && (role === 'admin' || role === 'head') && (
                                <div className={`mb-4 text-xs p-3 rounded-xl border ${isProofUpdated ? 'bg-blue-50 border-blue-300' : 'bg-orange-50 border-orange-200 text-orange-900'}`}>
                                    {isProofUpdated && <div className="flex items-center gap-1 text-blue-700 font-bold mb-2 animate-pulse"><RefreshCw size={12} /> UPDATE BUKTI</div>}
                                    <div className="flex justify-between font-bold text-sm mb-1">
                                        <span>TOTAL</span><span>Rp {order.total?.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-gray-500 mb-2">
                                        <span>Kode Unik: {order.uniqueCode}</span>
                                    </div>
                                    {order.proofImage && (
                                        <button onClick={() => setProofModalOrder(order)} className={`w-full text-white py-2 rounded flex items-center justify-center gap-1 font-bold ${isPaid ? 'bg-gray-500' : 'bg-blue-600'}`}>
                                            <Eye size={14} /> {isPaid ? 'Arsip Bukti' : 'Validasi Pembayaran'}
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="flex flex-col gap-2">
                                {(role === 'admin' || role === 'head') && !isPaid && !isQris && !isRejected && (
                                    <button onClick={() => confirmPayment(order.id)} className="w-full bg-green-600 text-white py-2 rounded font-bold text-sm flex justify-center gap-2"><Banknote size={16} /> Terima Tunai</button>
                                )}

                                <div className="flex gap-2">
                                    <button onClick={() => changeStatus(order.id, order.status)} className="flex-1 bg-slate-800 text-white py-2 rounded text-sm font-bold flex justify-center items-center gap-2">
                                        {order.status === 'pending' ? 'Proses' : order.status === 'cooking' ? 'Siap' : 'Selesai'}
                                    </button>
                                    {(role === 'admin' || role === 'head') && (
                                        <button onClick={() => setEditingOrder(order)} className="px-3 bg-blue-100 text-blue-600 rounded border border-blue-200"><Edit2 size={18} /></button>
                                    )}
                                    <button onClick={() => { setPreviewOrder(order); setAutoPrintOrder(order); }} className="px-3 bg-gray-100 text-gray-700 rounded border border-gray-300" title="Cetak">
                                        <Printer size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {autoPrintOrder && (
                <div className="fixed inset-0 bg-black/70 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
                    <div className="bg-white rounded-xl shadow-2xl p-6 flex flex-col items-center gap-4 max-w-sm w-full border-4 border-orange-500">
                        <div className="flex items-center gap-2 text-orange-600 font-bold text-lg animate-pulse">
                            <BellRing size={24} />
                            <span>PESANAN BARU!</span>
                        </div>
                        <div className="border-2 border-gray-200 bg-gray-50 p-2 rounded w-full flex justify-center overflow-auto max-h-[50vh]">
                            <Receipt order={autoPrintOrder} role={role} />
                        </div>
                        <div className="flex w-full gap-2 mt-2">
                            <button onClick={() => setAutoPrintOrder(null)} className="flex-1 py-3 px-4 rounded-xl border border-gray-300 font-bold text-gray-600">Tutup</button>
                            <button onClick={handlePrint} className="flex-1 py-3 px-4 rounded-xl bg-slate-900 text-white font-bold shadow-lg flex items-center justify-center gap-2"><Printer size={20} /> CETAK</button>
                        </div>
                    </div>
                </div>
            )}

            {proofModalOrder && (
                <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-4 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="font-bold text-lg">Validasi Pembayaran</h3>
                            <button onClick={() => setProofModalOrder(null)}><X className="text-gray-500" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto mb-4 bg-gray-100 rounded p-2 flex justify-center">
                            <img src={proofModalOrder.proofImage} alt="Bukti" className="max-w-full object-contain" />
                        </div>
                        <div className="bg-orange-50 p-3 rounded mb-4 text-center">
                            <p className="text-xs text-gray-500">Total Seharusnya:</p>
                            <p className="text-2xl font-black text-orange-600">Rp {proofModalOrder.total?.toLocaleString()}</p>
                            <p className="text-[10px] text-gray-400">Termasuk kode unik: {proofModalOrder.uniqueCode}</p>
                        </div>
                        {proofModalOrder.paymentStatus === 'paid' ? (
                            <button onClick={() => setProofModalOrder(null)} className="w-full bg-gray-600 text-white py-3 rounded-xl font-bold">Tutup</button>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => rejectPayment(proofModalOrder.id)} className="bg-red-100 text-red-700 py-3 rounded-xl font-bold">❌ TOLAK</button>
                                <button onClick={() => confirmPayment(proofModalOrder.id)} className="bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg">✅ TERIMA (LUNAS)</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {editingOrder && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between mb-4"><h3 className="font-bold">Edit Pesanan</h3><button onClick={() => setEditingOrder(null)}><X /></button></div>
                        <div className="space-y-3 mb-4">
                            {editingOrder.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center border p-2 rounded">
                                    <span className="text-sm font-medium w-1/2 truncate">{item.name}</span>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => handleEditItemQty(idx, -1)} className="bg-gray-200 p-1 rounded"><Minus size={14} /></button>
                                        <span className="font-bold w-4 text-center">{item.qty}</span>
                                        <button onClick={() => handleEditItemQty(idx, 1)} className="bg-gray-200 p-1 rounded"><Plus size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={saveEditedOrder} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold">Simpan Perubahan</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminLiveOrders;