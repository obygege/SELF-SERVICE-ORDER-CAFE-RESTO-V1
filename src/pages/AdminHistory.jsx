import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { History, Search, Trash2, Calendar, User } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminHistory = () => {
    const [orders, setOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(o => o.status === 'completed');
            setOrders(list);
        });
        return () => unsub();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm("Hapus permanen?")) { await deleteDoc(doc(db, "orders", id)); toast.success("Dihapus"); }
    };

    const filteredOrders = orders.filter(o => (o.orderId || '').toLowerCase().includes(searchTerm.toLowerCase()) || (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><History className="text-orange-600" /> Riwayat Transaksi</h1>
                <div className="relative w-full md:w-auto">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input type="text" placeholder="Cari ID / Nama..." className="pl-10 pr-4 py-2 border rounded-xl outline-none w-full md:w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {/* WRAPPER SCROLL HORIZONTAL UNTUK TABLE */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-gray-100 text-gray-600 text-sm uppercase">
                            <tr>
                                <th className="p-4">ID Transaksi</th>
                                <th className="p-4">Waktu</th>
                                <th className="p-4">Pelanggan</th>
                                <th className="p-4">Items</th>
                                <th className="p-4 text-right">Total</th>
                                <th className="p-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredOrders.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-gray-400">Data tidak ditemukan.</td></tr>}
                            {filteredOrders.map(order => (
                                <tr key={order.id} className="hover:bg-gray-50 text-sm">
                                    <td className="p-4 font-mono font-bold text-orange-600">{order.orderId || '-'}</td>
                                    <td className="p-4 text-gray-500">
                                        <div className="flex items-center gap-1"><Calendar size={14} /> {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString() : '-'}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold flex items-center gap-1"><User size={14} className="text-gray-400" /> {order.customerName || 'Guest'}</div>
                                        <span className="text-xs text-gray-400">Meja {order.tableNumber}</span>
                                    </td>
                                    <td className="p-4 text-gray-600 max-w-xs truncate">{order.items?.map(i => `${i.qty || i.quantity}x ${i.name}`).join(', ')}</td>
                                    <td className="p-4 text-right font-bold">Rp {order.total?.toLocaleString()}</td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => handleDelete(order.id)} className="text-red-500 hover:bg-red-50 p-2 rounded transition"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminHistory;