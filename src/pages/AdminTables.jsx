import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { Plus, Trash2, Printer, QrCode, Layers, Loader2, Download } from 'lucide-react';
import QRCodeGen from 'qrcode';
import toast from 'react-hot-toast';

const AdminTables = () => {
    const [tables, setTables] = useState([]);
    const [newTableNum, setNewTableNum] = useState('');
    const [isPrinting, setIsPrinting] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "tables"), orderBy("createdAt", "asc"));
        const unsub = onSnapshot(q, (snapshot) => {
            setTables(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, []);

    const generateStyledQRHTML = (qrDataUrl, tableNumber) => {
        return `
            <div style="
                border: 15px solid #000;
                padding: 40px;
                text-align: center;
                width: 400px;
                background: #fff;
                box-sizing: border-box;
                font-family: 'Arial Black', sans-serif;
                margin: 20px;
                position: relative;
            ">
                <div style="
                    border: 4px solid #000;
                    padding: 10px;
                    margin-bottom: 20px;
                ">
                    <h2 style="margin: 0; font-size: 28px; letter-spacing: 2px;">SCAN TO ORDER</h2>
                </div>
                
                <div style="background: #000; padding: 15px; display: inline-block;">
                    <img src="${qrDataUrl}" style="width: 280px; height: 280px; display: block; filter: contrast(1.2);" />
                </div>

                <div style="margin-top: 30px;">
                    <span style="font-size: 20px; display: block; margin-bottom: -10px;">TABLE</span>
                    <h1 style="font-size: 110px; margin: 0; line-height: 1; font-weight: 900;">${tableNumber}</h1>
                </div>

                <div style="
                    margin-top: 25px;
                    border-top: 5px solid #000;
                    padding-top: 15px;
                ">
                    <p style="margin: 0; font-size: 18px; font-weight: bold;">Taki Coffee & Eatery</p>
                    <p style="margin: 5px 0 0 0; font-size: 12px; font-family: sans-serif; opacity: 0.8;">Premium Experience • Easy Ordering</p>
                </div>
            </div>
        `;
    };

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

    const downloadSingleQR = async (table) => {
        try {
            const url = `${window.location.origin}/login?table=${table.tableNumber}`;
            const qrDataUrl = await QRCodeGen.toDataURL(url, {
                width: 1000,
                margin: 1,
                color: { dark: '#000000', light: '#ffffff' }
            });

            const canvas = document.createElement('canvas');
            canvas.width = 1200;
            canvas.height = 1750;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#000000';
            ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(65, 65, canvas.width - 130, canvas.height - 130);

            ctx.fillStyle = '#000000';
            ctx.textAlign = 'center';
            ctx.font = '900 85px Arial';
            ctx.fillText('SCAN TO ORDER', canvas.width / 2, 230);

            ctx.fillRect(canvas.width / 2 - 400, 260, 800, 10);

            const img = new Image();
            img.src = qrDataUrl;

            img.onload = () => {
                const qrSize = 850;
                const qrX = (canvas.width - qrSize) / 2;
                const qrY = 350;

                ctx.fillStyle = '#000000';
                ctx.fillRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);
                ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

                ctx.fillStyle = '#000000';
                ctx.font = 'bold 60px Arial';
                ctx.fillText('TABLE', canvas.width / 2, 1340);

                ctx.font = '900 320px Arial';
                ctx.fillText(table.tableNumber, canvas.width / 2, 1610);

                ctx.font = 'bold 55px Arial';
                ctx.fillText('Taki Coffee & Eatery', canvas.width / 2, 1690);

                const link = document.createElement('a');
                link.download = `QR_Taki_Meja_${table.tableNumber}.png`;
                link.href = canvas.toDataURL('image/png', 1.0);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success(`Gambar QR Meja ${table.tableNumber} Disimpan`);
            };

        } catch (error) {
            console.error(error);
            toast.error("Gagal Download Gambar");
        }
    };

    const printSingleQR = async (table) => {
        setIsPrinting(true);
        try {
            const url = `${window.location.origin}/login?table=${table.tableNumber}`;
            const qrDataUrl = await QRCodeGen.toDataURL(url, { width: 400, margin: 2 });

            const htmlContent = generateStyledQRHTML(qrDataUrl, table.tableNumber);

            const html = `
                <html>
                  <head><title>Print QR</title></head>
                  <body style="display:flex; justify-content:center; align-items:center; height:100vh; margin:0; padding:0; background:#fff;">
                    ${htmlContent}
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
            toast.error("Gagal Generate QR");
            setIsPrinting(false);
        }
    };

    const printAllQR = async () => {
        if (tables.length === 0) return toast.error("Belum ada meja!");
        setIsPrinting(true);

        try {
            const qrPromises = tables.map(async (table) => {
                const url = `${window.location.origin}/login?table=${table.tableNumber}`;
                const qrDataUrl = await QRCodeGen.toDataURL(url, { width: 400, margin: 2 });
                return generateStyledQRHTML(qrDataUrl, table.tableNumber);
            });

            const qrHtmls = await Promise.all(qrPromises);

            const html = `
                <html>
                  <head>
                    <style>
                      @page { size: A4; margin: 0; }
                      body { font-family: sans-serif; margin: 0; padding: 20px; }
                      .container { 
                        display: grid; 
                        grid-template-columns: repeat(2, 1fr); 
                        justify-items: center;
                        gap: 10px;
                      }
                      .page-header { grid-column: 1 / -1; text-align: center; font-weight: 900; font-size: 24px; margin-bottom: 20px; text-transform: uppercase; border-bottom: 5px solid #000; padding-bottom: 10px; }
                      @media print {
                         div { page-break-inside: avoid; }
                      }
                    </style>
                  </head>
                  <body>
                      <div class="container">
                        <div class="page-header">QR CODE MASTER - TAKI COFFEE</div>
                        ${qrHtmls.join('')}
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
            }, 800);

        } catch (err) {
            console.error(err);
            toast.error("Gagal Memproses QR");
            setIsPrinting(false);
        }
    };

    return (
        <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
                        <div className="p-2 bg-orange-600 rounded-lg shadow-lg shadow-orange-200">
                            <QrCode className="text-white" size={28} />
                        </div>
                        Manajemen Meja
                    </h1>
                    <p className="text-slate-400 font-bold text-xs mt-1 uppercase tracking-widest ml-12">Generate & Print Table QR Codes</p>
                </div>
                <button
                    onClick={printAllQR}
                    disabled={isPrinting}
                    className={`bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 ${isPrinting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800 hover:shadow-xl'} shadow-lg`}
                >
                    {isPrinting ? <Loader2 className="animate-spin" size={18} /> : <Layers size={18} />}
                    {isPrinting ? 'Memproses...' : 'Cetak Semua Meja'}
                </button>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 mb-10 group transition-all">
                <form onSubmit={handleAddTable} className="flex flex-col md:flex-row gap-5 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em] ml-1">Nama / Nomor Meja</label>
                        <input
                            type="text"
                            placeholder="Cth: 01, VIP, A1..."
                            className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-orange-500 focus:bg-white transition-all font-black text-slate-700"
                            value={newTableNum}
                            onChange={e => setNewTableNum(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="w-full md:w-auto bg-orange-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                        <Plus size={20} /> Simpan Meja
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {tables.map(table => (
                    <div key={table.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border-2 border-white hover:border-orange-100 hover:shadow-2xl transition-all duration-300 flex flex-col items-center group overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <QrCode size={60} />
                        </div>

                        <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                            <span className="text-2xl font-black text-white">{table.tableNumber}</span>
                        </div>

                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Meja Aktif</span>

                        <div className="flex flex-col w-full gap-2 relative z-10">
                            <button
                                onClick={() => printSingleQR(table)}
                                disabled={isPrinting}
                                className="w-full bg-slate-900 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-md active:scale-95"
                            >
                                <Printer size={14} /> Print QR
                            </button>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => downloadSingleQR(table)}
                                    className="flex-1 bg-blue-50 text-blue-600 py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-blue-100 transition-all active:scale-95"
                                    title="Download PNG"
                                >
                                    <Download size={14} /> PNG
                                </button>

                                <button
                                    onClick={() => handleDelete(table.id)}
                                    className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-red-100 transition-all active:scale-95"
                                >
                                    <Trash2 size={14} /> Hapus
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {tables.length === 0 && (
                <div className="text-center py-20 bg-white rounded-[3rem] border-4 border-dashed border-slate-100">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Layers className="text-slate-300" size={32} />
                    </div>
                    <p className="font-black text-slate-300 uppercase tracking-widest">Belum ada meja terdaftar</p>
                </div>
            )}
        </div>
    );
};

export default AdminTables;