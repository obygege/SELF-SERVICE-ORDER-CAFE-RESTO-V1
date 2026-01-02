import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { Plus, Trash2, Printer, QrCode, Layers, Loader2, Download } from 'lucide-react';
import QRCodeGen from 'qrcode';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';

const AdminTables = () => {
    const [tables, setTables] = useState([]);
    const [newTableNum, setNewTableNum] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

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
                width: 400px;
                padding: 40px;
                background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
                border: 12px solid #ea580c;
                border-radius: 50px;
                text-align: center;
                font-family: Arial, sans-serif;
                margin: 0;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                align-items: center;
            ">
                <div style="color: #ea580c; padding: 12px 0; font-size: 26px; margin-bottom: 20px; font-weight: 900; letter-spacing: 3px; width: 100%;">
                    SCAN TO ORDER
                </div>
                <div style="background: white; padding: 20px; border-radius: 30px; display: inline-block; border: 4px solid #f97316;">
                    <img src="${qrDataUrl}" style="width: 250px; height: 250px; display: block;" />
                </div>
                <div style="margin-top: 30px;">
                    <span style="font-size: 18px; color: #ea580c; display: block; font-weight: bold;">TABLE NUMBER</span>
                    <h1 style="font-size: 120px; margin: 0; line-height: 1; color: #7c2d12; font-weight: 900;">${tableNumber}</h1>
                </div>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 4px solid #ea580c; width: 100%;">
                    <p style="margin: 0; font-size: 22px; font-weight: 900; color: #9a3412;">Taki Coffee & Eatery</p>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #ea580c; font-weight: bold;">PREMIUM COFFEE • QUALITY FOOD</p>
                </div>
            </div>
        `;
    };

    const handleAddTable = async (e) => {
        e.preventDefault();
        if (!newTableNum.trim()) return;
        try {
            await addDoc(collection(db, "tables"), { tableNumber: newTableNum, createdAt: new Date() });
            toast.success("Meja Ditambahkan");
            setNewTableNum('');
        } catch (error) { toast.error("Gagal"); }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Hapus meja ini?")) await deleteDoc(doc(db, "tables", id));
    };

    const downloadAsImage = async (table) => {
        setIsProcessing(true);
        const loading = toast.loading("Memproses Gambar...");
        try {
            const url = `${window.location.origin}/login?table=${table.tableNumber}`;
            const qrDataUrl = await QRCodeGen.toDataURL(url, { width: 600, margin: 2, errorCorrectionLevel: 'H' });
            
            const tempDiv = document.createElement('div');
            tempDiv.style.position = 'fixed';
            tempDiv.style.top = '0';
            tempDiv.style.left = '-1000px'; 
            tempDiv.innerHTML = generateStyledQRHTML(qrDataUrl, table.tableNumber);
            document.body.appendChild(tempDiv);

            await new Promise(resolve => setTimeout(resolve, 500));

            const canvas = await html2canvas(tempDiv, { useCORS: true, scale: 2, backgroundColor: null });
            
            const link = document.createElement('a');
            link.download = `QR_Meja_${table.tableNumber}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            
            document.body.removeChild(tempDiv);
            toast.success("Berhasil diunduh", { id: loading });
        } catch (err) {
            toast.error("Gagal memproses", { id: loading });
        } finally {
            setIsProcessing(false);
        }
    };

    const printSingleQR = async (table) => {
        setIsProcessing(true);
        try {
            const url = `${window.location.origin}/login?table=${table.tableNumber}`;
            const qrDataUrl = await QRCodeGen.toDataURL(url, { width: 400, margin: 2 });
            const htmlContent = generateStyledQRHTML(qrDataUrl, table.tableNumber);
            const html = `<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">${htmlContent}</body></html>`;
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            const doc = iframe.contentWindow.document;
            doc.open(); doc.write(html); doc.close();
            setTimeout(() => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
                document.body.removeChild(iframe);
                setIsProcessing(false);
            }, 500);
        } catch (err) {
            toast.error("Gagal mencetak");
            setIsProcessing(false);
        }
    };

    const downloadAllAsImages = async () => {
        if (tables.length === 0) return toast.error("Belum ada meja!");
        setIsProcessing(true);
        const loading = toast.loading("Mengunduh semua gambar...");
        try {
            for (const table of tables) {
                const url = `${window.location.origin}/login?table=${table.tableNumber}`;
                const qrDataUrl = await QRCodeGen.toDataURL(url, { width: 600, margin: 2 });
                
                const tempDiv = document.createElement('div');
                tempDiv.style.position = 'fixed';
                tempDiv.style.left = '-2000px';
                tempDiv.innerHTML = generateStyledQRHTML(qrDataUrl, table.tableNumber);
                document.body.appendChild(tempDiv);

                await new Promise(resolve => setTimeout(resolve, 300));

                const canvas = await html2canvas(tempDiv, { useCORS: true, scale: 2 });
                const link = document.createElement('a');
                link.download = `QR_Meja_${table.tableNumber}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                
                document.body.removeChild(tempDiv);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            toast.success("Selesai", { id: loading });
        } catch (err) {
            toast.error("Gagal", { id: loading });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-orange-600 p-3 rounded-2xl shadow-lg shadow-orange-200">
                            <QrCode className="text-white" size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tighter leading-none">Manajemen Meja</h1>
                            <p className="text-gray-400 font-bold text-xs mt-1 uppercase tracking-widest">Master QR Code</p>
                        </div>
                    </div>
                    <button
                        onClick={downloadAllAsImages}
                        disabled={isProcessing}
                        className={`bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all hover:scale-105 active:scale-95 ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800'} shadow-xl`}
                    >
                        {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
                        {isProcessing ? 'Memproses...' : 'Unduh Semua'}
                    </button>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 mb-12 transform transition-all">
                    <form onSubmit={handleAddTable} className="flex flex-col md:flex-row gap-6 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest ml-1">Nama / Nomor Meja</label>
                            <input 
                                type="text" 
                                placeholder="Cth: 01, VIP, A1..." 
                                className="w-full bg-gray-50 border-2 border-gray-100 p-5 rounded-2xl outline-none focus:border-orange-500 focus:bg-white transition-all font-bold text-gray-700 text-lg shadow-inner"
                                value={newTableNum} 
                                onChange={e => setNewTableNum(e.target.value)} 
                            />
                        </div>
                        <button type="submit" className="w-full md:w-auto bg-orange-600 text-white px-12 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3">
                            <Plus size={24} /> Simpan
                        </button>
                    </form>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                    {tables.map(table => (
                        <div key={table.id} className="bg-white p-6 rounded-[3rem] shadow-sm border-2 border-white hover:border-orange-100 hover:shadow-2xl transition-all duration-500 flex flex-col items-center group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                                <QrCode size={80} />
                            </div>
                            <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl group-hover:bg-orange-600 transition-colors duration-500">
                                <span className="text-4xl font-black text-white">{table.tableNumber}</span>
                            </div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-8">Meja Aktif</span>
                            
                            <div className="flex flex-col w-full gap-3 relative z-10">
                                <button
                                    onClick={() => printSingleQR(table)}
                                    disabled={isProcessing}
                                    className="w-full bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-md active:scale-95"
                                >
                                    <Printer size={16} /> Cetak
                                </button>
                                
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => downloadAsImage(table)}
                                        disabled={isProcessing}
                                        className="flex-1 bg-blue-50 text-blue-600 py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-blue-100 transition-all active:scale-95"
                                    >
                                        <Download size={16} /> PNG
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(table.id)} 
                                        className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-red-100 transition-all active:scale-95"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminTables;