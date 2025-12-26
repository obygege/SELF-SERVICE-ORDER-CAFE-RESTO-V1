import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { Search, Calendar, Trash2, Filter, FileText, X, Eye, Clock, User, Armchair, Receipt, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const HeadHistory = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOrders(list);
        } catch (error) {
            console.error(error);
            toast.error("Gagal mengambil data");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (window.confirm("Apakah Anda yakin ingin menghapus data pesanan ini secara permanen?")) {
            try {
                await deleteDoc(doc(db, "orders", id));
                setOrders(orders.filter(o => o.id !== id));
                toast.success("Pesanan berhasil dihapus");
            } catch (error) {
                toast.error("Gagal menghapus data");
            }
        }
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        const tableColumn = ["No", "Order ID", "Tanggal", "Customer", "Meja", "Total", "Status"];
        const tableRows = [];

        filteredOrders.forEach((order, index) => {
            const date = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('id-ID') : '-';
            const orderData = [
                index + 1,
                order.orderId,
                date,
                order.customerName,
                order.tableNumber,
                `Rp ${order.total?.toLocaleString()}`,
                order.status.toUpperCase()
            ];
            tableRows.push(orderData);
        });

        doc.setFontSize(18);
        doc.text("Laporan Riwayat Order - Taki Coffee", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 30);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 35,
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59] },
            styles: { fontSize: 9 }
        });

        doc.save(`Riwayat_Order_${new Date().getTime()}.pdf`);
        toast.success("PDF berhasil diunduh");
    };

    const filteredOrders = orders.filter(order => {
        const dateObj = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : new Date();
        const matchesSearch =
            (order.orderId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (order.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (order.tableNumber || '').toString().includes(searchTerm);

        const orderDay = dateObj.getDate().toString().padStart(2, '0');
        const orderMonth = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const orderYear = dateObj.getFullYear().toString();
        const fullDateString = `${orderYear}-${orderMonth}-${orderDay}`;

        const matchesDate = filterDate ? fullDateString === filterDate : true;
        const matchesMonth = filterMonth ? orderMonth === filterMonth : true;
        const matchesYear = filterYear ? orderYear === filterYear : true;

        return matchesSearch && matchesDate && matchesMonth && matchesYear;
    });

    const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());
    const months = [
        { v: '01', l: 'Januari' }, { v: '02', l: 'Februari' }, { v: '03', l: 'Maret' },
        { v: '04', l: 'April' }, { v: '05', l: 'Mei' }, { v: '06', l: 'Juni' },
        { v: '07', l: 'Juli' }, { v: '08', l: 'Agustus' }, { v: '09', l: 'September' },
        { v: '10', l: 'Oktober' }, { v: '11', l: 'November' }, { v: '12', l: 'Desember' }
    ];

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans text-gray-800">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">RIWAYAT ORDER</h1>
                        <p className="text-gray-500 text-sm">Klik baris tabel untuk detail atau unduh laporan PDF.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={generatePDF}
                            className="bg-white px-4 py-2 rounded-xl shadow-sm border flex items-center gap-2 text-red-600 font-bold hover:bg-red-50 transition"
                        >
                            <Download size={18} />
                            <span>Export PDF</span>
                        </button>
                        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border flex items-center gap-2 text-orange-600 font-bold">
                            <FileText size={18} />
                            <span>Total: {filteredOrders.length}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative col-span-1 md:col-span-2">
                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Cari Order ID, Nama, atau Meja..."
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="date"
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 transition text-sm"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <select
                                className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm"
                                value={filterMonth}
                                onChange={(e) => setFilterMonth(e.target.value)}
                            >
                                <option value="">Semua Bulan</option>
                                {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                            </select>
                            <select
                                className="w-24 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm"
                                value={filterYear}
                                onChange={(e) => setFilterYear(e.target.value)}
                            >
                                <option value="">Tahun</option>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={() => { setFilterDate(''); setFilterMonth(''); setFilterYear(''); setSearchTerm(''); }}
                            className="text-xs font-bold text-gray-400 hover:text-orange-600 flex items-center gap-1"
                        >
                            <Filter size={14} /> Reset Filter
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Info Pesanan</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Waktu</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Item</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr><td colSpan="6" className="text-center py-20 text-gray-400">Memuat data...</td></tr>
                                ) : filteredOrders.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center py-20 text-gray-400">Tidak ada data ditemukan.</td></tr>
                                ) : (
                                    filteredOrders.map((order) => {
                                        const date = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : new Date();
                                        return (
                                            <tr
                                                key={order.id}
                                                className="hover:bg-orange-50 cursor-pointer transition group"
                                                onClick={() => setSelectedOrder(order)}
                                            >
                                                <td className="px-6 py-4">
                                                    <p className="font-black text-slate-800 text-sm group-hover:text-orange-700 transition">#{order.orderId}</p>
                                                    <p className="text-xs text-orange-600 font-bold">Meja {order.tableNumber}</p>
                                                    <p className="text-xs text-gray-400 mt-1">{order.customerName}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm text-gray-700">{date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                                    <p className="text-[10px] text-gray-400">{date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="max-w-xs truncate text-xs text-gray-600 font-medium">
                                                        {order.items?.map(i => `${i.qty}x ${i.name}`).join(', ')}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-sm text-slate-800">Rp {order.total?.toLocaleString()}</p>
                                                    <p className="text-[10px] text-blue-500 font-bold uppercase">{order.paymentMethod === 'QRIS Transfer' ? 'QRIS' : 'TUNAI'}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                                                        ${order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                            order.status === 'payment_rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="p-2 text-gray-400 group-hover:text-orange-500 transition">
                                                            <Eye size={18} />
                                                        </div>
                                                        <button
                                                            onClick={(e) => handleDelete(e, order.id)}
                                                            className="p-2 text-gray-300 hover:text-red-600 hover:bg-white rounded-lg transition"
                                                            title="Hapus"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {selectedOrder && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-900 text-white">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">Detail Pesanan</h3>
                                <p className="text-xs text-slate-400 mt-1 font-mono">ID: {selectedOrder.orderId}</p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-slate-800 rounded-full transition">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[70vh]">
                            <div className="grid grid-cols-2 gap-6 mb-8 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Pelanggan</p>
                                    <div className="flex items-center gap-2 font-bold text-slate-800">
                                        <User size={14} className="text-orange-500" /> {selectedOrder.customerName}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Nomor Meja</p>
                                    <div className="flex items-center gap-2 font-bold text-slate-800">
                                        <Armchair size={14} className="text-orange-500" /> Meja {selectedOrder.tableNumber}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Waktu Pesan</p>
                                    <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                                        <Clock size={14} className="text-orange-500" />
                                        {new Date(selectedOrder.createdAt?.seconds * 1000).toLocaleString('id-ID')}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Pembayaran</p>
                                    <div className="flex items-center gap-2 font-bold text-blue-600 text-xs uppercase">
                                        <Receipt size={14} /> {selectedOrder.paymentMethod}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="font-black text-sm uppercase text-gray-400 border-b pb-2">Rincian Menu</h4>
                                {selectedOrder.items?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-800 text-sm leading-none">{item.name}</p>
                                            <p className="text-[11px] text-gray-400 mt-1">{item.qty}x @Rp {item.price?.toLocaleString()}</p>
                                            {item.note && <p className="text-[10px] italic text-red-500 mt-1 bg-red-50 px-2 py-0.5 rounded inline-block">Note: {item.note}</p>}
                                        </div>
                                        <p className="font-black text-slate-800 text-sm">Rp {(item.qty * item.price).toLocaleString()}</p>
                                    </div>
                                ))}

                                <div className="pt-4 border-t-2 border-dashed border-gray-200">
                                    <div className="flex justify-between text-gray-500 text-sm">
                                        <span>Subtotal</span>
                                        <span>Rp {selectedOrder.subTotal?.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-500 text-sm mt-1">
                                        <span>Kode Unik</span>
                                        <span>{selectedOrder.uniqueCode}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-900 font-black text-xl mt-3">
                                        <span>TOTAL</span>
                                        <span className="text-orange-600">Rp {selectedOrder.total?.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {selectedOrder.proofImage && (
                                <div className="mt-8">
                                    <h4 className="font-black text-sm uppercase text-gray-400 border-b pb-2 mb-4">Bukti Pembayaran</h4>
                                    <div className="bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 shadow-inner">
                                        <img src={selectedOrder.proofImage} alt="Bukti Transfer" className="w-full h-auto object-contain" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t bg-gray-50 flex justify-end">
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="px-8 py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 transition shadow-lg active:scale-95"
                            >
                                TUTUP
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HeadHistory;