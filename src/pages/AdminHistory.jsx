import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, updateDoc, doc, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { History, Search, Trash2, CheckCircle, XCircle, Eye, X, Receipt, User, ChefHat, Banknote, Printer, Loader2 } from 'lucide-react';
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
    const [isPrinting, setIsPrinting] = useState(false);

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

    // Fungsi Print Manual agar style sama persis dengan Live Orders
    const handlePrintAction = (order) => {
        setSelectedOrder(order);
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
            // Jangan set null agar modal detail tidak tertutup otomatis jika sedang dibuka
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
            {/* CSS Print Khusus Struk 58mm */}
            <style>
                {`
                @media print {
                    body * { visibility: hidden; }
                    #print-receipt-history, #print-receipt-history * { visibility: visible; }
                    #print-receipt-history {
                        position: absolute;
                        left: 0;
                        right: 0;
                        top: 0;
                        margin: 0 auto !important;
                        width: 46mm;
                        padding: 0;
                        background: white;
                        display: block !important;
                    }
                    @page { size: 58mm auto; margin: 0; }
                }
                `}
            </style>

            {/* AREA STRUK TERSEMBUNYI (Hanya muncul saat print) */}
            <div id="print-receipt-history" className="hidden print:block bg-white text-black font-mono" style={{ width: '46mm', margin: '0 auto', padding: '5px', fontSize: '11px' }}>
                {selectedOrder && (
                    <div className="flex flex-col items-center w-full">
                        <img src="/assets/logo.png" alt="LOGO" style={{ height: '45px', width: '45px', objectFit: 'contain', marginBottom: '5px', filter: 'grayscale(1)', marginLeft: 'auto', marginRight: 'auto', display: 'block' }} />
                        <h2 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0', textAlign: 'center', lineHeight: '1.2', width: '100%' }}>TAKI COFFEE & EATERY</h2>
                        <div style={{ fontSize: '8px', textAlign: 'center', borderTop: '1.5px solid black', marginTop: '6px', paddingTop: '6px', width: '100%', lineHeight: '1.3' }}>
                            <p style={{ margin: '0' }}>Jl. Taman Kenten, Duku, Ilir Tim. II</p>
                            <p style={{ margin: '0' }}>Palembang, Sumatera Selatan</p>
                            <p style={{ margin: '0' }}>0812-7156-2248</p>
                        </div>
                        <div style={{ borderTop: '1px dashed black', marginTop: '6px', paddingTop: '6px', width: '100%', textAlign: 'center', fontSize: '10px' }}>
                            {selectedOrder.createdAt ? new Date(selectedOrder.createdAt.seconds * 1000).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                        </div>
                        <div style={{ borderTop: '1px dashed black', marginTop: '6px', paddingTop: '6px', width: '100%', fontSize: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Admin:</span><span>{adminName.substring(0, 8)}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Cust:</span><span>{selectedOrder.customerName?.substring(0, 10)}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Trx:</span><span>{selectedOrder.orderId}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', borderTop: '1px dotted black', paddingTop: '5px' }}>
                                <span style={{ fontWeight: 'bold' }}>MEJA:</span>
                                <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{selectedOrder.tableNumber}</span>
                            </div>
                        </div>
                        <div style={{ borderTop: '1.5px solid black', marginTop: '6px', width: '100%' }}></div>
                        <div style={{ width: '100%', marginTop: '6px' }}>
                            {selectedOrder.items.map((item, i) => (
                                <div key={i} style={{ marginBottom: '6px' }}>
                                    <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', lineHeight: '1.2', textAlign: 'left' }}>{item.name}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '2px' }}>
                                        <span>{item.qty} x {item.price.toLocaleString()}</span>
                                        <span style={{ fontWeight: 'bold' }}>{(item.qty * item.price).toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ borderTop: '1.5px solid black', marginTop: '6px', paddingTop: '6px', width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>{selectedOrder.subTotal?.toLocaleString()}</span></div>
                            {selectedOrder.uniqueCode > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Unik</span><span>{selectedOrder.uniqueCode}</span></div>}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginTop: '3px', borderTop: '1px solid black', paddingTop: '4px' }}>
                                <span>TOTAL</span><span>Rp {selectedOrder.total?.toLocaleString()}</span>
                            </div>
                        </div>
                        <div style={{ border: '1.5px solid black', width: '100%', textAlign: 'center', marginTop: '10px', padding: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                            {selectedOrder.paymentStatus === 'paid' ? 'LUNAS / PAID' : 'BELUM BAYAR'}
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '9px', borderTop: '1px dotted black', paddingTop: '6px' }}>
                            <p style={{ margin: '0' }}>TERIMA KASIH TELAH BERKUNJUNG</p>
                        </div>
                        <div style={{ height: '15mm' }}></div>
                    </div>
                )}
            </div>

            {/* UI MONITOR (NO PRINT) */}
            <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4 no-print">
                <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2 uppercase tracking-tighter">
                    <History className="text-orange-600" /> Riwayat Order
                </h1>

                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <input type="date" className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-orange-500" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
                    <div className="relative flex-1 md:w-64 font-bold">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input type="text" placeholder="Cari ID / Nama..." className="pl-10 pr-4 py-2 border-2 border-slate-200 rounded-xl w-full text-sm outline-none focus:border-orange-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden no-print">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest">
                            <tr>
                                <th className="p-4">ID / Waktu</th>
                                <th className="p-4">Pelanggan</th>
                                <th className="p-4">Total</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {orders.length === 0 && <tr><td colSpan="6" className="p-12 text-center text-gray-400 font-bold uppercase text-xs tracking-widest">Belum ada data.</td></tr>}
                            {orders.filter(o => o.orderId.toLowerCase().includes(searchTerm.toLowerCase()) || o.customerName.toLowerCase().includes(searchTerm.toLowerCase())).map(order => (
                                <tr key={order.id} onClick={() => setSelectedOrder(order)} className="hover:bg-slate-50 cursor-pointer text-sm transition-all animate-in fade-in">
                                    <td className="p-4">
                                        <div className="font-black text-slate-900 uppercase text-xs">{order.orderId}</div>
                                        <div className="text-[10px] text-gray-400 font-bold">{new Date(order.createdAt?.seconds * 1000).toLocaleTimeString()}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-black text-slate-800 uppercase text-xs">{order.customerName}</div>
                                        <div className="text-[10px] font-black text-orange-500 uppercase">Meja {order.tableNumber}</div>
                                    </td>
                                    <td className="p-4 font-black text-slate-900">Rp {order.total?.toLocaleString()}</td>
                                    <td className="p-4">
                                        {order.paymentStatus === 'paid' ?
                                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">PAID</span> :
                                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">UNPAID</span>
                                        }
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); handlePrintAction(order); }} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                                                <Printer size={16} />
                                            </button>
                                            {role === 'head' && <button onClick={(e) => handleDelete(e, order.id)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DETAIL */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print animate-in fade-in">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-4 border-white">
                        <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Receipt size={24} className="text-orange-400" />
                                <div>
                                    <h2 className="font-black text-sm uppercase tracking-widest">Detail Invoice</h2>
                                    <p className="text-[10px] text-slate-400 font-mono tracking-widest">{selectedOrder.orderId}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-slate-700 rounded-full transition"><X size={24} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <span className="text-[9px] text-slate-400 uppercase font-black block mb-1">Pelanggan</span>
                                    <span className="font-black text-slate-800 flex items-center gap-2 uppercase text-xs"><User size={14} /> {selectedOrder.customerName}</span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                                    <span className="text-[9px] text-slate-400 uppercase font-black block mb-1">Nomor Meja</span>
                                    <span className="font-black text-2xl text-orange-600">{selectedOrder.tableNumber}</span>
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

                            <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl">
                                <div className="flex justify-between mb-2 text-[10px] text-slate-400 uppercase font-black tracking-widest">
                                    <span>Subtotal</span>
                                    <span>Rp {selectedOrder.subTotal?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-slate-700">
                                    <span className="font-black text-xs uppercase tracking-widest text-orange-400">Total Bayar</span>
                                    <span className="font-black text-2xl text-white tracking-tighter">Rp {selectedOrder.total?.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 flex flex-col gap-2">
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
        </div>
    );
};

export default AdminHistory;