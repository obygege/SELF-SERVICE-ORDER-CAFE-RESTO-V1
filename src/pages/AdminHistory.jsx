import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, updateDoc, doc, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { History, Search, Trash2, CheckCircle, XCircle, Eye, X, Receipt, User, ChefHat, Banknote, Printer, Loader2, LayoutGrid } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminHistory = () => {
    const { currentUser } = useAuth();
    const role = currentUser?.role;
    const adminName = currentUser?.displayName || 'Admin';

    const [orders, setOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [showAll, setShowAll] = useState(false);
    const [proofImage, setProofImage] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isPrinting, setIsPrinting] = useState(false);

    useEffect(() => {
        let q;
        if (showAll) {
            q = query(
                collection(db, "orders"),
                orderBy("createdAt", "desc")
            );
        } else {
            const startOfDay = new Date(filterDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(filterDate);
            endOfDay.setHours(23, 59, 59, 999);

            q = query(
                collection(db, "orders"),
                where("createdAt", ">=", startOfDay),
                where("createdAt", "<=", endOfDay),
                orderBy("createdAt", "desc")
            );
        }

        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOrders(list);
        });
        return () => unsub();
    }, [filterDate, showAll]);

    const handlePrintAction = (order) => {
        setSelectedOrder(order);
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 500);
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
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen font-sans">
            <style>
                {`
                @media screen {
                    #print-receipt-history { display: none; }
                }
                @media print {
                    @page { 
                        size: 58mm auto; 
                        margin: 0mm !important; 
                    }
                    html, body {
                        width: 58mm;
                        height: auto;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff;
                    }
                    body * { visibility: hidden; }
                    #print-receipt-history, #print-receipt-history * { 
                        visibility: visible; 
                    }
                    #print-receipt-history {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 58mm !important;
                        margin: 0 !important;
                        padding: 4mm !important;
                        box-sizing: border-box;
                        display: block !important;
                        background: white;
                    }
                }
                `}
            </style>

            <div id="print-receipt-history" className="bg-white text-black font-mono">
                {selectedOrder && (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <img src="/assets/logo.png" alt="LOGO" style={{ height: '40px', width: '40px', objectFit: 'contain', marginBottom: '5px', filter: 'grayscale(1)' }} />
                        <h2 style={{ fontSize: '12px', fontWeight: 'bold', margin: '0', textAlign: 'center' }}>TAKI COFFEE & EATERY</h2>
                        <div style={{ fontSize: '8px', textAlign: 'center', borderTop: '1px solid black', marginTop: '5px', paddingTop: '5px', width: '100%' }}>
                            <p style={{ margin: '0' }}>Jl. Taman Kenten, Duku, Palembang</p>
                            <p style={{ margin: '0' }}>0812-7156-2248</p>
                        </div>

                        <div style={{ borderTop: '1px dashed black', marginTop: '5px', paddingTop: '5px', width: '100%', fontSize: '9px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Waktu:</span>
                                <span>{selectedOrder.createdAt ? new Date(selectedOrder.createdAt.seconds * 1000).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : ''}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Admin:</span>
                                <span>{adminName.substring(0, 12)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Cust:</span>
                                <span>{selectedOrder.customerName?.substring(0, 12)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px', borderTop: '1px dotted black', paddingTop: '3px' }}>
                                <span style={{ fontWeight: 'bold' }}>MEJA:</span>
                                <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{selectedOrder.tableNumber}</span>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid black', marginTop: '5px', width: '100%' }}></div>
                        <div style={{ width: '100%', marginTop: '5px' }}>
                            {selectedOrder.items?.map((item, i) => (
                                <div key={i} style={{ marginBottom: '5px', fontSize: '10px' }}>
                                    <div style={{ fontWeight: 'bold', textTransform: 'uppercase', overflowWrap: 'break-word' }}>{item.name}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{item.qty} x {item.price.toLocaleString()}</span>
                                        <span style={{ fontWeight: 'bold' }}>{(item.qty * item.price).toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ borderTop: '1px solid black', marginTop: '5px', paddingTop: '5px', width: '100%', fontSize: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Subtotal:</span>
                                <span>{selectedOrder.subTotal?.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px', marginTop: '3px' }}>
                                <span>TOTAL:</span>
                                <span>Rp {selectedOrder.total?.toLocaleString()}</span>
                            </div>
                        </div>

                        <div style={{ border: '1px solid black', width: '100%', textAlign: 'center', marginTop: '8px', padding: '3px', fontWeight: 'bold', fontSize: '10px' }}>
                            {selectedOrder.paymentStatus === 'paid' ? 'LUNAS / PAID' : 'BELUM BAYAR'}
                        </div>

                        <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '8px' }}>
                            <p style={{ margin: '0' }}>TERIMA KASIH ATAS KUNJUNGANNYA</p>
                        </div>
                        <div style={{ height: '8mm' }}></div>
                    </div>
                )}
            </div>

            <div className="flex flex-col lg:flex-row justify-between items-start mb-6 gap-4 no-print">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><History className="text-orange-600" /> Riwayat Order</h1>

                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${showAll ? 'bg-orange-600 text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-200'}`}
                    >
                        <LayoutGrid size={18} /> {showAll ? 'Tampilan Filter' : 'Semua Transaksi'}
                    </button>

                    {!showAll && (
                        <input
                            type="date"
                            className="border rounded-xl px-3 py-2 bg-white font-medium"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />
                    )}

                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Cari ID / Nama..."
                            className="pl-10 pr-4 py-2 border rounded-xl w-full bg-white outline-none focus:ring-2 focus:ring-orange-500"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden no-print">
                <div className="overflow-x-auto">
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
                            {orders.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-400">
                                        Tidak ada data transaksi {showAll ? '' : `pada tanggal ${new Date(filterDate).toLocaleDateString('id-ID')}`}.
                                    </td>
                                </tr>
                            )}
                            {orders.filter(o => (o.orderId || '').toLowerCase().includes(searchTerm.toLowerCase()) || (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())).map(order => (
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
                                            <button onClick={(e) => handleDelete(e, order.id)} className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors"><Trash2 size={18} /></button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-slate-900 p-4 text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-2">
                                <Receipt size={20} className="text-orange-400" />
                                <div>
                                    <h2 className="font-bold text-lg uppercase tracking-tight">Detail Transaksi</h2>
                                    <p className="text-xs text-slate-400 font-mono">#{selectedOrder.orderId}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="p-1 hover:bg-slate-700 rounded-full transition"><X size={24} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <span className="text-xs text-gray-500 block mb-1">Pelanggan</span>
                                    <span className="font-bold text-gray-800 flex items-center gap-1 text-xs uppercase"><User size={14} /> {selectedOrder.customerName || 'Guest'}</span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                                    <span className="text-xs text-gray-500 block mb-1">Meja</span>
                                    <span className="font-bold text-gray-800 text-lg">{selectedOrder.tableNumber}</span>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><ChefHat size={16} /> Rincian Menu</h3>
                                <div className="space-y-2">
                                    {selectedOrder.items?.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-200 last:border-0">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-slate-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px]">{item.qty}x</div>
                                                <span className="font-black text-slate-700 text-xs uppercase">{item.name}</span>
                                            </div>
                                            <span className="font-black text-slate-900 text-xs">Rp {(item.price * item.qty).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-6 bg-slate-900 text-white p-5 rounded-3xl shadow-xl">
                                <div className="flex justify-between mb-2 text-[10px] text-slate-400 uppercase font-black tracking-widest">
                                    <span>Subtotal</span>
                                    <span>Rp {selectedOrder.subTotal?.toLocaleString()}</span>
                                </div>
                                {selectedOrder.uniqueCode > 0 && (
                                    <div className="flex justify-between mb-2 text-[10px] text-orange-400 uppercase font-black tracking-widest">
                                        <span>Kode Unik</span>
                                        <span>+{selectedOrder.uniqueCode}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-3 border-t border-slate-700">
                                    <span className="font-black text-xs uppercase tracking-widest text-orange-400">Total Bayar</span>
                                    <span className="font-black text-2xl text-white tracking-tighter">Rp {selectedOrder.total?.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 flex flex-col gap-2 shrink-0">
                            <button onClick={() => handlePrintAction(selectedOrder)} disabled={isPrinting} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all">
                                {isPrinting ? <Loader2 className="animate-spin" /> : <Printer size={20} />} Cetak Struk Sekarang
                            </button>
                            {selectedOrder.paymentStatus !== 'paid' && (
                                <button onClick={(e) => handleMarkAsPaid(e, selectedOrder.id)} className="w-full bg-green-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all">
                                    <Banknote size={20} /> Konfirmasi Lunas
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {proofImage && (
                <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4 backdrop-blur-sm no-print" onClick={() => setProofImage(null)}>
                    <div className="relative bg-white p-2 rounded-lg max-w-lg max-h-[90vh] overflow-auto flex flex-col shadow-2xl">
                        <div className="flex justify-between items-center mb-2 px-2 pt-2 bg-white">
                            <h3 className="font-bold text-gray-800">Bukti Transfer</h3>
                            <button onClick={() => setProofImage(null)} className="bg-gray-100 p-1 rounded-full transition-colors hover:bg-red-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <img src={proofImage} alt="Bukti" className="max-w-full rounded-b-lg" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminHistory;