import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { ArrowLeft, Plus, Minus, Loader2, Navigation, AlertTriangle, X, Upload, Download, User, Lock, QrCode, ScanLine } from 'lucide-react';
import toast from 'react-hot-toast';

const CartPage = () => {
    const { cart, addToCart, decreaseQty, getCartTotal, clearCart } = useCart();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [customerName, setCustomerName] = useState(currentUser?.displayName || '');
    const [scannedTable, setScannedTable] = useState(null);
    const [orderNote, setOrderNote] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showQrisModal, setShowQrisModal] = useState(false);

    const [uniqueCode, setUniqueCode] = useState(0);
    const [proofImage, setProofImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    const [checkingLoc, setCheckingLoc] = useState(false);
    const [storeConfig, setStoreConfig] = useState(null);
    const [isLocationValid, setIsLocationValid] = useState(false);

    const subTotal = getCartTotal();
    const totalWithCode = subTotal + uniqueCode;

    useEffect(() => {
        const urlTable = searchParams.get('table');
        const savedTable = localStorage.getItem('activeTable');
        const finalTable = urlTable || savedTable;

        if (finalTable) {
            setScannedTable(finalTable);
            if (urlTable) {
                localStorage.setItem('activeTable', urlTable);
            }
        }

        const code = Math.floor(Math.random() * 199) + 1;
        setUniqueCode(code);

        const fetchConfig = async () => {
            try {
                const docRef = doc(db, "settings", "location");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setStoreConfig(docSnap.data());
                    checkUserLocation(docSnap.data());
                } else {
                    setIsLocationValid(true);
                    setStoreConfig({ bypass: true });
                }
            } catch (error) {
                setIsLocationValid(true);
            }
        };
        fetchConfig();
    }, [searchParams]);

    const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    const checkUserLocation = (config) => {
        if (!config || !config.latitude) { setIsLocationValid(true); return; }
        setCheckingLoc(true);
        if (!navigator.geolocation) { setCheckingLoc(false); return; }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const dist = getDistanceFromLatLonInKm(pos.coords.latitude, pos.coords.longitude, config.latitude, config.longitude);
                const max = config.radiusKM || 0.1;
                if (dist <= max) setIsLocationValid(true);
                else setIsLocationValid(false);
                setCheckingLoc(false);
            },
            () => { setCheckingLoc(false); setIsLocationValid(false); },
            { enableHighAccuracy: true }
        );
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error("Ukuran file maksimal 2MB");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setProofImage(reader.result);
                setPreviewUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePreCheck = () => {
        if (subTotal <= 0) return;
        if (!customerName.trim()) { toast.error("Mohon isi Nama Anda"); return; }
        if (!scannedTable) {
            toast.error("Wajib Scan QR Code di atas meja!", { icon: '📷' });
            return;
        }
        if (!isLocationValid && storeConfig && !storeConfig.bypass) {
            toast.error("Lokasi Anda terlalu jauh dari Cafe");
            return;
        }
        setShowQrisModal(true);
    };

    const submitToFirebase = async () => {
        if (!proofImage) {
            toast.error("Wajib upload bukti pembayaran!");
            return;
        }

        setIsSubmitting(true);
        try {
            const orderId = `TRX-${Date.now().toString().slice(-8)}`;
            const cartItems = Object.values(cart);

            await addDoc(collection(db, "orders"), {
                orderId,
                userId: currentUser?.uid || 'guest',
                tableNumber: scannedTable,
                customerName: customerName,
                customerEmail: currentUser?.email || '-',
                items: cartItems,
                subTotal: subTotal,
                uniqueCode: uniqueCode,
                total: totalWithCode,
                paymentMethod: 'QRIS Transfer',
                proofImage: proofImage,
                diningOption: 'dine-in',
                note: orderNote,
                status: 'pending',
                paymentStatus: 'unpaid',
                createdAt: serverTimestamp()
            });

            const updateStockPromises = cartItems.map(item => {
                const productRef = doc(db, "products", item.id);
                return updateDoc(productRef, { stock: increment(-item.qty) });
            });
            await Promise.all(updateStockPromises);

            clearCart();
            setShowQrisModal(false);
            toast.success("Pesanan Berhasil Terkirim!");
            navigate('/history');
        } catch (error) {
            console.error("Submit Error: ", error);
            toast.error("Gagal mengirim pesanan.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const downloadQris = () => {
        const link = document.createElement('a');
        link.href = '/assets/qris.png';
        link.download = 'QRIS-Taki-Coffee.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (subTotal === 0) return <div className="p-10 text-center font-sans">Keranjang Kosong <button onClick={() => navigate('/')} className="block mx-auto mt-4 text-orange-600 font-bold">Belanja Dulu</button></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-36 font-sans">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center gap-4">
                <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={24} /></button>
                <h1 className="font-black text-lg uppercase tracking-tight">Checkout</h1>
            </header>

            <div className="p-4 space-y-4">
                <div className={`border p-4 rounded-2xl flex items-start gap-3 ${checkingLoc ? 'bg-blue-50 text-blue-700' : isLocationValid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    <div className="mt-1 shrink-0">{checkingLoc ? <Loader2 className="animate-spin" /> : isLocationValid ? <Navigation /> : <AlertTriangle />}</div>
                    <div className="flex-1">
                        <p className="font-bold text-sm uppercase tracking-wider">{checkingLoc ? "Cek Lokasi..." : isLocationValid ? "Lokasi Valid (Dine-In)" : "Lokasi Terlalu Jauh"}</p>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] shadow-sm border overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-slate-900 text-white">
                        <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2">Daftar Pesanan</h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {Object.values(cart).map(item => (
                            <div key={item.id} className="p-4 flex gap-4 items-center">
                                <img src={item.image} className="w-20 h-20 object-cover rounded-2xl bg-gray-100 border border-gray-100" alt="" />
                                <div className="flex-1">
                                    <h3 className="font-black text-slate-800 text-sm uppercase leading-tight mb-1">{item.name}</h3>
                                    <p className="text-orange-600 font-black text-xs">Rp {item.price.toLocaleString()}</p>
                                    <div className="flex items-center gap-4 mt-3">
                                        <div className="flex items-center gap-3 bg-gray-100 rounded-xl p-1">
                                            <button onClick={() => decreaseQty(item.id)} className="bg-white w-7 h-7 flex items-center justify-center rounded-lg shadow-sm"><Minus size={14} /></button>
                                            <span className="text-xs font-black w-4 text-center">{item.qty}</span>
                                            <button onClick={() => addToCart(item)} className="bg-white w-7 h-7 flex items-center justify-center rounded-lg shadow-sm"><Plus size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] shadow-sm border space-y-5">
                    <h3 className="font-black text-xs text-slate-400 uppercase tracking-[0.2em] mb-2">Informasi Meja</h3>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase ml-2 mb-1">Nama Pemesan</label>
                        <div className="flex items-center gap-3 border-2 border-gray-50 rounded-2xl px-4 py-3 bg-gray-50 focus-within:bg-white focus-within:border-orange-500 transition-all">
                            <User size={18} className="text-gray-400" />
                            <input
                                type="text"
                                placeholder="Siapa nama Anda?"
                                className="w-full bg-transparent outline-none font-bold text-slate-800"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase ml-2 mb-1">Status Meja</label>
                        <div className={`flex items-center gap-3 border-2 rounded-2xl px-4 py-3 transition-all ${scannedTable ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                            {scannedTable ? <QrCode size={18} className="text-green-600" /> : <ScanLine size={18} className="text-red-400 animate-pulse" />}
                            <input
                                type="text"
                                placeholder="Belum Scan QR"
                                className={`w-full bg-transparent outline-none font-black uppercase text-xs ${scannedTable ? 'text-green-800' : 'text-red-800'}`}
                                value={scannedTable ? `MEJA NO: ${scannedTable}` : ''}
                                readOnly
                            />
                            {scannedTable && <Lock size={14} className="text-green-600" />}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase ml-2 mb-1">Catatan</label>
                        <textarea
                            placeholder="Contoh: Es dipisah, kurangi gula..."
                            className="w-full border-2 border-gray-50 rounded-2xl px-4 py-3 bg-gray-50 outline-none text-xs font-bold"
                            rows={2}
                            value={orderNote}
                            onChange={(e) => setOrderNote(e.target.value)}
                        ></textarea>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 w-full bg-white border-t rounded-t-[2.5rem] p-6 z-20 shadow-2xl">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Pembayaran</p>
                        <h2 className="font-black text-2xl text-slate-900 tracking-tighter">Rp {totalWithCode.toLocaleString()}</h2>
                    </div>
                    <div className="text-right">
                        <span className="text-[9px] font-black bg-orange-100 text-orange-600 px-3 py-1 rounded-full uppercase tracking-widest">
                            {Object.values(cart).length} Items
                        </span>
                    </div>
                </div>
                <button
                    onClick={handlePreCheck}
                    disabled={isSubmitting || checkingLoc || !isLocationValid}
                    className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl flex justify-center items-center gap-3 transition-all active:scale-95
                        ${(isSubmitting || checkingLoc) ? 'bg-slate-300 cursor-wait' : !isLocationValid ? 'bg-red-500 text-white' : !scannedTable ? 'bg-slate-300 text-slate-500' : 'bg-orange-600 text-white hover:bg-orange-700'}
                    `}
                >
                    {isSubmitting ? <><Loader2 className="animate-spin" size={20} /> Memproses...</> : 'Proses Pembayaran'}
                </button>
            </div>

            {showQrisModal && (
                <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white rounded-[3rem] w-full max-w-md p-8 flex flex-col items-center max-h-[90vh] overflow-y-auto relative">
                        <div className="w-full flex justify-between items-center mb-6">
                            <h3 className="font-black uppercase tracking-widest text-xs text-slate-400">Scan QRIS Pembayaran</h3>
                            <button onClick={() => setShowQrisModal(false)} className="p-2 bg-gray-50 rounded-full"><X size={20} className="text-slate-400" /></button>
                        </div>

                        <div className="relative group w-full flex justify-center mb-8">
                            <div className="bg-white p-3 border-4 border-slate-900 rounded-[2rem] shadow-2xl">
                                <img src="/assets/qris.png" alt="QRIS" className="h-64 w-64 object-contain" />
                            </div>
                            <button onClick={downloadQris} className="absolute -bottom-4 bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl">
                                <Download size={14} /> Simpan QRIS
                            </button>
                        </div>

                        <div className="text-center w-full mb-8 bg-orange-50 p-6 rounded-[2rem] border border-orange-100">
                            <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Transfer Persis :</p>
                            <div className="text-4xl font-black text-slate-900 tracking-tighter">Rp {totalWithCode.toLocaleString()}</div>
                        </div>

                        <div className="w-full mb-8">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Bukti Bayar (Screenshot)</label>
                            <div className="relative border-2 border-dashed border-slate-200 rounded-3xl p-6 bg-slate-50 text-center hover:bg-slate-100 transition-all cursor-pointer">
                                <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                {previewUrl ? (
                                    <div className="relative">
                                        <img src={previewUrl} alt="Preview" className="h-40 mx-auto rounded-2xl object-contain shadow-md" />
                                        <div className="text-[10px] text-green-600 font-black mt-3 uppercase tracking-widest flex items-center justify-center gap-1">Siap Dikirim</div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-slate-400">
                                        <Upload size={32} className="mb-2" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Pilih Gambar</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button onClick={submitToFirebase} disabled={isSubmitting} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-orange-200 flex items-center justify-center gap-3">
                            {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : "Konfirmasi & Kirim"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CartPage;