import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { Plus, Trash2, Printer, QrCode, Layers, Loader2 } from 'lucide-react';
import QRCodeGen from 'qrcode'; // Library baru (npm install qrcode)
import toast from 'react-hot-toast';

const AdminTables = () => {
    const [tables, setTables] = useState([]);
    const [newTableNum, setNewTableNum] = useState('');
    const [isPrinting, setIsPrinting] = useState(false); // Indikator Loading Print

    useEffect(() => {
        const q = query(collection(db, "tables"), orderBy("createdAt", "asc"));
        const unsub = onSnapshot(q, (snapshot) => {
            setTables(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, []);

    const handleAddTable = async (e) => {
        e.preventDefault();
        if (!newTableNum.trim()) return;
        try {
            await addDoc(collection(db, "tables"), { tableNumber: newTableNum, createdAt: new Date() });
            toast.success("Berhasil");
            setNewTableNum('');
        } catch (error) { toast.error("Gagal"); }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Hapus meja ini?")) await deleteDoc(doc(db, "tables", id));
    };

    // --- FUNGSI PRINT SATUAN (QR Lokal Base64) ---
    const printSingleQR = async (table) => {
        setIsPrinting(true);
        try {
            const url = `${window.location.origin}/?table=${table.tableNumber}`;
            // Generate QR jadi Base64 Image (Instan, tidak butuh internet saat print)
            const qrDataUrl = await QRCodeGen.toDataURL(url, { width: 300, margin: 2 });

            const html = `
        <html>
          <body style="display:flex; justify-content:center; align-items:center; height:100vh; margin:0; padding:0;">
            <div style="border:4px solid black; padding:20px; text-align:center; width:300px; box-sizing:border-box;">
              <h2 style="font-family:sans-serif; margin:0 0 10px 0; font-size: 24px;">SCAN ORDER</h2>
              <img src="${qrDataUrl}" style="width:200px; height:200px; display:block; margin: 0 auto;" />
              <h1 style="font-family:sans-serif; font-size:40px; margin:10px 0 0 0; font-weight:900;">${table.tableNumber}</h1>
              <p style="font-family:sans-serif; margin-top:5px; font-size:15px">Pesan Dengan cara scan QR ini</p>
              <p style="font-family:sans-serif; margin-top:5px;">Cafe Futura</p>
            </div>
          </body>
        </html>
      `;

            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            const doc = iframe.contentWindow.document;
            doc.open(); doc.write(html); doc.close();

            setTimeout(() => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
                document.body.removeChild(iframe);
                setIsPrinting(false);
            }, 300); // Delay dikit biar render browser aman
        } catch (err) {
            toast.error("Gagal Generate QR");
            setIsPrinting(false);
        }
    };

    // --- FUNGSI PRINT SEMUA (A4 Grid - QR Lokal) ---
    const printAllQR = async () => {
        if (tables.length === 0) return toast.error("Belum ada meja!");
        setIsPrinting(true);

        try {
            // Generate semua QR Code dulu dalam bentuk Base64
            const qrPromises = tables.map(async (table) => {
                const url = `${window.location.origin}/?table=${table.tableNumber}`;
                const qrDataUrl = await QRCodeGen.toDataURL(url, { width: 150, margin: 1 });
                return { ...table, qrDataUrl };
            });

            const tablesWithQR = await Promise.all(qrPromises);

            // Susun HTML Grid
            const itemsHtml = tablesWithQR.map(t => `
          <div style="border:2px dashed #000; padding:10px; text-align:center; page-break-inside: avoid;">
              <div style="font-weight:bold; font-size:12px; font-family:sans-serif; margin-bottom:5px;">SCAN UTK PESAN</div>
              <img src="${t.qrDataUrl}" style="width:100px; height:100px;" />
              <div style="font-weight:900; font-size:24px; font-family:sans-serif; text-transform:uppercase; margin-top:5px;"> ${t.tableNumber}</div>
          </div>
      `).join('');

            const html = `
        <html>
          <head>
            <style>
             @page { size: A4; margin: 10mm; }
             body { font-family: sans-serif; -webkit-print-color-adjust: exact; }
             .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
             h1 { text-align: center; margin-bottom: 20px; text-transform: uppercase; }
            </style>
          </head>
          <body>
             <h1>QR Code Master - ${tables.length} Meja</h1>
             <div class="grid">${itemsHtml}</div>
          </body>
        </html>
      `;

            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            const doc = iframe.contentWindow.document;
            doc.open(); doc.write(html); doc.close();

            setTimeout(() => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
                document.body.removeChild(iframe);
                setIsPrinting(false);
            }, 500);

        } catch (err) {
            console.error(err);
            toast.error("Gagal Memproses QR");
            setIsPrinting(false);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <QrCode className="text-orange-600" /> Manajemen Meja
                </h1>
                <button
                    onClick={printAllQR}
                    disabled={isPrinting}
                    className={`bg-slate-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${isPrinting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700'} shadow-lg`}
                >
                    {isPrinting ? <Loader2 className="animate-spin" size={18} /> : <Layers size={18} />}
                    {isPrinting ? 'Memproses...' : 'Cetak Semua (A4)'}
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border mb-8 flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Tambah Meja</label>
                    <input type="text" placeholder="Cth: 1, 2, A1..." className="w-full border p-3 rounded-lg outline-none"
                        value={newTableNum} onChange={e => setNewTableNum(e.target.value)} />
                </div>
                <button onClick={handleAddTable} className="bg-orange-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-700 flex items-center gap-2">
                    <Plus size={20} /> Simpan
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {tables.map(table => (
                    <div key={table.id} className="bg-white p-4 rounded-xl shadow-sm border flex flex-col items-center hover:shadow-md transition">
                        <span className="text-2xl font-bold text-gray-700 mb-3">{table.tableNumber}</span>
                        <div className="flex w-full gap-2">
                            <button
                                onClick={() => printSingleQR(table)}
                                disabled={isPrinting}
                                className="flex-1 bg-slate-800 text-white py-2 rounded text-xs font-bold flex items-center justify-center gap-1 hover:bg-slate-700 disabled:bg-gray-400"
                            >
                                <Printer size={14} /> {isPrinting ? '...' : 'QR'}
                            </button>
                            <button onClick={() => handleDelete(table.id)} className="px-3 bg-red-100 text-red-600 rounded hover:bg-red-200"><Trash2 size={14} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminTables;