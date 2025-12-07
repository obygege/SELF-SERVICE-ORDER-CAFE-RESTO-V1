import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { useReactToPrint } from 'react-to-print';
import { CheckCircle, ChefHat, BellRing, Printer, X, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

// Komponen Struk (Hidden)
const Receipt = React.forwardRef(({ order }, ref) => (
    <div ref={ref} className="font-mono text-xs text-black p-4 bg-white" style={{ width: '80mm', margin: '0 auto' }}>
        <div className="text-center mb-4">
            <h2 className="font-bold text-xl uppercase tracking-wider">Cafe Futura</h2>
            <p>Jl. Digital No. 1, Cloud City</p>
        </div>
        <div className="border-b-2 border-dashed border-black my-2"></div>
        <div className="space-y-1">
            <div className="flex justify-between"><span>Order ID:</span><span>{order?.orderId}</span></div>
            <div className="flex justify-between"><span>Tgl:</span><span>{new Date().toLocaleDateString()}</span></div>
            <div className="flex justify-between font-bold"><span>Tipe:</span><span>{order?.diningOption === 'takeaway' ? 'AMBIL' : 'DINE-IN'}</span></div>
            <div className="flex justify-between"><span>Meja:</span><span>{order?.tableNumber}</span></div>
        </div>
        <div className="border-b-2 border-dashed border-black my-2"></div>
        <div className="flex flex-col gap-1">
            {order?.items?.map((item, i) => (
                <div key={i} className="flex justify-between items-start">
                    <span>{item.qty}x {item.name}</span>
                    <span>{(item.price * item.qty).toLocaleString()}</span>
                </div>
            ))}
        </div>
        <div className="border-b-2 border-dashed border-black my-2"></div>
        {order?.note && <div className="mb-2 italic text-[10px]">Catatan: {order.note}</div>}
        <div className="space-y-1 font-bold">
            <div className="flex justify-between"><span>Total</span><span>Rp {order?.total?.toLocaleString()}</span></div>
        </div>
        <div className="text-center mt-6 text-[10px]">
            <p>*** LUNAS ***</p>
            <p>Terima Kasih</p>
        </div>
    </div>
));

const AdminDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);

    // REF UNTUK PRINT
    const componentRef = useRef();

    // HOOK PRINT
    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        onAfterPrint: () => toast.success("Proses Print Selesai"),
        onBeforeGetContent: () => {
            if (!selectedOrder) {
                toast.error("Pilih pesanan dulu");
                return Promise.reject();
            }
            return Promise.resolve();
        }
    });

    // Efek samping: Saat selectedOrder berubah (dan tidak null), langsung print
    useEffect(() => {
        if (selectedOrder) {
            handlePrint();
        }
    }, [selectedOrder]);

    useEffect(() => {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOrders(list);
        });
        return () => unsub();
    }, []);

    const changeStatus = async (id, currentStatus) => {
        let nextStatus = '';
        if (currentStatus === 'pending') nextStatus = 'cooking';
        else if (currentStatus === 'cooking') nextStatus = 'ready';
        else if (currentStatus === 'ready') nextStatus = 'completed';

        if (nextStatus) {
            await updateDoc(doc(db, "orders", id), { status: nextStatus });
            toast.success(`Status update: ${nextStatus.toUpperCase()}`);
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Bell className="text-orange-600" /> Pesanan Masuk (Live)
            </h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {orders.map(order => (
                    <div key={order.id} className={`bg-white rounded-xl shadow-sm border-l-4 p-4 relative ${order.status === 'completed' ? 'border-gray-300 opacity-60' : 'border-orange-500'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className="font-bold text-lg">Meja {order.tableNumber}</span>
                                <p className="text-xs text-gray-500 font-mono">{order.customerName}</p>
                            </div>
                            <div className="text-right">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase block mb-1 bg-gray-100`}>{order.status}</span>
                                <p className="text-[10px] text-gray-400">{order.orderId}</p>
                            </div>
                        </div>

                        <div className={`text-xs font-bold py-1 px-2 rounded mb-3 inline-block ${order.diningOption === 'takeaway' ? 'bg-purple-100 text-purple-700' : 'bg-orange-50 text-orange-700'}`}>
                            {order.diningOption === 'takeaway' ? '🛍️ AMBIL SENDIRI' : '🍽️ DIANTAR'}
                        </div>

                        {order.note && (
                            <div className="bg-yellow-50 p-2 rounded border border-yellow-200 text-xs italic mb-2 text-gray-600">
                                "Note: {order.note}"
                            </div>
                        )}

                        <div className="space-y-1 mb-4 text-sm border-t border-b py-2 border-dashed">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between">
                                    <span><b>{item.qty}x</b> {item.name}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            {order.status !== 'completed' && (
                                <button onClick={() => changeStatus(order.id, order.status)} className="flex-1 bg-slate-800 text-white py-2 rounded text-sm font-bold hover:bg-slate-700 flex justify-center items-center gap-2">
                                    {order.status === 'pending' && <><ChefHat size={16} /> Masak</>}
                                    {order.status === 'cooking' && <><BellRing size={16} /> Siap</>}
                                    {order.status === 'ready' && <><CheckCircle size={16} /> Selesai</>}
                                </button>
                            )}

                            {/* TOMBOL PRINT YANG SUDAH DIPERBAIKI */}
                            <button
                                onClick={() => setSelectedOrder(order)}
                                className="px-3 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 border border-gray-300"
                                title="Cetak Struk"
                            >
                                <Printer size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* COMPONENT HIDDEN UNTUK PRINT */}
            <div style={{ display: "none" }}>
                <Receipt ref={componentRef} order={selectedOrder} />
            </div>
        </div>
    );
};

export default AdminDashboard;