import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { CheckCircle, ChefHat, BellRing, Printer, Search, Edit2, X, Plus, Minus, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminLiveOrders = () => {
    const [orders, setOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingOrder, setEditingOrder] = useState(null);

    // --- FUNGSI PRINT SAT-SET (HTML INJECTION) ---
    const printReceiptSatSet = (order) => {
        // 1. Buat Iframe tersembunyi
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        // 2. Siapkan Konten HTML (Mirip kodingan web biasa)
        const itemsHtml = order.items.map(item => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
        <div style="display: flex; gap: 5px;">
          <span style="font-weight: bold;">${item.qty || item.quantity}x</span>
          <span>${item.name}</span>
        </div>
        <span>${(item.price * (item.qty || item.quantity)).toLocaleString('id-ID')}</span>
      </div>
    `).join('');

        const receiptHtml = `
      <html>
        <head>
          <title>Print Struk</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: 'Courier New', monospace; margin: 0; padding: 10px; width: 80mm; font-size: 12px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-bottom: 1px dashed black; margin: 10px 0; }
            .flex { display: flex; justify-content: space-between; }
            .uppercase { text-transform: uppercase; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 16px;">CAFE FUTURA</div>
          <div class="center" style="font-size: 10px;">Jl. Teknologi No. 88</div>
          <div class="line"></div>
          
          <div class="flex"><span>ID:</span><span>${order.orderId}</span></div>
          <div class="flex"><span>Tgl:</span><span>${new Date().toLocaleDateString('id-ID')}</span></div>
          <div class="flex bold"><span>Tipe:</span><span class="uppercase">${order.diningOption === 'takeaway' ? 'AMBIL' : 'DINE-IN'}</span></div>
          <div class="flex"><span>Meja:</span><span>${order.tableNumber}</span></div>
          <div class="flex"><span>Cust:</span><span>${order.customerName.split(' ')[0]}</span></div>
          
          <div class="line"></div>
          ${itemsHtml}
          <div class="line"></div>
          
          <div class="flex"><span>Subtotal</span><span>${order.subTotal?.toLocaleString('id-ID')}</span></div>
          ${order.adminFee > 0 ? `<div class="flex"><span>Layanan</span><span>${order.adminFee.toLocaleString('id-ID')}</span></div>` : ''}
          
          <div class="flex bold" style="font-size: 14px; margin-top: 5px;">
            <span>TOTAL</span><span>Rp ${order.total?.toLocaleString('id-ID')}</span>
          </div>
          <div class="flex" style="font-size: 10px; margin-top: 5px;">
             <span>Bayar:</span><span class="uppercase">${order.paymentMethod}</span>
          </div>

          <div class="line"></div>
          
          ${order.note ? `<div style="border:1px solid #000; padding:5px; margin-bottom:10px; font-weight:bold;">Note: ${order.note}</div>` : ''}
          
          <div class="center bold">*** LUNAS ***</div>
          <div class="center" style="font-size: 10px; margin-top: 5px;">Powered By Futura Link</div>
        </body>
      </html>
    `;

        // 3. Tulis ke Iframe dan Print
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(receiptHtml);
        doc.close();

        // Tunggu gambar/font load sebentar (100ms cukup), lalu print
        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            // Hapus iframe setelah selesai (biar gak menuhin memori)
            setTimeout(() => document.body.removeChild(iframe), 1000);
        }, 100);
    };
    // --- END FUNGSI PRINT ---

    useEffect(() => {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(o => o.status !== 'completed');
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
            toast.success(`Status: ${nextStatus.toUpperCase()}`);
        }
    };

    const handleEditItemQty = (index, delta) => {
        if (!editingOrder) return;
        const newItems = [...editingOrder.items];
        newItems[index].qty += delta;
        if (newItems[index].qty < 1) newItems[index].qty = 1;
        const newSubTotal = newItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
        const newTotal = newSubTotal + (editingOrder.adminFee || 0);
        setEditingOrder({ ...editingOrder, items: newItems, subTotal: newSubTotal, total: newTotal });
    };

    const saveEditedOrder = async () => {
        try {
            await updateDoc(doc(db, "orders", editingOrder.id), {
                items: editingOrder.items,
                subTotal: editingOrder.subTotal,
                total: editingOrder.total
            });
            setEditingOrder(null);
            toast.success("Edit Berhasil");
        } catch (error) { toast.error("Gagal Edit"); }
    };

    const filteredOrders = orders.filter(o =>
        (o.orderId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <BellRing className="text-orange-600" /> Pesanan Masuk
                </h1>
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input type="text" placeholder="Cari Order..." className="pl-10 pr-4 py-2 border rounded-xl outline-none w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredOrders.map(order => (
                    <div key={order.id} className="bg-white rounded-xl shadow-sm border-l-4 border-orange-500 p-4 relative transition hover:shadow-md">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className="font-bold text-lg">Meja {order.tableNumber}</span>
                                <p className="text-xs text-gray-500">{order.customerName}</p>
                            </div>
                            <div className="text-right">
                                <span className="px-2 py-1 rounded text-[10px] font-bold uppercase block mb-1 bg-gray-100">{order.status}</span>
                                <p className="text-[10px] text-gray-500 font-bold bg-yellow-100 px-1 rounded">{order.orderId}</p>
                            </div>
                        </div>

                        <div className={`text-xs font-bold py-1 px-2 rounded mb-3 inline-block ${order.diningOption === 'takeaway' ? 'bg-purple-100 text-purple-700' : 'bg-orange-50 text-orange-700'}`}>
                            {order.diningOption === 'takeaway' ? '🛍️ AMBIL SENDIRI' : '🍽️ DINE IN'}
                        </div>

                        {order.note && <div className="bg-yellow-50 p-2 rounded border border-yellow-200 text-xs italic mb-2 text-gray-600">"{order.note}"</div>}

                        <div className="space-y-1 mb-4 text-sm border-t border-b py-2 border-dashed">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between">
                                    <span><b>{item.qty}x</b> {item.name}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => changeStatus(order.id, order.status)} className="flex-1 bg-slate-800 text-white py-2 rounded text-sm font-bold hover:bg-slate-700 flex justify-center items-center gap-2">
                                {order.status === 'pending' && <><ChefHat size={16} /> Masak</>}
                                {order.status === 'cooking' && <><BellRing size={16} /> Siap</>}
                                {order.status === 'ready' && <><CheckCircle size={16} /> Selesai</>}
                            </button>
                            <button onClick={() => setEditingOrder(order)} className="px-3 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 border border-blue-200">
                                <Edit2 size={18} />
                            </button>

                            {/* TOMBOL PRINT SUPER CEPAT */}
                            <button
                                onClick={() => printReceiptSatSet(order)}
                                className="px-3 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300 shadow-sm"
                                title="Print Struk Instan"
                            >
                                <Printer size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* EDIT MODAL */}
            {editingOrder && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <div className="flex justify-between mb-4"><h3 className="font-bold">Edit Order</h3><button onClick={() => setEditingOrder(null)}><X /></button></div>
                        <div className="space-y-3 max-h-[50vh] overflow-y-auto mb-4">
                            {editingOrder.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center border p-2 rounded">
                                    <span className="text-sm font-medium w-1/2 truncate">{item.name}</span>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => handleEditItemQty(idx, -1)} className="bg-gray-200 p-1 rounded"><Minus size={14} /></button>
                                        <span className="font-bold w-4 text-center">{item.qty}</span>
                                        <button onClick={() => handleEditItemQty(idx, 1)} className="bg-gray-200 p-1 rounded"><Plus size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={saveEditedOrder} className="w-full bg-blue-600 text-white py-2 rounded-lg">Simpan</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminLiveOrders;