import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { ArrowLeft, Plus, Minus, Loader2, Navigation, AlertTriangle, X, Upload, QrCode, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const CartPage = () => {
    const { cart, getCartTotal, clearCart } = useCart();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [customerName, setCustomerName] = useState(currentUser?.displayName || '');
    const [scannedTable, setScannedTable] = useState(null);
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
            if (urlTable) localStorage.setItem('activeTable', urlTable);
        }

        setUniqueCode(Math.floor(Math.random() * 199) + 1);

        const fetchConfig = async () => {
            try {
                const docRef = doc(db, "settings", "location");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setStoreConfig(docSnap.data());
                    checkUserLocation(docSnap.data());
                } else {
                    setIsLocationValid(true);
                }
            } catch (error) {
                setIsLocationValid(true);
            }
        };
        fetchConfig();
    }, [searchParams]);

    const checkUserLocation = (config) => {
        if (!config || !config.latitude || config.bypass) { setIsLocationValid(true); return; }
        setCheckingLoc(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const R = 6371;
                const dLat = (config.latitude - pos.coords.latitude) * (Math.PI / 180);
                const dLon = (config.longitude - pos.coords.longitude) * (Math.PI / 180);
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(pos.coords.latitude * (Math.PI / 180)) * Math.cos(config.latitude * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                setIsLocationValid(dist <= (config.radiusKM || 0.1));
                setCheckingLoc(false);
            },
            () => { setCheckingLoc(false); setIsLocationValid(false); },
            { enableHighAccuracy: true }
        );
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2000000) return toast.error("Ukuran file maksimal 2MB");
            const reader = new FileReader();
            reader.onloadend = () => {
                setProofImage(reader.result);
                setPreviewUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePreCheck = () => {
        if (!currentUser) return toast.error("Silakan login terlebih dahulu");
        if (subTotal <= 0) return;
        if (!customerName.trim()) return toast.error("Mohon isi Nama Anda");
        if (!scannedTable) return toast.error("Wajib Scan QR Code meja!");
        if (!isLocationValid && storeConfig && !storeConfig.bypass) return toast.error("Lokasi terlalu jauh");

        setShowQrisModal(true);
    };

    const submitToFirebase = async () => {
        if (!proofImage) return toast.error("Upload bukti pembayaran!");
        setIsSubmitting(true);
        const loadingToast = toast.loading("Mengirim pesanan...");

        try {
            const cartItems = Object.values(cart).map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                qty: item.qty,
                category: item.category || 'general',
                image: item.image || ''
            }));

            const orderData = {
                orderId: `TRX-${Date.now().toString().slice(-6)}`,
                userId: currentUser.uid,
                customerEmail: currentUser.email || '',
                tableNumber: scannedTable,
                customerName: customerName,
                items: cartItems,
                subTotal: Number(subTotal),
                uniqueCode: Number(uniqueCode),
                total: Number(totalWithCode),
                proofImage: proofImage,
                status: 'pending',
                paymentStatus: 'unpaid',
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, "orders"), orderData);

            for (const item of cartItems) {
                const productRef = doc(db, "products", item.id);
                await updateDoc(productRef, {
                    stock: increment(-item.qty)
                }).catch(e => console.log("Update stock failed for:", item.id));
            }

            toast.success("Pesanan Berhasil Terkirim!", { id: loadingToast });
            clearCart();
            setShowQrisModal(false);
            navigate('/history');
        } catch (error) {
            console.error("Firebase Error:", error);
            toast.error("Gagal mengirim pesanan: " + error.message, { id: loadingToast });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDownloadQR = () => {
        const link = document.createElement('a');
        link.href = '/assets/qris.png';
        link.download = 'QRIS_Payment.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (subTotal === 0) return <div className="p-20 text-center font-bold">Keranjang Kosong</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-36 font-sans">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center gap-4">
                <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft /></button>
                <h1 className="font-black text-lg uppercase tracking-tighter">Checkout</h1>
            </header>

            <div className="p-4 space-y-4">
                <div className={`p-4 rounded-2xl flex items-center gap-3 border ${isLocationValid ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                    {checkingLoc ? <Loader2 className="animate-spin" size={18} /> : isLocationValid ? <QrCode size={18} /> : <AlertTriangle size={18} />}
                    <span className="font-bold text-[10px] uppercase tracking-wider">{isLocationValid ? "Lokasi Valid" : "Di Luar Area Cafe"}</span>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border shadow-sm space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Nama Anda</label>
                        <input type="text" placeholder="Nama Lengkap" className="w-full bg-gray-50 p-4 rounded-2xl font-bold border-none outline-orange-500 text-sm" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                    </div>

                    <div className={`p-4 rounded-2xl flex items-center gap-3 border ${scannedTable ? 'bg-slate-900 text-white border-slate-900' : 'bg-red-50 text-red-600 border-red-100'}`}>
                        <QrCode size={20} />
                        <span className="font-black uppercase text-xs tracking-widest">{scannedTable ? `Meja ${scannedTable}` : "Scan Meja Anda"}</span>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b font-black text-[10px] uppercase text-gray-400 tracking-widest">Detail Item</div>
                    {Object.values(cart).map(item => (
                        <div key={item.id} className="p-4 flex gap-4 items-center border-b last:border-none">
                            <img src={item.image} className="w-12 h-12 rounded-xl object-cover border" alt="" />
                            <div className="flex-1">
                                <h4 className="font-black text-xs uppercase text-slate-800">{item.name}</h4>
                                <p className="text-[10px] font-bold text-orange-600 tracking-tighter">{item.qty} x Rp {item.price.toLocaleString()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="fixed bottom-0 w-full bg-white p-6 border-t rounded-t-[2.5rem] shadow-2xl z-20">
                <div className="flex justify-between items-center mb-4 px-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Bayar</span>
                    <span className="text-xl font-black text-slate-900">Rp {totalWithCode.toLocaleString()}</span>
                </div>
                <button onClick={handlePreCheck} disabled={isSubmitting || !isLocationValid || !scannedTable} className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 disabled:bg-gray-200 transition-all tracking-[0.2em]">
                    Proses Sekarang
                </button>
            </div>

            {showQrisModal && (
                <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[3rem] w-full max-w-md p-8 relative overflow-y-auto max-h-[95vh] shadow-2xl">
                        <button onClick={() => setShowQrisModal(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X size={20} /></button>
                        <div className="text-center mb-6">
                            <h3 className="font-black text-xs uppercase text-slate-400 tracking-[0.2em] mb-4">Pembayaran QRIS</h3>
                            <div className="relative inline-block group">
                                <img src="/assets/qris.png" className="w-48 h-48 mx-auto rounded-3xl border-4 border-slate-900 shadow-xl" alt="QRIS" />
                                <button
                                    onClick={handleDownloadQR}
                                    className="mt-4 flex items-center gap-2 mx-auto bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                                >
                                    <Download size={16} /> Simpan Gambar
                                </button>
                            </div>
                        </div>
                        <div className="bg-orange-50 p-6 rounded-3xl text-center mb-6 border border-orange-100 shadow-inner">
                            <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Total Tepat</p>
                            <p className="text-3xl font-black text-slate-900 tracking-tighter">Rp {totalWithCode.toLocaleString()}</p>
                        </div>
                        <div className="space-y-4">
                            <div className="relative group">
                                <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                <div className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${previewUrl ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:border-orange-400'}`}>
                                    {previewUrl ? (
                                        <img src={previewUrl} className="h-32 mx-auto object-contain rounded-lg shadow-sm" alt="Bukti" />
                                    ) : (
                                        <div className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Upload Bukti Transfer</div>
                                    )}
                                </div>
                            </div>
                            <button onClick={submitToFirebase} disabled={isSubmitting || !proofImage} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-lg active:scale-95 disabled:bg-slate-200 transition-all tracking-widest">
                                {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : "Konfirmasi Pembayaran"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CartPage;