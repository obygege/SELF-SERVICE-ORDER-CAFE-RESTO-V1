import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { History, Search, Trash2, Calendar, User, CheckCircle, XCircle, CreditCard, Banknote } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminHistory = () => {
    const [orders, setOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(o => o.status === 'completed' || o.status === 'cancelled');
            setOrders(list);
        });
        return () => unsub();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm("Hapus data riwayat ini permanen?")) {
            await deleteDoc(doc(db, "orders", id));
            toast.success("Riwayat dihapus");
        }
    };

    const filteredOrders = orders.filter(o => (o.orderId || '').toLowerCase().includes(searchTerm.toLowerCase()) || (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()));

    const renderPaymentStatus = (order) => {
        if (order.status === 'cancelled') return <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-[10px] font-bold">DIBATALKAN</span>;

        if (order.paymentStatus === 'paid') {
            return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 w-fit"><CheckCircle size={10} /> LUNAS</span>;
        } else {
            return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 w-fit"><XCircle size={10} /> BELUM</span>;
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

            {/* --- TABLE VIEW (DESKTOP) --- */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100 text-gray-600 text-sm uppercase font-bold">
                            <tr>
                                <th className="p-4">ID / Waktu</th>
                                <th className="p-4">Pelanggan</th>
                                <th className="p-4">Detail Order</th>
                                <th className="p-4">Pembayaran</th>
                                <th className="p-4 text-right">Total</th>
                                <th className="p-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredOrders.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-gray-400">Data tidak ditemukan.</td></tr>}
                            {filteredOrders.map(order => (
                                <tr key={order.id} className="hover:bg-gray-50 text-sm">
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
                                        {order.items?.map(i => `${i.qty}x ${i.name}`).join(', ')}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1 text-xs font-bold text-gray-600">
                                                {order.paymentMethod === 'Cash' ? <Banknote size={12} /> : <CreditCard size={12} />}
                                                {order.paymentMethod}
                                            </div>
                                            {renderPaymentStatus(order)}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right font-bold text-lg">Rp {order.total?.toLocaleString('id-ID')}</td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => handleDelete(order.id)} className="text-red-400 hover:bg-red-50 p-2 rounded transition hover:text-red-600"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- CARD VIEW (MOBILE/TABLET) --- */}
            <div className="md:hidden space-y-4">
                {filteredOrders.length === 0 && <p className="text-center text-gray-400 py-10">Data tidak ditemukan.</p>}
                {filteredOrders.map(order => (
                    <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
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
                            {order.items?.map((i, idx) => (
                                <div key={idx} className="flex justify-between">
                                    <span>{i.qty}x {i.name}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between items-center border-t pt-3">
                            <div className="text-right">
                                <span className="text-xs text-gray-500">Total</span>
                                <div className="font-bold text-lg text-gray-900">Rp {order.total?.toLocaleString('id-ID')}</div>
                            </div>
                            <button onClick={() => handleDelete(order.id)} className="text-red-500 bg-red-50 p-2 rounded-lg hover:bg-red-100">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminHistory;