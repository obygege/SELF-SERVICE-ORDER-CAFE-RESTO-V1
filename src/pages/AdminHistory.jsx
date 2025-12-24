import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { History, Search, Trash2, Calendar, User, CheckCircle, XCircle, CreditCard, Banknote, X, Receipt, ChefHat } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminHistory = () => {
    const [orders, setOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(o => o.status === 'completed' || o.status === 'cancelled');
            setOrders(list);
        });
        return () => unsub();
    }, []);

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (window.confirm("Hapus data riwayat ini permanen?")) {
            await deleteDoc(doc(db, "orders", id));
            toast.success("Riwayat dihapus");
            if (selectedOrder?.id === id) setSelectedOrder(null);
        }
    };

    const handleMarkAsPaid = async (e, order) => {
        if (e) e.stopPropagation();
        if (window.confirm(`Konfirmasi pembayaran tunai Rp ${order.total?.toLocaleString()} diterima?`)) {
            await updateDoc(doc(db, "orders", order.id), { paymentStatus: 'paid' });
            toast.success("Status Pembayaran Diupdate: LUNAS");
            if (selectedOrder?.id === order.id) {
                setSelectedOrder({ ...selectedOrder, paymentStatus: 'paid' });
            }
        }
    };

    const filteredOrders = orders.filter(o => (o.orderId || '').toLowerCase().includes(searchTerm.toLowerCase()) || (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()));

    const renderPaymentStatus = (order) => {
        if (order.status === 'cancelled') return <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-[10px] font-bold">DIBATALKAN</span>;

        if (order.paymentStatus === 'paid') {
            return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 w-fit"><CheckCircle size={10} /> LUNAS</span>;
        } else {
            return (
                <button
                    onClick={(e) => handleMarkAsPaid(e, order)}
                    className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 w-fit hover:bg-red-200 transition border border-red-200 animate-pulse"
                >
                    <XCircle size={10} /> BAYAR SEKARANG
                </button>
            );
        }
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><History className="text-orange-600" /> Riwayat Transaksi</h1>
                <div className="relative w-full md:w-auto">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input type="text" placeholder="Cari ID / Nama..." className="pl-10 pr-4 py-2 border rounded-xl outline-none w-full md:w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            <div className="hidden md:block bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100 text-gray-600 text-sm uppercase font-bold">
                            <tr>
                                <th className="p-4">ID / Waktu</th>
                                <th className="p-4">Pelanggan</th>
                                <th className="p-4">Ringkasan Item</th>
                                <th className="p-4">Pembayaran</th>
                                <th className="p-4 text-right">Total</th>
                                <th className="p-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredOrders.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-gray-400">Data tidak ditemukan.</td></tr>}
                            {filteredOrders.map(order => (
                                <tr key={order.id} onClick={() => setSelectedOrder(order)} className="hover:bg-orange-50 cursor-pointer text-sm transition-colors">
                                    <td className="p-4">
                                        <div className="font-mono font-bold text-orange-600">{order.orderId || '-'}</div>
                                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                            <Calendar size={12} />
                                            {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString('id-ID') : '-'}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-gray-800 flex items-center gap-1"><User size={14} className="text-gray-400" /> {order.customerName || 'Guest'}</div>
                                        <div className="text-xs text-gray-500 bg-gray-100 inline-block px-1 rounded mt-1">Meja {order.tableNumber}</div>
                                    </td>
                                    <td className="p-4 text-gray-600 max-w-xs truncate">
                                        {order.items?.length} Item ({order.items?.map(i => i.name).join(', ')})
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1 items-start">
                                            <div className="flex items-center gap-1 text-xs font-bold text-gray-600 mb-1">
                                                {order.paymentMethod === 'Cash' ? <Banknote size={12} /> : <CreditCard size={12} />}
                                                {order.paymentMethod}
                                            </div>
                                            {renderPaymentStatus(order)}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right font-bold text-lg">Rp {order.total?.toLocaleString('id-ID')}</td>
                                    <td className="p-4 text-center">
                                        <button onClick={(e) => handleDelete(e, order.id)} className="text-red-400 hover:bg-red-50 p-2 rounded transition hover:text-red-600"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="md:hidden space-y-4">
                {filteredOrders.length === 0 && <p className="text-center text-gray-400 py-10">Data tidak ditemukan.</p>}
                {filteredOrders.map(order => (
                    <div key={order.id} onClick={() => setSelectedOrder(order)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 active:scale-[0.98] transition-transform">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className="font-mono font-bold text-orange-600 text-sm">#{order.orderId}</span>
                                <div className="text-xs text-gray-500 mt-0.5">
                                    {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString('id-ID') : '-'}
                                </div>
                            </div>
                            {renderPaymentStatus(order)}
                        </div>

                        <div className="flex justify-between items-center mb-3">
                            <div className="font-bold text-gray-800 text-sm">Meja {order.tableNumber} • {order.customerName}</div>
                            <div className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-600">{order.paymentMethod}</div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 space-y-1 mb-3">
                            <p className="text-xs text-gray-400 mb-1">{order.items?.length} Item Dipesan:</p>
                            {order.items?.slice(0, 2).map((i, idx) => (
                                <div key={idx} className="flex justify-between">
                                    <span>{i.qty}x {i.name}</span>
                                </div>
                            ))}
                            {order.items?.length > 2 && <p className="text-xs italic text-gray-400">...dan {order.items.length - 2} lainnya</p>}
                        </div>

                        <div className="flex justify-between items-center border-t pt-3">
                            <div className="text-right">
                                <span className="text-xs text-gray-500">Total</span>
                                <div className="font-bold text-lg text-gray-900">Rp {order.total?.toLocaleString('id-ID')}</div>
                            </div>
                            <button onClick={(e) => handleDelete(e, order.id)} className="text-red-500 bg-red-50 p-2 rounded-lg hover:bg-red-100">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-slate-900 p-4 text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-2">
                                <Receipt size={20} className="text-orange-400" />
                                <div>
                                    <h2 className="font-bold text-lg">Detail Transaksi</h2>
                                    <p className="text-xs text-slate-400 font-mono">#{selectedOrder.orderId}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="p-1 hover:bg-slate-700 rounded-full transition"><X size={24} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-gray-50 p-3 rounded-xl">
                                    <span className="text-xs text-gray-500 block mb-1">Pelanggan</span>
                                    <span className="font-bold text-gray-800 flex items-center gap-1"><User size={14} /> {selectedOrder.customerName || 'Guest'}</span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl">
                                    <span className="text-xs text-gray-500 block mb-1">Waktu Order</span>
                                    <span className="font-bold text-gray-800 text-sm">{selectedOrder.createdAt ? new Date(selectedOrder.createdAt.seconds * 1000).toLocaleString('id-ID') : '-'}</span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl">
                                    <span className="text-xs text-gray-500 block mb-1">Nomor Meja</span>
                                    <span className="font-bold text-gray-800 text-lg">{selectedOrder.tableNumber}</span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl">
                                    <span className="text-xs text-gray-500 block mb-1">Metode Bayar</span>
                                    <span className="font-bold text-gray-800">{selectedOrder.paymentMethod}</span>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><ChefHat size={18} /> Menu Dipesan</h3>
                                <div className="border rounded-xl divide-y overflow-hidden">
                                    {selectedOrder.items?.map((item, idx) => (
                                        <div key={idx} className="p-3 flex justify-between items-center hover:bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-orange-100 text-orange-700 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">
                                                    {item.qty}x
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                                                    <p className="text-xs text-gray-400">@ Rp {item.price?.toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <span className="font-bold text-gray-700 text-sm">Rp {(item.price * item.qty).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {selectedOrder.note && (
                                <div className="mb-6 bg-yellow-50 p-3 rounded-xl border border-yellow-200 text-sm text-yellow-800 italic">
                                    "Catatan: {selectedOrder.note}"
                                </div>
                            )}

                            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="font-bold text-slate-600">Total Tagihan</span>
                                <span className="font-black text-2xl text-slate-900">Rp {selectedOrder.total?.toLocaleString('id-ID')}</span>
                            </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50 flex flex-col gap-3 shrink-0">
                            {selectedOrder.paymentStatus !== 'paid' && selectedOrder.status !== 'cancelled' ? (
                                <button
                                    onClick={(e) => handleMarkAsPaid(e, selectedOrder)}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                                >
                                    <Banknote size={20} /> Konfirmasi Pembayaran Diterima (LUNAS)
                                </button>
                            ) : (
                                <div className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${selectedOrder.status === 'cancelled' ? 'bg-gray-200 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                                    {selectedOrder.status === 'cancelled' ? 'Pesanan Dibatalkan' : <><CheckCircle size={20} /> Sudah Lunas</>}
                                </div>
                            )}

                            <button
                                onClick={(e) => handleDelete(e, selectedOrder.id)}
                                className="w-full text-red-500 hover:bg-red-50 py-3 rounded-xl font-bold border border-transparent hover:border-red-100 transition"
                            >
                                Hapus Data Riwayat Ini
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminHistory;