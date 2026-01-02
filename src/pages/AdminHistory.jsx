import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, updateDoc, doc, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import { History, Search, Trash2, CheckCircle, XCircle, Eye, X, Receipt, User, ChefHat, Banknote, Printer, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminHistory = () => {
    const { currentUser } = useAuth();
    const role = currentUser?.role;
    const adminName = currentUser?.displayName || 'Admin';

    const [orders, setOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [proofImage, setProofImage] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        const startOfDay = new Date(filterDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(filterDate);
        endOfDay.setHours(23, 59, 59, 999);

        const q = query(
            collection(db, "orders"),
            where("createdAt", ">=", startOfDay),
            where("createdAt", "<=", endOfDay),
            orderBy("createdAt", "desc")
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOrders(list);
        });
        return () => unsub();
    }, [filterDate]);

    const generatePDF = (order) => {
        const doc = new jsPDF({
            unit: "mm",
            format: [58, 150]
        });

        const date = order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString('id-ID') : new Date().toLocaleString('id-ID');

        doc.setFontSize(10);
        doc.text("TAKI COFFEE & EATERY", 29, 10, { align: "center" });
        doc.setFontSize(6);
        doc.text("Jl. Taman Kenten, Duku, Palembang", 29, 14, { align: "center" });
        doc.text("WA: 0812-7156-2248", 29, 17, { align: "center" });
        doc.text("------------------------------------------", 29, 21, { align: "center" });

        doc.setFontSize(7);
        doc.text(`Waktu : ${date}`, 5, 25);
        doc.text(`Admin : ${adminName}`, 5, 28);
        doc.text(`Cust  : ${order.customerName}`, 5, 31);
        doc.text(`Meja  : ${order.tableNumber}`, 5, 34);
        doc.text(`Trx   : ${order.orderId}`, 5, 37);
        doc.text("------------------------------------------", 29, 41, { align: "center" });

        let y = 45;
        order.items.forEach((item) => {
            doc.setFont(undefined, 'bold');
            doc.text(`${item.name}`, 5, y);
            doc.setFont(undefined, 'normal');
            doc.text(`${item.qty} x ${item.price.toLocaleString()}`, 5, y + 3);
            doc.text(`${(item.qty * item.price).toLocaleString()}`, 53, y + 3, { align: "right" });
            y += 8;
        });

        doc.text("------------------------------------------", 29, y, { align: "center" });
        y += 5;
        doc.text("Subtotal", 5, y);
        doc.text(`${order.subTotal?.toLocaleString()}`, 53, y, { align: "right" });

        if (order.uniqueCode > 0) {
            y += 4;
            doc.text("Kode Unik", 5, y);
            doc.text(`${order.uniqueCode}`, 53, y, { align: "right" });
        }

        y += 6;
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text("TOTAL", 5, y);
        doc.text(`Rp ${order.total?.toLocaleString()}`, 53, y, { align: "right" });

        y += 8;
        doc.setFontSize(8);
        doc.text(order.paymentStatus === 'paid' ? "*** LUNAS ***" : "*** BELUM BAYAR ***", 29, y, { align: "center" });

        y += 7;
        doc.setFontSize(6);
        doc.setFont(undefined, 'italic');
        doc.text("Terima Kasih Atas Kunjungan Anda", 29, y, { align: "center" });

        doc.save(`Struk-${order.orderId}.pdf`);
        toast.success("PDF Berhasil Dibuat");
    };

    const handleDelete = async (e, id) => {
        if (e) e.stopPropagation();
        if (role !== 'head') {
            toast.error("Hanya Owner yang bisa menghapus data!");
            return;
        }
        if (window.confirm("Hapus permanen?")) {
            await deleteDoc(doc(db, "orders", id));
            toast.success("Dihapus");
            if (selectedOrder?.id === id) setSelectedOrder(null);
        }
    };

    const handleMarkAsPaid = async (e, id) => {
        if (e) e.stopPropagation();
        if (window.confirm("Konfirmasi pembayaran ini LUNAS?")) {
            try {
                await updateDoc(doc(db, "orders", id), { paymentStatus: 'paid' });
                toast.success("Status diupdate: LUNAS");
                if (selectedOrder?.id === id) setSelectedOrder(prev => ({ ...prev, paymentStatus: 'paid' }));
            } catch (error) {
                toast.error("Gagal update status");
            }
        }
    };

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <History className="text-orange-600" /> Riwayat Order & PDF Struk
                </h1>

                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <input type="date" className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input type="text" placeholder="Cari ID / Nama..." className="pl-10 pr-4 py-2 border rounded-xl w-full text-sm outline-none focus:ring-2 focus:ring-orange-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900 text-white text-xs uppercase font-bold">
                            <tr>
                                <th className="p-4">ID / Waktu</th>
                                <th className="p-4">Pelanggan</th>
                                <th className="p-4">Total</th>
                                <th className="p-4">Status Order</th>
                                <th className="p-4">Pembayaran</th>
                                <th className="p-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {orders.length === 0 && <tr><td colSpan="6" className="p-12 text-center text-gray-400 italic font-medium">Belum ada data di tanggal ini.</td></tr>}
                            {orders.filter(o => o.orderId.toLowerCase().includes(searchTerm.toLowerCase()) || o.customerName.toLowerCase().includes(searchTerm.toLowerCase())).map(order => (
                                <tr key={order.id} onClick={() => setSelectedOrder(order)} className="hover:bg-orange-50/50 cursor-pointer text-sm transition-all animate-in fade-in slide-in-from-top-1">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800">{order.orderId}</div>
                                        <div className="text-[10px] text-gray-400 font-medium">{new Date(order.createdAt?.seconds * 1000).toLocaleTimeString()}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-700">{order.customerName}</div>
                                        <div className="text-xs bg-orange-100 text-orange-700 w-fit px-2 rounded-full font-bold">Meja {order.tableNumber}</div>
                                    </td>
                                    <td className="p-4 font-black text-slate-900">Rp {order.total?.toLocaleString()}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${order.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {order.status || 'pending'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {order.paymentStatus === 'paid' ?
                                            <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle size={14} /> PAID</span> :
                                            <span className="text-red-500 font-bold flex items-center gap-1"><XCircle size={14} /> UNPAID</span>
                                        }
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); generatePDF(order); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors" title="Download PDF"><FileText size={16} /></button>
                                            {role === 'head' && <button onClick={(e) => handleDelete(e, order.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={16} /></button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Receipt size={24} className="text-orange-400" />
                                <div>
                                    <h2 className="font-bold text-lg">Detail Invoice</h2>
                                    <p className="text-[10px] text-slate-400 font-mono tracking-widest">{selectedOrder.orderId}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-slate-700 rounded-full transition"><X size={24} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <span className="text-[10px] text-gray-400 uppercase font-black block mb-1">Pelanggan</span>
                                    <span className="font-bold text-slate-800 flex items-center gap-2"><User size={14} /> {selectedOrder.customerName}</span>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                                    <span className="text-[10px] text-gray-400 uppercase font-black block mb-1">Nomor Meja</span>
                                    <span className="font-black text-2xl text-orange-600">{selectedOrder.tableNumber}</span>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-black text-xs text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><ChefHat size={16} /> Rincian Menu</h3>
                                <div className="space-y-2">
                                    {selectedOrder.items?.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-white border text-slate-800 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs">{item.qty}x</div>
                                                <span className="font-bold text-slate-700 text-sm">{item.name}</span>
                                            </div>
                                            <span className="font-bold text-slate-900 text-sm">Rp {(item.price * item.qty).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl">
                                <div className="flex justify-between mb-2 text-xs text-slate-400 uppercase font-bold tracking-tighter">
                                    <span>Subtotal</span>
                                    <span>Rp {selectedOrder.subTotal?.toLocaleString()}</span>
                                </div>
                                {selectedOrder.uniqueCode > 0 && (
                                    <div className="flex justify-between mb-3 text-xs text-orange-400 uppercase font-bold">
                                        <span>Kode Unik</span>
                                        <span>+{selectedOrder.uniqueCode}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-3 border-t border-slate-700">
                                    <span className="font-black text-sm uppercase">Total Bayar</span>
                                    <span className="font-black text-2xl text-orange-500">Rp {selectedOrder.total?.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 flex flex-col gap-2">
                            <button onClick={() => generatePDF(selectedOrder)} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg hover:bg-blue-700 transition-all">
                                <Printer size={20} /> Download & Cetak Struk PDF
                            </button>
                            {selectedOrder.paymentStatus !== 'paid' && (
                                <button onClick={(e) => handleMarkAsPaid(e, selectedOrder.id)} className="w-full bg-green-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg hover:bg-green-700 transition-all">
                                    <Banknote size={20} /> Konfirmasi Lunas
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminHistory;