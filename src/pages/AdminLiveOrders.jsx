import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { useReactToPrint } from 'react-to-print'; // Pastikan ini terinstall
import { CheckCircle, ChefHat, BellRing, Printer, Search, Edit2, X, Plus, Minus, Banknote, AlertCircle, Clock, Coffee } from 'lucide-react';
import toast from 'react-hot-toast';

// --- KOMPONEN STRUK (UI KHUSUS CETAK) ---
const Receipt = React.forwardRef(({ order }, ref) => {
    if (!order) return null;
    const isPaid = order.paymentStatus === 'paid';

    return (
        <div ref={ref} className="bg-white text-black font-mono p-4 mx-auto" style={{ width: '80mm', fontSize: '12px', color: 'black' }}>
            {/* Style khusus saat diprint agar pas di kertas struk */}
            <style type="text/css" media="print">
                {`
                   @page { size: 80mm auto; margin: 0; }
                   body { margin: 0; padding: 0; }
                   .no-print { display: none !important; }
                `}
            </style>

            <div className="text-center mb-4">
                <h2 className="font-extrabold text-xl uppercase leading-none mb-1">CAFE FUTURA</h2>
                <p className="text-[10px]">Jl. Teknologi No. 88</p>
                <p className="text-[10px]">0812-3456-7890</p>
            </div>

            <div className="border-b-2 border-dashed border-black my-2"></div>

            <div className="space-y-1 text-[10px]">
                <div className="flex justify-between"><span>ID:</span><span>{order.orderId}</span></div>
                <div className="flex justify-between"><span>Tgl:</span><span>{order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString('id-ID') : '-'}</span></div>
                <div className="flex justify-between"><span>Meja:</span><span>{order.tableNumber}</span></div>
                <div className="flex justify-between"><span>Tipe:</span><span className="uppercase">{order.diningOption}</span></div>
                <div className="flex justify-between"><span>Bayar:</span><span>{order.paymentMethod}</span></div>
            </div>

            <div className="border-b-2 border-dashed border-black my-2"></div>

            <div className="flex flex-col gap-1 text-[10px]">
                {order.items?.map((item, i) => (
                    <div key={i} className="flex flex-col">
                        <div className="font-bold">{item.name}</div>
                        <div className="flex justify-between pl-2">
                            <span>{item.qty} x {item.price.toLocaleString('id-ID')}</span>
                            <span>{(item.price * item.qty).toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="border-b-2 border-dashed border-black my-2"></div>

            <div className="space-y-1 font-bold text-sm">
                <div className="flex justify-between"><span>Total</span><span>Rp {order.total?.toLocaleString('id-ID')}</span></div>
            </div>

            <div className="text-center mt-6 text-sm font-bold border-2 border-black p-2 rounded">
                {isPaid ? 'LUNAS' : 'BELUM BAYAR'}
            </div>

            <div className="text-center mt-4 text-[10px]">
                <p>Terima Kasih!</p>
                <p>Wifi: FuturaGuest / Pass: 123456</p>
            </div>
        </div>
    );
});

const AdminLiveOrders = () => {
    const [orders, setOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // State untuk Modal Preview & Edit
    const [previewOrder, setPreviewOrder] = useState(null);
    const [editingOrder, setEditingOrder] = useState(null);

    // Ref untuk ReactToPrint
    const componentRef = useRef();

    // Fungsi Print dari Library
    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `Struk-${previewOrder?.orderId || 'Order'}`,
        onAfterPrint: () => {
            // Opsional: Tutup modal setelah print, atau biarkan terbuka
            // setPreviewOrder(null); 
            toast.success("Print selesai");
        }
    });

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
            toast.success("Pembayaran LUNAS!");
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
                total: editingOrder.items.reduce((acc, item) => acc + (item.price * item.qty), 0)
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
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><BellRing className="text-orange-600" /> Pesanan Masuk</h1>
                <div className="relative w-full md:w-auto">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input type="text" placeholder="Cari..." className="pl-10 pr-4 py-2 border rounded-xl outline-none w-full md:w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            {/* --- LIST PESANAN --- */}
            {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[60vh] bg-white rounded-3xl border-4 border-dashed border-gray-100 p-8 text-center animate-in fade-in zoom-in duration-500">
                    <div className="bg-orange-50 p-8 rounded-full mb-6 relative">
                        <Coffee size={64} className="text-orange-400" />
                        <div className="absolute top-0 right-0 bg-red-500 w-4 h-4 rounded-full animate-ping"></div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-700 mb-2">Belum Ada Pesanan Masuk</h3>
                    <p className="text-gray-400 max-w-sm">Pesanan baru dari pelanggan akan muncul di sini secara real-time. Standby ya!</p>
                </div>
            ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {filteredOrders.map(order => {
                        const isCashUnpaid = order.paymentMethod === 'Cash' && order.paymentStatus !== 'paid';
                        const isPaid = order.paymentStatus === 'paid';

                        return (
                            <div key={order.id} className={`bg-white rounded-xl shadow-sm border-l-4 p-4 relative transition hover:shadow-md ${isCashUnpaid ? 'border-red-500' : 'border-orange-500'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <span className="font-bold text-lg">Meja {order.tableNumber}</span>
                                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                            <Clock size={10} /> {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase block mb-1 bg-gray-100">{order.status}</span>
                                        {isPaid ? (
                                            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-green-100 text-green-700 flex items-center justify-end gap-1"><CheckCircle size={10} /> LUNAS</span>
                                        ) : (
                                            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700 flex items-center justify-end gap-1 animate-pulse"><AlertCircle size={10} /> BELUM BAYAR</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mb-3">
                                    <div className={`text-xs font-bold py-1 px-2 rounded inline-block ${order.diningOption === 'takeaway' ? 'bg-purple-100 text-purple-700' : 'bg-orange-50 text-orange-700'}`}>
                                        {order.diningOption === 'takeaway' ? '🛍️ TAKEAWAY' : '🍽️ DINE IN'}
                                    </div>
                                    <p className="text-xs font-mono font-bold text-gray-600">{order.paymentMethod}</p>
                                </div>

                                <div className="space-y-1 mb-4 text-sm border-t border-b py-2 border-dashed">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between"><span><b>{item.qty}x</b> {item.name}</span></div>
                                    ))}
                                </div>

                                <div className="flex flex-col gap-2">
                                    {isCashUnpaid && (
                                        <button onClick={() => confirmPayment(order.id)} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded font-bold text-sm flex items-center justify-center gap-2 mb-1">
                                            <Banknote size={16} /> Terima Rp {order.total.toLocaleString('id-ID')}
                                        </button>
                                    )}

                                    <div className="flex gap-2">
                                        <button onClick={() => changeStatus(order.id, order.status)} className="flex-1 bg-slate-800 text-white py-2 rounded text-sm font-bold hover:bg-slate-700 flex justify-center items-center gap-2">
                                            {order.status === 'pending' && <><ChefHat size={16} /> Masak</>}
                                            {order.status === 'cooking' && <><BellRing size={16} /> Siap</>}
                                            {order.status === 'ready' && <><CheckCircle size={16} /> Selesai</>}
                                        </button>
                                        <button onClick={() => setEditingOrder(order)} className="px-3 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 border border-blue-200"><Edit2 size={18} /></button>

                                        {/* TOMBOL PRINT MEMBUKA MODAL */}
                                        <button onClick={() => setPreviewOrder(order)} className="px-3 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300" title="Cetak Struk">
                                            <Printer size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* --- MODAL EDIT PESANAN --- */}
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

            {/* --- MODAL PREVIEW & PRINT (SOLUSI FINAL) --- */}
            {/* Modal ini menampilkan struk di tengah layar agar bisa dicek sebelum diprint */}
            {previewOrder && (
                <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl p-6 flex flex-col items-center gap-4 max-w-sm w-full">
                        <h3 className="font-bold text-gray-700 text-lg flex items-center gap-2">
                            <Printer size={20} /> Preview Struk
                        </h3>

                        {/* KONTAINER STRUK (Ada Border agar kelihatan batas kertasnya) */}
                        <div className="border-2 border-gray-200 bg-gray-50 p-2 rounded w-full flex justify-center overflow-auto max-h-[60vh]">
                            <Receipt ref={componentRef} order={previewOrder} />
                        </div>

                        <div className="flex w-full gap-2 mt-2">
                            <button
                                onClick={() => setPreviewOrder(null)}
                                className="flex-1 py-3 px-4 rounded-xl border border-gray-300 font-bold text-gray-600 hover:bg-gray-100 transition"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handlePrint}
                                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition flex items-center justify-center gap-2"
                            >
                                <Printer size={20} /> Cetak
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminLiveOrders;