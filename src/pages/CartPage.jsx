import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { ArrowLeft, Plus, Minus, CreditCard, Banknote, MapPin, ShoppingBag, Pencil, Loader2, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';

const CartPage = () => {
    const { cart, addToCart, decreaseQty, getCartTotal, clearCart } = useCart();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [paymentMethod, setPaymentMethod] = useState('online');
    const [diningOption, setDiningOption] = useState('dine-in');
    const [orderNote, setOrderNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [checkingLoc, setCheckingLoc] = useState(false);
    const [storeConfig, setStoreConfig] = useState(null);

    const subTotal = getCartTotal();
    const adminFee = paymentMethod === 'online' ? 500 : 0;
    const grandTotal = subTotal + adminFee;

    useEffect(() => {
        const fetchConfig = async () => {
            const docRef = doc(db, "config", "storeSettings");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) setStoreConfig(docSnap.data());
        };
        fetchConfig();
    }, []);

    const deg2rad = (deg) => deg * (Math.PI / 180);

    const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    const verifyLocation = () => {
        return new Promise((resolve, reject) => {
            if (!storeConfig || storeConfig.latitude === 0) return resolve(true);

            if (!navigator.geolocation) {
                toast.error("Browser tidak mendukung GPS.");
                reject(false);
                return;
            }

            setCheckingLoc(true);
            toast("Validasi posisi...", { icon: '📍' });

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLat = position.coords.latitude;
                    const userLng = position.coords.longitude;
                    const distance = getDistanceFromLatLonInKm(userLat, userLng, storeConfig.latitude, storeConfig.longitude);
                    setCheckingLoc(false);
                    if (distance <= storeConfig.radius) resolve(true);
                    else {
                        toast.error(`Jarak Anda ${distance.toFixed(2)} km. Pemesanan Ditolak.`);
                        reject(false);
                    }
                },
                (error) => {
                    setCheckingLoc(false);
                    toast.error("Wajib izinkan Lokasi!");
                    reject(false);
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        });
    };

    const handlePayment = async () => {
        if (grandTotal <= 0) return;
        if (isSubmitting || checkingLoc) return;

        try { await verifyLocation(); } catch (e) { return; }

        setIsSubmitting(true);
        const orderId = `TRX-${Date.now().toString().slice(-8)}`;
        const itemsMidtrans = Object.values(cart).map(item => ({ id: item.id, price: item.price, quantity: item.qty, name: item.name.substring(0, 49) }));
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
                Object.values(cart).forEach(async (item) => { await updateDoc(doc(db, "products", item.id), { stock: increment(-item.qty) }); });
                clearCart();
                toast.success("Pesanan Berhasil!");
                navigate('/history');
            } catch (error) { toast.error("Gagal"); setIsSubmitting(false); }
        };

        if (paymentMethod === 'cash') {
            await processOrder('unpaid');
        } else {
            try {
                const response = await fetch('/api/payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId, total: grandTotal, items: itemsMidtrans, customer: { name: currentUser?.displayName, email: currentUser?.email } })
                });
                const data = await response.json();
                if (data.token) {
                    window.snap.pay(data.token, {
                        onSuccess: () => processOrder('paid'),
                        onPending: () => processOrder('pending'),
                        onError: () => { toast.error("Gagal Bayar"); setIsSubmitting(false); },
                        onClose: () => { toast("Batal"); setIsSubmitting(false); }
                    });
                } else { setIsSubmitting(false); }
            } catch (error) { toast.error("Koneksi Error"); setIsSubmitting(false); }
        }
    };

    if (Object.keys(cart).length === 0) return <div className="p-10 text-center">Keranjang Kosong <button onClick={() => navigate('/')} className="block mx-auto mt-4 text-orange-600 font-bold">Belanja Dulu</button></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-32">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center gap-4">
                <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={24} /></button>
                <h1 className="font-bold text-lg">Checkout Pesanan</h1>
            </header>

            <div className="p-4 space-y-4">
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-start gap-2 text-blue-700 text-xs">
                    <Navigation size={16} className="mt-0.5 shrink-0" />
                    <p>Sistem akan memvalidasi posisi Anda saat ini sebelum transaksi.</p>
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

            <div className="fixed bottom-0 w-full bg-white border-t p-4 z-20">
                <div className="flex justify-between mb-2 font-bold text-lg">
                    <span>Total</span>
                    <span>Rp {grandTotal.toLocaleString()}</span>
                </div>
                <button onClick={handlePayment} disabled={isSubmitting || checkingLoc} className={`w-full py-4 rounded-xl font-bold shadow-lg flex justify-center items-center gap-2 text-white ${(isSubmitting || checkingLoc) ? 'bg-gray-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'}`}>
                    {checkingLoc ? <><Loader2 className="animate-spin" /> Cek Lokasi...</> : isSubmitting ? <><Loader2 className="animate-spin" /> Memproses...</> : 'Buat Pesanan'}
                </button>
            </div>
        </div>
    );
};

export default CartPage;