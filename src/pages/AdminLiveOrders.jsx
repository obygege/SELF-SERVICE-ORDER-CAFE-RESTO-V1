import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { ChefHat, BellRing, Printer, Search, X, Banknote, Clock, Eye, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminLiveOrders = () => {
    const { currentUser } = useAuth();
    const role = currentUser?.role || 'admin';
    const adminName = currentUser?.displayName || 'Admin';

    const [orders, setOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const [proofModalOrder, setProofModalOrder] = useState(null);
    const [lastProcessedId, setLastProcessedId] = useState(null);

    const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

    useEffect(() => {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snapshot) => {
            let list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(o => o.status !== 'completed');

            if (role === 'kitchen') {
                list = list.filter(o => o.items.some(i => i.category === 'food'));
            } else if (role === 'barista') {
                list = list.filter(o => o.items.some(i => i.category === 'drink'));
            }

            setOrders(list);

            if (list.length > 0) {
                const newestOrder = list[0];
                if (newestOrder.id !== lastProcessedId && newestOrder.status === 'pending') {
                    setLastProcessedId(newestOrder.id);
                    audioRef.current.play().catch(() => { });
                    toast("Pesanan Baru Masuk!", { icon: '🔔', duration: 4000 });
                }
            }
        });
        return () => unsub();
    }, [role, lastProcessedId]);

    const handlePrintAction = (order) => {
        setSelectedOrder(order);
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
            setSelectedOrder(null);
        }, 500);
    };

    const confirmPayment = async (id) => {
        if (window.confirm("Konfirmasi pembayaran lunas?")) {
            try {
                await updateDoc(doc(db, "orders", id), {
                    paymentStatus: 'paid',
                    verifiedBy: adminName
                });
                setProofModalOrder(null);
                toast.success("Pembayaran Lunas & Terverifikasi");
            } catch (error) {
                toast.error("Gagal verifikasi");
            }
        }
    };

    const rejectPayment = async (id) => {
        const reason = window.prompt("Alasan penolakan:", "Bukti tidak valid");
        if (reason) {
            try {
                await updateDoc(doc(db, "orders", id), {
                    status: 'payment_rejected',
                    paymentStatus: 'unpaid',
                    note: `Ditolak: ${reason}`
                });
                setProofModalOrder(null);
                toast.error("Pembayaran Ditolak");
            } catch (error) {
                toast.error("Gagal menolak");
            }
        }
    };

    const changeStatus = async (id, currentStatus) => {
        let nextStatus = '';
        if (role === 'kitchen' || role === 'barista') {
            if (currentStatus === 'pending') nextStatus = 'cooking';
            else if (currentStatus === 'cooking') nextStatus = 'ready';
        } else {
            if (window.confirm("Selesaikan pesanan ini? Pesanan akan dipindahkan ke Riwayat Selesai.")) {
                nextStatus = 'completed';
            }
        }
        if (nextStatus) {
            try {
                await updateDoc(doc(db, "orders", id), { status: nextStatus });
                toast.success(`Status: ${nextStatus.toUpperCase()}`);
            } catch (error) {
                toast.error("Gagal update status");
            }
        }
    };

    const filteredOrders = orders.filter(o =>
        (o.orderId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="font-sans p-4 pb-20">
            <style>
                {`
                @media print {
                    body * { visibility: hidden; }
                    #print-receipt, #print-receipt * { visibility: visible; }
                    #print-receipt {
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
                    @page { 
                        size: 58mm auto; 
                        margin: 0; 
                    }
                }
                `}
            </style>

            <div id="print-receipt" className="hidden print:block bg-white text-black font-mono" style={{ width: '46mm', margin: '0 auto', padding: '5px', fontSize: '11px' }}>
                {selectedOrder && (
                    <div className="flex flex-col items-center w-full">
                        <img
                            src="/assets/logo.png"
                            alt="LOGO"
                            style={{ height: '45px', width: '45px', objectFit: 'contain', marginBottom: '5px', filter: 'grayscale(1)', marginLeft: 'auto', marginRight: 'auto', display: 'block' }}
                        />
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
                            {selectedOrder.uniqueCode > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Kode Unik</span><span>{selectedOrder.uniqueCode}</span></div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginTop: '3px', borderTop: '1px solid black', paddingTop: '4px' }}>
                                <span>TOTAL</span><span>Rp {selectedOrder.total?.toLocaleString()}</span>
                            </div>
                        </div>

                        <div style={{ border: '1.5px solid black', width: '100%', textAlign: 'center', marginTop: '10px', padding: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                            {selectedOrder.paymentStatus === 'paid' ? 'LUNAS / PAID' : 'BELUM BAYAR'}
                        </div>

                        <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '9px', borderTop: '1px dotted black', paddingTop: '6px' }}>
                            <p style={{ margin: '0' }}>TERIMA KASIH TELAH BERKUNJUNG</p>
                            <p style={{ margin: '3px 0 0 0', fontWeight: 'bold' }}>Created By: Futura Link</p>
                        </div>
                        <div style={{ height: '15mm' }}></div>
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 no-print">
                <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tighter">
                    <BellRing className="text-orange-600 animate-bounce" /> {role === 'kitchen' ? 'Dapur' : role === 'barista' ? 'Bar' : 'Live Order'}
                </h1>
                <div className="relative w-full md:w-auto">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input type="text" placeholder="Cari..." className="pl-10 pr-4 py-2 border-2 border-slate-100 rounded-xl outline-none w-full md:w-64 focus:border-orange-500 font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 no-print">
                {filteredOrders.map(order => {
                    const isPaid = order.paymentStatus === 'paid';
                    const isRejected = order.status === 'payment_rejected';
                    const isQris = order.paymentMethod === 'QRIS Transfer' || order.proofImage;
                    const isKitchenBar = role === 'kitchen' || role === 'barista';

                    return (
                        <div key={order.id} className={`bg-white rounded-2xl shadow-sm border-l-8 p-5 flex flex-col ${isRejected ? 'border-gray-400' : isPaid ? 'border-green-500' : 'border-orange-500'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="font-black text-xl uppercase text-slate-900">Meja {order.tableNumber}</span>
                                    <div className="text-[10px] text-gray-400 font-bold flex items-center gap-1 mt-1 uppercase">
                                        <Clock size={12} /> {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString() : ''}
                                    </div>
                                    <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase">ID: {order.orderId}</div>
                                </div>
                                <div className="text-right">
                                    <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase bg-slate-100 text-slate-500 block mb-1">{order.status}</span>
                                    <span className={`text-[9px] font-black uppercase ${isPaid ? 'text-green-600' : 'text-red-600'}`}>{isPaid ? 'Lunas' : 'Belum Bayar'}</span>
                                </div>
                            </div>

                            <div className="mb-3 text-[11px] font-black text-slate-400 uppercase border-b pb-2">{order.customerName}</div>

                            <div className="space-y-1 mb-4 text-sm flex-1 bg-slate-50 p-3 rounded-xl">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-xs font-bold uppercase text-slate-700">
                                        <span><span className="text-orange-600">{item.qty}x</span> {item.name}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col gap-2">
                                {isQris && !isKitchenBar && !isPaid && !isRejected && (
                                    <button onClick={() => setProofModalOrder(order)} className="w-full bg-blue-600 text-white py-2 rounded-lg font-black text-[10px] uppercase flex justify-center gap-2 transition-all active:scale-95 shadow-md border-2 border-blue-700">
                                        <Eye size={14} /> Bukti Bayar & Verifikasi
                                    </button>
                                )}
                                {!isKitchenBar && !isPaid && !isRejected && !order.proofImage && (
                                    <button onClick={() => confirmPayment(order.id)} className="w-full bg-green-600 text-white py-3 rounded-xl font-black text-[10px] uppercase flex justify-center gap-2 transition-all active:scale-95 shadow-md border-2 border-green-700">
                                        <Banknote size={16} /> Terima Tunai (Manual)
                                    </button>
                                )}
                                <div className="flex gap-2">
                                    <button onClick={() => changeStatus(order.id, order.status)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase text-white shadow-md active:scale-95 transition-all ${isKitchenBar ? 'bg-orange-600' : 'bg-slate-900'}`}>
                                        {isKitchenBar ? (order.status === 'pending' ? 'Proses Masak' : 'Siap Saji') : 'Selesai / Simpan'}
                                    </button>
                                    <button onClick={() => handlePrintAction(order)} disabled={isPrinting} className="px-4 bg-gray-100 text-slate-500 rounded-xl border border-slate-100 flex items-center justify-center active:scale-95 transition-all shadow-sm">
                                        {isPrinting && selectedOrder?.id === order.id ? <Loader2 className="animate-spin" size={18} /> : <Printer size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {proofModalOrder && (
                <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md p-6 flex flex-col shadow-2xl border-4 border-white">
                        <div className="flex justify-between mb-4 items-center">
                            <div className="flex flex-col">
                                <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Verifikasi Pembayaran</h3>
                                <span className="text-[10px] font-bold text-slate-900 mt-1">{proofModalOrder.orderId}</span>
                            </div>
                            <button onClick={() => setProofModalOrder(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="bg-slate-100 rounded-2xl p-2 mb-4 flex justify-center items-center overflow-hidden border-2 border-slate-200 shadow-inner min-h-[300px]">
                            {proofModalOrder.proofImage ? (
                                <img
                                    src={proofModalOrder.proofImage}
                                    alt="Bukti Transfer"
                                    className="max-w-full rounded-lg max-h-[50vh] object-contain shadow-sm cursor-zoom-in"
                                    onClick={() => window.open(proofModalOrder.proofImage, '_blank')}
                                    onError={(e) => {
                                        e.target.src = "https://via.placeholder.com/400x600?text=Gambar+Tidak+Tersedia";
                                        toast.error("Gagal memuat gambar bukti");
                                    }}
                                />
                            ) : (
                                <div className="p-10 text-slate-400 font-bold uppercase text-[10px]">Bukti tidak ditemukan</div>
                            )}
                        </div>
                        <div className="bg-orange-50 p-4 rounded-2xl mb-6 text-center border border-orange-100">
                            <p className="text-[10px] font-black text-orange-400 uppercase mb-1">Total Tagihan:</p>
                            <p className="text-2xl font-black text-slate-900 tracking-tight">Rp {proofModalOrder.total?.toLocaleString()}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => rejectPayment(proofModalOrder.id)} className="bg-red-50 text-red-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-red-100 active:scale-95 transition-all shadow-sm">❌ TOLAK</button>
                            <button onClick={() => confirmPayment(proofModalOrder.id)} className="bg-green-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-lg shadow-green-100">✅ KONFIRMASI LUNAS</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminLiveOrders;