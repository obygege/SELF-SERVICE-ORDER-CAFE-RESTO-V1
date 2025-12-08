import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { useReactToPrint } from 'react-to-print';
import { CheckCircle, ChefHat, BellRing, Printer, Search, Edit2, X, Plus, Minus, Banknote, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Receipt = React.forwardRef(({ order }, ref) => {
    if (!order) return <div ref={ref}></div>;
    const isPaid = order.paymentStatus === 'paid';

    return (
        <div ref={ref} className="bg-white text-black font-mono p-4" style={{ width: '80mm', margin: '0' }}>
            <style>{`@media print { @page { size: 80mm auto; margin: 0; } body { margin: 0; padding: 0; } }`}</style>
            <div className="text-center mb-4">
                <h2 className="font-extrabold text-xl uppercase">CAFE FUTURA</h2>
                <p className="text-xs">Jl. Teknologi No. 88</p>
            </div>
            <div className="border-b-2 border-dashed border-black my-2"></div>
            <div className="text-xs space-y-1">
                <div className="flex justify-between"><span>ID:</span><span>{order.orderId}</span></div>
                <div className="flex justify-between"><span>Tgl:</span><span>{order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString('id-ID') : '-'}</span></div>
                <div className="flex justify-between"><span>Meja:</span><span>{order.tableNumber}</span></div>
            </div>
            <div className="border-b-2 border-dashed border-black my-2"></div>
            <div className="flex flex-col gap-2 text-xs">
                {order.items?.map((item, i) => (
                    <div key={i} className="flex justify-between items-start">
                        <div className="flex gap-1"><span className="font-bold">{item.qty}x</span><span>{item.name}</span></div>
                        <span>{(item.price * item.qty).toLocaleString('id-ID')}</span>
                    </div>
                ))}
            </div>
            <div className="border-b-2 border-dashed border-black my-2"></div>
            <div className="text-xs space-y-1 font-bold">
                <div className="flex justify-between"><span>Total</span><span>Rp {order.total?.toLocaleString('id-ID')}</span></div>
            </div>
            <div className="text-center mt-4 text-xs font-bold border-2 border-black p-1">
                {isPaid ? '*** LUNAS ***' : 'BELUM LUNAS / TAGIHAN'}
            </div>
        </div>
    );
});

const AdminLiveOrders = () => {
    const [orders, setOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [printOrder, setPrintOrder] = useState(null);
    const [editingOrder, setEditingOrder] = useState(null);
    const componentRef = useRef();

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        onAfterPrint: () => setPrintOrder(null)
    });

    useEffect(() => {
        if (printOrder) handlePrint();
    }, [printOrder, handlePrint]);

    useEffect(() => {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(o => o.status !== 'completed');
            setOrders(list);
        });
        return () => unsub();
    }, []);

    const confirmPayment = async (id) => {
        if (window.confirm("Konfirmasi pembayaran tunai diterima?")) {
            await updateDoc(doc(db, "orders", id), { paymentStatus: 'paid' });
            toast.success("Pembayaran Dikonfirmasi LUNAS!");
        }
    };

    const changeStatus = async (id, currentStatus) => {
        let nextStatus = '';
        let extraUpdates = {};

        if (currentStatus === 'pending') nextStatus = 'cooking';
        else if (currentStatus === 'cooking') nextStatus = 'ready';
        else if (currentStatus === 'ready') {
            nextStatus = 'completed';
            extraUpdates = { paymentStatus: 'paid' };
        }

        if (nextStatus) {
            await updateDoc(doc(db, "orders", id), { status: nextStatus, ...extraUpdates });
            toast.success(`Status: ${nextStatus.toUpperCase()}`);
        }
    };

    const saveEditedOrder = async () => {
        try {
            await updateDoc(doc(db, "orders", editingOrder.id), {
                items: editingOrder.items,
                subTotal: editingOrder.subTotal,
                total: editingOrder.total
            });
            setEditingOrder(null);
            toast.success("Edit Berhasil");
        } catch (error) { toast.error("Gagal Edit"); }
    };

    const handleEditItemQty = (index, delta) => {
        if (!editingOrder) return;
        const newItems = [...editingOrder.items];
        newItems[index].qty += delta;
        if (newItems[index].qty < 1) newItems[index].qty = 1;
        const newSubTotal = newItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
        const newTotal = newSubTotal + (editingOrder.adminFee || 0);
        setEditingOrder({ ...editingOrder, items: newItems, subTotal: newSubTotal, total: newTotal });
    };

    const filteredOrders = orders.filter(o =>
        (o.orderId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><BellRing className="text-orange-600" /> Pesanan Masuk</h1>
                <div className="relative w-full md:w-auto">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input type="text" placeholder="Cari..." className="pl-10 pr-4 py-2 border rounded-xl outline-none w-full md:w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {filteredOrders.map(order => {
                    const isCashUnpaid = order.paymentMethod === 'Cash' && order.paymentStatus !== 'paid';
                    const isPaid = order.paymentStatus === 'paid';

                    return (
                        <div key={order.id} className={`bg-white rounded-xl shadow-sm border-l-4 p-4 relative transition hover:shadow-md ${isCashUnpaid ? 'border-red-500' : 'border-orange-500'}`}>
                            {/* HEADER KARTU */}
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="font-bold text-lg">Meja {order.tableNumber}</span>
                                    <p className="text-xs text-gray-500 truncate w-32">{order.customerName}</p>
                                </div>
                                <div className="text-right">
                                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase block mb-1 bg-gray-100">{order.status}</span>

                                    {/* INDIKATOR PEMBAYARAN */}
                                    {isPaid ? (
                                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-green-100 text-green-700 flex items-center justify-end gap-1">
                                            <CheckCircle size={10} /> LUNAS
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700 flex items-center justify-end gap-1 animate-pulse">
                                            <AlertCircle size={10} /> BELUM BAYAR
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-between items-center mb-3">
                                <div className={`text-xs font-bold py-1 px-2 rounded inline-block ${order.diningOption === 'takeaway' ? 'bg-purple-100 text-purple-700' : 'bg-orange-50 text-orange-700'}`}>
                                    {order.diningOption === 'takeaway' ? '🛍️ AMBIL' : '🍽️ DINE IN'}
                                </div>
                                <p className="text-xs font-mono font-bold">{order.paymentMethod}</p>
                            </div>

                            {order.note && <div className="bg-yellow-50 p-2 rounded border border-yellow-200 text-xs italic mb-2 text-gray-600">"{order.note}"</div>}

                            <div className="space-y-1 mb-4 text-sm border-t border-b py-2 border-dashed">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between"><span><b>{item.qty}x</b> {item.name}</span></div>
                                ))}
                            </div>

                            <div className="flex flex-col gap-2">
                                {/* TOMBOL KONFIRMASI BAYAR KHUSUS CASH */}
                                {isCashUnpaid && (
                                    <button
                                        onClick={() => confirmPayment(order.id)}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded font-bold text-sm flex items-center justify-center gap-2 mb-1"
                                    >
                                        <Banknote size={16} /> Terima Pembayaran (Rp {order.total.toLocaleString('id-ID')})
                                    </button>
                                )}

                                <div className="flex gap-2">
                                    <button onClick={() => changeStatus(order.id, order.status)} className="flex-1 bg-slate-800 text-white py-2 rounded text-sm font-bold hover:bg-slate-700 flex justify-center items-center gap-2">
                                        {order.status === 'pending' && <><ChefHat size={16} /> Masak</>}
                                        {order.status === 'cooking' && <><BellRing size={16} /> Siap</>}
                                        {order.status === 'ready' && <><CheckCircle size={16} /> Selesai</>}
                                    </button>
                                    <button onClick={() => setEditingOrder(order)} className="px-3 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 border border-blue-200"><Edit2 size={18} /></button>
                                    <button onClick={() => setPrintOrder(order)} className="px-3 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300"><Printer size={18} /></button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {editingOrder && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between mb-4"><h3 className="font-bold">Edit Order</h3><button onClick={() => setEditingOrder(null)}><X /></button></div>
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
                        <button onClick={saveEditedOrder} className="w-full bg-blue-600 text-white py-2 rounded-lg">Simpan</button>
                    </div>
                </div>
            )}
            <div style={{ position: "fixed", top: 0, left: 0, opacity: 0, pointerEvents: "none", zIndex: -50 }}><Receipt ref={componentRef} order={printOrder} /></div>
        </div>
    );
};

export default AdminLiveOrders;