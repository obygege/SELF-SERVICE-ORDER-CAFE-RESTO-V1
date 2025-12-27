import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { FolderUp, Loader2, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const BulkAddProducts = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState([]);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    const detectCategory = (fileName) => {
        const name = fileName.toLowerCase();

        const coffeeKeywords = ['coffee', 'kopi', 'espresso', 'latte', 'cappuccino', 'americano', 'mocca', 'v60', 'tubruk'];
        const nonCoffeeKeywords = ['tea', 'teh', 'juice', 'jus', 'milkshake', 'smoothies', 'soda', 'mojito', 'chocolate', 'cokelat', 'water', 'mineral', 'ice', 'es'];
        const heavyFoodKeywords = ['nasi', 'mie', 'ayam', 'ikan', 'daging', 'rice', 'steak', 'pasta', 'spaghetti', 'burger', 'pizza', 'bakso', 'soto'];

        if (coffeeKeywords.some(key => name.includes(key))) return 'Coffee';
        if (nonCoffeeKeywords.some(key => name.includes(key))) return 'Non-Coffee';
        if (heavyFoodKeywords.some(key => name.includes(key))) return 'Makanan Berat';

        return 'Makanan Ringan';
    };

    const compressImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.6));
                };
            };
        });
    };

    const handleFolderSelect = (e) => {
        const selectedFiles = Array.from(e.target.files).filter(file =>
            file.type.startsWith('image/')
        );
        setFiles(selectedFiles);
        if (selectedFiles.length > 0) {
            toast.success(`${selectedFiles.length} foto terdeteksi`);
        }
    };

    const getRandomPrice = () => {
        const prices = [15000, 18000, 20000, 22000, 25000, 28000, 30000, 35000, 45000];
        return prices[Math.floor(Math.random() * prices.length)];
    };

    const handleUploadAll = async () => {
        if (files.length === 0) return toast.error("Pilih folder berisi foto dulu");

        setLoading(true);
        setProgress({ current: 0, total: files.length });

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const base64Image = await compressImage(file);
                const fileName = file.name.split('.').slice(0, -1).join('.');

                const autoCategory = detectCategory(fileName);

                await addDoc(collection(db, "products"), {
                    name: fileName,
                    price: getRandomPrice(),
                    category: autoCategory,
                    stock: 300,
                    image: base64Image,
                    createdAt: serverTimestamp()
                });

                setProgress(prev => ({ ...prev, current: i + 1 }));
            }

            toast.success("Semua menu berhasil diimport dengan Smart Category!");
            setFiles([]);
        } catch (error) {
            console.error(error);
            toast.error("Terjadi kesalahan saat upload");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
            <div className="max-w-2xl mx-auto bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-100">
                <div className="bg-slate-900 p-8 text-white">
                    <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                        <Sparkles className="text-orange-500" /> AI Bulk Import
                    </h1>
                    <p className="text-slate-400 text-xs uppercase tracking-widest mt-1">Smart Detection: Auto Category & Compression</p>
                </div>

                <div className="p-8 space-y-6">
                    <div className="bg-orange-50 border-2 border-dashed border-orange-200 rounded-3xl p-8 text-center">
                        <input
                            type="file"
                            webkitdirectory="true"
                            directory="true"
                            multiple
                            onChange={handleFolderSelect}
                            className="hidden"
                            id="folder-input"
                        />
                        <label htmlFor="folder-input" className="flex flex-col items-center cursor-pointer">
                            <FolderUp className="text-orange-500 mb-4" size={48} />
                            <span className="text-sm font-black text-slate-800 uppercase tracking-tight">Pilih Folder Foto Menu</span>
                            <span className="text-[10px] text-slate-500 uppercase mt-2">Sistem akan otomatis menentukan kategori berdasarkan nama file</span>
                        </label>
                    </div>

                    {files.length > 0 && (
                        <div className="bg-green-50 rounded-2xl p-4 flex items-center justify-between border border-green-100">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="text-green-600" size={20} />
                                <span className="text-xs font-black text-green-800 uppercase">{files.length} Menu Siap Diproses</span>
                            </div>
                            <button onClick={() => setFiles([])} className="text-red-500 hover:bg-red-50 p-1 rounded-lg">
                                <X size={18} />
                            </button>
                        </div>
                    )}

                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                        <div className="flex gap-3 items-start">
                            <AlertCircle className="text-blue-500 shrink-0" size={18} />
                            <div className="space-y-2">
                                <p className="text-[10px] text-blue-700 font-black uppercase tracking-wider">System Rule:</p>
                                <ul className="text-[9px] text-blue-600 font-bold uppercase space-y-1">
                                    <li>• Auto Compress 20MB → Web Friendly</li>
                                    <li>• Auto Category (Smart Keywords Filter)</li>
                                    <li>• Auto Stock: 300 / Random Price</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {loading && (
                        <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                                <span>Mengunggah Menu...</span>
                                <span>{progress.current} / {progress.total}</span>
                            </div>
                            <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden shadow-inner">
                                <div
                                    className="bg-gradient-to-r from-orange-500 to-red-500 h-full transition-all duration-300"
                                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="py-4 rounded-2xl border-2 border-gray-100 font-black text-[10px] uppercase tracking-widest text-gray-400"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleUploadAll}
                            disabled={loading || files.length === 0}
                            className="py-4 rounded-2xl bg-orange-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-200 flex items-center justify-center gap-2 active:scale-95 disabled:bg-slate-200 disabled:shadow-none transition-all"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : "PROSES SEMUA MENU"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkAddProducts;