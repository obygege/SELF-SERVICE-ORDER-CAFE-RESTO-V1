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
        if (!customerName.trim()) return toast.error("Mohon isi Nama Anda");
        if (!scannedTable) return toast.error("Wajib Scan QR Code meja!");
        if (!isLocationValid && storeConfig && !storeConfig.bypass) return toast.error("Lokasi terlalu jauh");

        setShowQrisModal(true);
    };

    const submitToFirebase = async () => {
        if (!proofImage) return toast.error("Upload bukti pembayaran!");
        setIsSubmitting(true);
        try {
            const cartItems = Object.values(cart);
            await addDoc(collection(db, "orders"), {
                orderId: `TRX-${Date.now().toString().slice(-6)}`,
                userId: currentUser?.uid || 'guest',
                tableNumber: scannedTable,
                customerName,
                items: cartItems,
                subTotal,
                uniqueCode,
                total: totalWithCode,
                proofImage,
                status: 'pending',
                paymentStatus: 'unpaid',
                createdAt: serverTimestamp()
            });

            for (const item of cartItems) {
                await updateDoc(doc(db, "products", item.id), { stock: increment(-item.qty) });
            }

            clearCart();
            navigate('/history');
        } catch (error) {
            toast.error("Gagal mengirim pesanan");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (subTotal === 0) return <div className="p-20 text-center font-bold">Keranjang Kosong</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-36 font-sans">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center gap-4">
                <button onClick={() => navigate('/')} className="p-2"><ArrowLeft /></button>
                <h1 className="font-black text-lg uppercase">Checkout</h1>
            </header>

            <div className="p-4 space-y-4">
                <div className={`p-4 rounded-2xl flex items-center gap-3 border ${isLocationValid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {checkingLoc ? <Loader2 className="animate-spin" /> : isLocationValid ? <Navigation /> : <AlertTriangle />}
                    <span className="font-bold text-xs uppercase">{isLocationValid ? "Lokasi Valid" : "Lokasi Terlalu Jauh"}</span>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border space-y-4">
                    <input type="text" placeholder="Nama Pemesan" className="w-full bg-gray-50 p-4 rounded-2xl font-bold border-none outline-orange-500" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                    <div className={`p-4 rounded-2xl flex items-center gap-3 border ${scannedTable ? 'bg-slate-900 text-white' : 'bg-red-50 text-red-600'}`}>
                        <QrCode size={20} />
                        <span className="font-black uppercase text-sm">{scannedTable ? `Meja ${scannedTable}` : "Belum Scan Meja"}</span>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] border overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b font-black text-xs uppercase text-gray-400">Item Pesanan</div>
                    {Object.values(cart).map(item => (
                        <div key={item.id} className="p-4 flex gap-4 items-center border-b last:border-none">
                            <img src={item.image} className="w-12 h-12 rounded-xl object-cover" alt="" />
                            <div className="flex-1">
                                <h4 className="font-bold text-sm uppercase">{item.name}</h4>
                                <p className="text-xs font-bold text-orange-600">{item.qty}x Rp {item.price.toLocaleString()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="fixed bottom-0 w-full bg-white p-6 border-t rounded-t-[2.5rem] shadow-2xl z-20">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-black text-gray-400 uppercase">Total Bayar</span>
                    <span className="text-xl font-black">Rp {totalWithCode.toLocaleString()}</span>
                </div>
                <button onClick={handlePreCheck} disabled={isSubmitting || !isLocationValid} className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 disabled:bg-gray-300 transition-all">
                    Proses Pembayaran
                </button>
            </div>

            {showQrisModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[3rem] w-full max-w-md p-8 relative overflow-y-auto max-h-[90vh]">
                        <button onClick={() => setShowQrisModal(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full"><X size={20} /></button>
                        <h3 className="font-black text-xs uppercase text-gray-400 mb-6">Scan QRIS</h3>
                        <img src="/assets/qris.png" className="w-full rounded-3xl border-4 border-slate-900 mb-6" alt="QRIS" />
                        <div className="bg-orange-50 p-6 rounded-3xl text-center mb-6">
                            <p className="text-[10px] font-bold text-orange-400 uppercase">Total Transfer</p>
                            <p className="text-2xl font-black">Rp {totalWithCode.toLocaleString()}</p>
                        </div>
                        <div className="border-2 border-dashed rounded-3xl p-6 text-center relative mb-6">
                            <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                            {previewUrl ? <img src={previewUrl} className="h-32 mx-auto object-contain" /> : <div className="text-gray-400 font-bold text-xs uppercase"><Upload className="mx-auto mb-2" /> Upload Bukti</div>}
                        </div>
                        <button onClick={submitToFirebase} disabled={isSubmitting} className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-lg">
                            {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : "Konfirmasi Pembayaran"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CartPage;