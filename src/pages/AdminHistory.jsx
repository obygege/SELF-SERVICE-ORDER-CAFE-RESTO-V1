import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, updateDoc, doc, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useReactToPrint } from 'react-to-print';
import { History, Search, Trash2, CheckCircle, XCircle, Eye, X, Receipt, User, Calendar, ChefHat, Banknote, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

const ReceiptComponent = React.forwardRef(({ order, adminName }, ref) => {
    if (!order) return null;
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

    return (
        <div ref={ref} className="bg-white text-black font-mono p-2 mx-auto" style={{ width: '58mm', padding: '10px 5px', margin: '0', fontSize: '10px', color: '#000' }}>
            <style type="text/css" media="print">
                {`
                    @page { size: 58mm auto; margin: 0; }
                    body { margin: 0; padding: 0; font-family: monospace; }
                    .no-print { display: none !important; }
                `}
            </style>

            <div className="text-center flex flex-col items-center">
                <img
                    src="/assets/logo.png"
                    alt="LOGO"
                    style={{ height: '45px', width: '45px', objectFit: 'contain', marginBottom: '8px', filter: 'grayscale(100%)' }}
                    onError={(e) => e.target.style.display = 'none'}
                />
                <h2 className="font-extrabold text-[12px] uppercase leading-tight mb-2">TAKI COFFEE & EATERY</h2>

                <div className="text-[7px] leading-relaxed uppercase mb-2 border-t border-black pt-2 w-full">
                    <p>Jl. Taman Kenten, Duku, Kec. Ilir Tim. II</p>
                    <p>Palembang, Sumatera Selatan 30114</p>
                    <p>Email: takicoffee@gmail.com</p>
                    <p>Telp/WA: 0812-7156-2248</p>
                </div>

                <p className="text-[8px] uppercase border-y border-black border-dashed py-1 w-full">{fullDateTime}</p>
            </div>

            <div className="mt-2 space-y-1 text-[9px]">
                <div className="flex justify-between"><span>Admin:</span><span className="font-bold uppercase">{adminName || 'Staff'}</span></div>
                <div className="flex justify-between"><span>Pelanggan:</span><span className="font-bold uppercase">{order.customerName?.substring(0, 15)}</span></div>
                <div className="flex justify-between"><span>No. Trx:</span><span>{order.orderId}</span></div>
                <div className="flex justify-between mt-1 pt-1 border-t border-black border-dotted"><span>Meja:</span><span className="font-extrabold text-[12px]">MEJA {order.tableNumber}</span></div>
            </div>

            <div className="border-b border-black my-2"></div>

            <div className="flex flex-col gap-1 text-[9px]">
                {order.items?.map((item, i) => (
                    <div key={i} className="flex flex-col mb-1">
                        <div className="font-bold uppercase">{item.name}</div>
                        <div className="flex justify-between pl-2 italic">
                            <span>{item.qty} x {item.price.toLocaleString('id-ID')}</span>
                            <span>{(item.price * item.qty).toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="border-b border-black my-2"></div>

            <div className="space-y-0.5 font-bold text-[10px]">
                <div className="flex justify-between"><span>Subtotal</span><span>{order.subTotal?.toLocaleString('id-ID')}</span></div>
                {order.uniqueCode > 0 && (
                    <div className="flex justify-between text-[9px]"><span>Kode Unik</span><span>{order.uniqueCode}</span></div>
                )}
                <div className="flex justify-between text-sm mt-1 pt-1 border-t-2 border-black"><span>TOTAL</span><span>Rp {order.total?.toLocaleString('id-ID')}</span></div>
            </div>

            <div className="text-center mt-3 text-[10px] font-bold border border-black p-1 uppercase">
                {isPaid ? 'Lunas / Paid' : 'Belum Bayar'}
            </div>

            <div className="text-center mt-4 text-[8px] uppercase italic border-t border-black border-dotted pt-2">
                <p>Terima kasih telah berkunjung</p>
                <p className="font-bold mt-1">Taki Coffee & Eatery</p>
            </div>
        </div>
    );
});

const AdminHistory = () => {
    const { currentUser } = useAuth();
    const role = currentUser?.role;
    const adminName = currentUser?.displayName || 'Admin';

    const [orders, setOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [proofImage, setProofImage] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);

    const componentRef = useRef();
    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `Struk-${selectedOrder?.orderId}`,
        onAfterPrint: () => toast.success("Print Berhasil")
    });

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
                await updateDoc(doc(db, "orders", id), {
                    paymentStatus: 'paid'
                });
                toast.success("Status diupdate: LUNAS");
                if (selectedOrder?.id === id) {
                    setSelectedOrder(prev => ({ ...prev, paymentStatus: 'paid' }));
                }
            } catch (error) {
                toast.error("Gagal update status");
            }
        }
    };

    return (
        <div>
            <div style={{ display: 'none' }}>
                <ReceiptComponent ref={componentRef} order={selectedOrder} adminName={adminName} />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><History className="text-orange-600" /> Riwayat Order</h1>

                <div className="flex gap-2 w-full md:w-auto">
                    <input type="date" className="border rounded-xl px-3 py-2" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input type="text" placeholder="Cari..." className="pl-10 pr-4 py-2 border rounded-xl w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 text-gray-600 text-sm uppercase font-bold">
                        <tr>
                            <th className="p-4">ID / Waktu</th>
                            <th className="p-4">Pelanggan</th>
                            <th className="p-4">Total</th>
                            <th className="p-4">Bukti</th>
                            <th className="p-4">Status</th>
                            {role === 'head' && <th className="p-4 text-center">Aksi</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {orders.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-gray-400">Tidak ada data.</td></tr>}
                        {orders.filter(o => o.orderId.toLowerCase().includes(searchTerm.toLowerCase())).map(order => (
                            <tr key={order.id} onClick={() => setSelectedOrder(order)} className="hover:bg-orange-50 cursor-pointer text-sm transition-colors">
                                <td className="p-4">
                                    <div className="font-bold text-orange-600">{order.orderId}</div>
                                    <div className="text-xs text-gray-500">{new Date(order.createdAt?.seconds * 1000).toLocaleString()}</div>
                                </td>
                                <td className="p-4">
                                    <div className="font-bold">{order.customerName}</div>
                                    <div className="text-xs">Meja {order.tableNumber}</div>
                                </td>
                                <td className="p-4 font-bold">Rp {order.total?.toLocaleString()}</td>
                                <td className="p-4">
                                    {order.proofImage ? (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setProofImage(order.proofImage); }}
                                            className="text-blue-600 font-bold text-xs flex items-center gap-1 hover:underline"
                                        >
                                            <Eye size={12} /> Lihat
                                        </button>
                                    ) : <span className="text-gray-400 text-xs">-</span>}
                                </td>
                                <td className="p-4">
                                    {order.paymentStatus === 'paid' ?
                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold flex w-fit gap-1"><CheckCircle size={12} /> Lunas</span> :
                                        <button
                                            onClick={(e) => handleMarkAsPaid(e, order.id)}
                                            className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold flex w-fit gap-1 hover:bg-red-200 border border-red-200"
                                        >
                                            <XCircle size={12} /> Belum (Bayar?)
                                        </button>
                                    }
                                </td>
                                {role === 'head' && (
                                    <td className="p-4 text-center">
                                        <button onClick={(e) => handleDelete(e, order.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={18} /></button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
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
                                    <span className="text-xs text-gray-500 block mb-1">Nomor Meja</span>
                                    <span className="font-bold text-gray-800 text-lg">{selectedOrder.tableNumber}</span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl col-span-2">
                                    <span className="text-xs text-gray-500 block mb-1">Admin / Kasir</span>
                                    <span className="font-bold text-gray-800 uppercase tracking-tight">{adminName}</span>
                                </div>
                            </div>

                            {selectedOrder.proofImage && (
                                <div className="mb-6">
                                    <button
                                        onClick={() => setProofImage(selectedOrder.proofImage)}
                                        className="w-full bg-blue-50 text-blue-600 border border-blue-200 p-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition"
                                    >
                                        <Eye size={18} /> Lihat Bukti Transfer
                                    </button>
                                </div>
                            )}

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
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-600">Total Tagihan</span>
                                    {selectedOrder.uniqueCode > 0 && <span className="text-xs text-gray-500">(Termasuk Kode Unik: {selectedOrder.uniqueCode})</span>}
                                </div>
                                <span className="font-black text-2xl text-slate-900">Rp {selectedOrder.total?.toLocaleString('id-ID')}</span>
                            </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50 flex flex-col gap-3 shrink-0">
                            <button
                                onClick={handlePrint}
                                className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                <Printer size={20} /> Cetak Nota
                            </button>

                            {selectedOrder.paymentStatus !== 'paid' && selectedOrder.status !== 'cancelled' ? (
                                <button
                                    onClick={(e) => handleMarkAsPaid(e, selectedOrder.id)}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                                >
                                    <Banknote size={20} /> Konfirmasi Pembayaran Diterima (LUNAS)
                                </button>
                            ) : (
                                <div className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${selectedOrder.status === 'cancelled' ? 'bg-gray-200 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                                    {selectedOrder.status === 'cancelled' ? 'Pesanan Dibatalkan' : <><CheckCircle size={20} /> Sudah Lunas</>}
                                </div>
                            )}

                            {role === 'head' && (
                                <button
                                    onClick={(e) => handleDelete(e, selectedOrder.id)}
                                    className="w-full text-red-500 hover:bg-red-50 py-3 rounded-xl font-bold border border-transparent hover:border-red-100 transition flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={18} /> Hapus Data Riwayat Ini
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {proofImage && (
                <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setProofImage(null)}>
                    <div className="relative bg-white p-2 rounded-lg max-w-lg max-h-[90vh] overflow-auto flex flex-col">
                        <div className="flex justify-between items-center mb-2 px-2 pt-2">
                            <h3 className="font-bold text-gray-800">Bukti Transfer</h3>
                            <button onClick={() => setProofImage(null)} className="bg-gray-100 p-1 rounded-full"><X size={20} /></button>
                        </div>
                        <img src={proofImage} alt="Bukti" className="max-w-full" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminHistory;