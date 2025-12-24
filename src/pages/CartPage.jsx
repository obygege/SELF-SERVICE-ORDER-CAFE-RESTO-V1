import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { ArrowLeft, Plus, Minus, CreditCard, Banknote, MapPin, ShoppingBag, Pencil, Loader2, Navigation, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const CartPage = () => {
    const { cart, addToCart, decreaseQty, getCartTotal, clearCart } = useCart();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [paymentMethod, setPaymentMethod] = useState('online');
    const [diningOption, setDiningOption] = useState('dine-in');
    const [orderNote, setOrderNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // STATE LOKASI
    const [checkingLoc, setCheckingLoc] = useState(false);
    const [storeConfig, setStoreConfig] = useState(null);
    const [userDistance, setUserDistance] = useState(null);
    const [isLocationValid, setIsLocationValid] = useState(false);
    const [locationError, setLocationError] = useState(null);

    const subTotal = getCartTotal();
    const adminFee = paymentMethod === 'online' ? 500 : 0;
    const grandTotal = subTotal + adminFee;

    // 1. LOAD SETTING TOKO SAAT AWAL BUKA HALAMAN
    useEffect(() => {
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
                console.error("Gagal load config", error);
                setIsLocationValid(true);
            }
        };
        fetchConfig();
    }, []);

    const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    const checkUserLocation = (config) => {
        if (!config || !config.latitude || !config.longitude) {
            setIsLocationValid(true);
            return;
        }

        setCheckingLoc(true);
        setLocationError(null);

        if (!navigator.geolocation) {
            setLocationError("Browser tidak dukung GPS");
            setCheckingLoc(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;

                const dist = getDistanceFromLatLonInKm(userLat, userLng, config.latitude, config.longitude);
                setUserDistance(dist);

                const maxRadius = config.radiusKM || 0.1;

                if (dist <= maxRadius) {
                    setIsLocationValid(true);
                    toast.success(`Lokasi Terverifikasi (${(dist * 1000).toFixed(0)}m)`);
                } else {
                    setIsLocationValid(false);
                    setLocationError(`Terlalu Jauh: ${(dist).toFixed(2)} km (Max: ${maxRadius} km)`);
                }
                setCheckingLoc(false);
            },
            (error) => {
                console.error(error);
                setCheckingLoc(false);
                setLocationError("Gagal Deteksi Lokasi. Pastikan GPS Aktif!");
                setIsLocationValid(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handlePayment = async () => {
        if (grandTotal <= 0) return;

        if (!isLocationValid && storeConfig && !storeConfig.bypass) {
            toast.error("Lokasi Anda tidak valid untuk memesan.");
            return;
        }

        setIsSubmitting(true);

        try {
            const orderId = `TRX-${Date.now().toString().slice(-8)}`;
            const itemsMidtrans = Object.values(cart).map(item => ({
                id: item.id,
                price: item.price,
                quantity: item.qty,
                name: item.name.substring(0, 49)
            }));

            if (paymentMethod === 'online') itemsMidtrans.push({ id: 'FEE', price: 500, quantity: 1, name: 'Biaya Layanan' });

            const processOrder = async (statusArg) => {
                try {
                    await addDoc(collection(db, "orders"), {
                        orderId,
                        tableNumber: localStorage.getItem('activeTable') || 1,
                        customerName: currentUser?.displayName || "Guest",
                        customerEmail: currentUser?.email,
                        items: Object.values(cart),
                        subTotal, adminFee, total: grandTotal,
                        paymentMethod: paymentMethod === 'online' ? 'Transfer/QRIS' : 'Cash',
                        diningOption: diningOption,
                        note: orderNote,
                        status: 'pending',
                        paymentStatus: statusArg,
                        createdAt: serverTimestamp()
                    });

                    Object.values(cart).forEach(async (item) => {
                        await updateDoc(doc(db, "products", item.id), { stock: increment(-item.qty) });
                    });

                    clearCart();
                    toast.success("Pesanan Berhasil!");
                    navigate('/history');
                } catch (error) {
                    toast.error("Gagal simpan order");
                    setIsSubmitting(false);
                }
            };

            if (paymentMethod === 'cash') {
                await processOrder('unpaid');
            } else {
                // Online Payment Logic
                try {
                    // PERBAIKAN: Gunakan endpoint relative /api/payment
                    const response = await fetch('/api/payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            orderId,
                            total: grandTotal,
                            items: itemsMidtrans,
                            customer: { name: currentUser?.displayName, email: currentUser?.email }
                        })
                    });

                    const data = await response.json();

                    if (!response.ok) throw new Error(data.error || "Gagal request payment");

                    if (data.token) {
                        window.snap.pay(data.token, {
                            onSuccess: () => processOrder('paid'),
                            onPending: () => processOrder('pending'),
                            onError: () => { toast.error("Gagal Bayar"); setIsSubmitting(false); },
                            onClose: () => { toast("Batal"); setIsSubmitting(false); }
                        });
                    } else {
                        throw new Error("Token tidak diterima");
                    }
                } catch (error) {
                    console.error(error);
                    toast.error(`Koneksi Error: ${error.message}`);
                    setIsSubmitting(false);
                }
            }
        } catch (err) {
            console.error(err);
            setIsSubmitting(false);
        }
    };

    if (Object.keys(cart).length === 0) return <div className="p-10 text-center">Keranjang Kosong <button onClick={() => navigate('/')} className="block mx-auto mt-4 text-orange-600 font-bold">Belanja Dulu</button></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-36">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center gap-4">
                <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={24} /></button>
                <h1 className="font-bold text-lg">Checkout Pesanan</h1>
            </header>

            <div className="p-4 space-y-4">
                {/* --- CARD STATUS LOKASI --- */}
                <div className={`border p-4 rounded-xl flex items-start gap-3 transition-colors ${checkingLoc ? 'bg-blue-50 border-blue-200 text-blue-700' :
                        isLocationValid ? 'bg-green-50 border-green-200 text-green-700' :
                            'bg-red-50 border-red-200 text-red-700'
                    }`}>
                    <div className="mt-1 shrink-0">
                        {checkingLoc ? <Loader2 size={20} className="animate-spin" /> :
                            isLocationValid ? <Navigation size={20} /> : <AlertTriangle size={20} />}
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-sm">
                            {checkingLoc ? "Memeriksa Lokasi Anda..." :
                                isLocationValid ? "Lokasi Terverifikasi" : "Lokasi Tidak Valid"}
                        </p>
                        <p className="text-xs opacity-90 mt-1">
                            {checkingLoc ? "Mohon tunggu sebentar..." :
                                isLocationValid ? `Anda berada di dalam area toko (${userDistance ? (userDistance * 1000).toFixed(0) : 0}m).` :
                                    locationError || "Anda berada di luar jangkauan area pemesanan."}
                        </p>

                        {!checkingLoc && !isLocationValid && (
                            <button
                                onClick={() => checkUserLocation(storeConfig)}
                                className="mt-2 text-xs bg-white border border-red-200 px-3 py-1.5 rounded-lg shadow-sm font-bold active:scale-95 transition"
                            >
                                Coba Cek Lagi
                            </button>
                        )}
                    </div>
                </div>

                {Object.values(cart).map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm flex gap-4">
                        <img src={item.image} className="w-16 h-16 object-cover rounded-lg bg-gray-200" alt="" />
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-800">{item.name}</h3>
                            <p className="text-orange-600 font-bold">Rp {item.price.toLocaleString()}</p>
                            <div className="flex items-center gap-3 mt-2">
                                <button onClick={() => decreaseQty(item.id)} className="bg-gray-100 p-1 rounded"><Minus size={14} /></button>
                                <span className="text-sm font-bold">{item.qty}</span>
                                <button onClick={() => addToCart(item)} className="bg-gray-100 p-1 rounded"><Plus size={14} /></button>
                            </div>
                        </div>
                    </div>
                ))}

                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <h3 className="font-bold mb-2 text-sm text-gray-500 uppercase flex items-center gap-2"><Pencil size={14} /> Catatan</h3>
                    <textarea className="w-full bg-gray-50 border p-3 rounded-lg text-sm" rows="2" placeholder="Cth: Jangan pedas..." value={orderNote} onChange={(e) => setOrderNote(e.target.value)}></textarea>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <h3 className="font-bold mb-3 text-sm text-gray-500 uppercase">Opsi Penyajian</h3>
                    <div className="flex gap-3">
                        <button onClick={() => setDiningOption('dine-in')} className={`flex-1 p-3 border rounded-xl flex flex-col items-center gap-2 ${diningOption === 'dine-in' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200'}`}><MapPin size={24} /><span className="text-xs font-bold">Diantar</span></button>
                        <button onClick={() => setDiningOption('takeaway')} className={`flex-1 p-3 border rounded-xl flex flex-col items-center gap-2 ${diningOption === 'takeaway' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200'}`}><ShoppingBag size={24} /><span className="text-xs font-bold">Ambil</span></button>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <h3 className="font-bold mb-3 text-sm text-gray-500 uppercase">Pembayaran</h3>
                    <div className="flex gap-3">
                        <button onClick={() => setPaymentMethod('online')} className={`flex-1 p-3 border rounded-xl flex flex-col items-center gap-2 ${paymentMethod === 'online' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200'}`}><CreditCard size={24} /><span className="text-xs font-bold">Transfer/QRIS</span></button>
                        <button onClick={() => setPaymentMethod('cash')} className={`flex-1 p-3 border rounded-xl flex flex-col items-center gap-2 ${paymentMethod === 'cash' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200'}`}><Banknote size={24} /><span className="text-xs font-bold">Tunai</span></button>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 w-full bg-white border-t p-4 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <div className="flex justify-between mb-3 font-bold text-lg">
                    <span>Total</span>
                    <span>Rp {grandTotal.toLocaleString()}</span>
                </div>

                <button
                    onClick={handlePayment}
                    disabled={isSubmitting || checkingLoc || !isLocationValid}
                    className={`w-full py-4 rounded-xl font-bold shadow-lg flex justify-center items-center gap-2 text-white transition-all
                        ${(isSubmitting || checkingLoc) ? 'bg-gray-400 cursor-wait' :
                            !isLocationValid ? 'bg-red-400 cursor-not-allowed' :
                                'bg-slate-900 hover:bg-slate-800 active:scale-[0.98]'}
                    `}
                >
                    {checkingLoc ? <><Loader2 className="animate-spin" /> Cek Lokasi...</> :
                        isSubmitting ? <><Loader2 className="animate-spin" /> Memproses...</> :
                            !isLocationValid ? 'Lokasi Tidak Valid' : 'Buat Pesanan'}
                </button>

                {!isLocationValid && !checkingLoc && (
                    <p className="text-center text-xs text-red-500 mt-2 font-medium">
                        Anda harus berada di lokasi toko untuk memesan.
                    </p>
                )}
            </div>
        </div>
    );
};

export default CartPage;