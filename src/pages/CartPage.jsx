import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp, doc, updateDoc, increment, getDoc, query, where, getDocs } from 'firebase/firestore';
import { ArrowLeft, Plus, Minus, CreditCard, MapPin, Loader2, Navigation, AlertTriangle, X, Upload, Download, Image as ImageIcon, User, AlertCircle, Armchair, Lock, QrCode, ScanLine } from 'lucide-react';
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
    const [isCheckingTable, setIsCheckingTable] = useState(false);
    const [showQrisModal, setShowQrisModal] = useState(false);
    const [showTableOccupiedModal, setShowTableOccupiedModal] = useState(false);

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
            } catch (error) { setIsLocationValid(true); }
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

    const checkTableAvailability = async (tableNumber) => {
        const q = query(
            collection(db, "orders"),
            where("tableNumber", "==", tableNumber),
            where("status", "in", ["pending", "cooking", "ready", "unpaid", "payment_rejected"])
        );
        const snapshot = await getDocs(q);
        return !snapshot.empty;
    };

    const handlePreCheck = async () => {
        if (subTotal <= 0) return;
        if (!customerName.trim()) { toast.error("Mohon isi Nama Anda"); return; }

        if (!scannedTable) {
            toast.error("Wajib Scan QR Code di atas meja!", {
                icon: '📷',
                style: { borderRadius: '10px', background: '#333', color: '#fff' },
                duration: 5000
            });
            return;
        }

        if (!isLocationValid && storeConfig && !storeConfig.bypass) { toast.error("Lokasi Anda terlalu jauh dari Cafe"); return; }

        setIsCheckingTable(true);
        try {
            const isOccupied = await checkTableAvailability(scannedTable);
            setIsCheckingTable(false);

            if (isOccupied) {
                setShowTableOccupiedModal(true);
                return;
            }

            setShowQrisModal(true);

        } catch (error) {
            setIsCheckingTable(false);
            toast.error("Gagal mengecek status meja");
            console.error(error);
        }
    };

    const submitToFirebase = async () => {
        if (!proofImage) {
            toast.error("Wajib upload bukti pembayaran!");
            return;
        }

        setIsSubmitting(true);
        try {
            const orderId = `TRX-${Date.now().toString().slice(-8)}`;

            await addDoc(collection(db, "orders"), {
                orderId,
                tableNumber: scannedTable,
                customerName: customerName,
                customerEmail: currentUser?.email || '-',
                items: Object.values(cart),
                subTotal,
                uniqueCode,
                total: totalWithCode,
                paymentMethod: 'QRIS Transfer',
                proofImage: proofImage,
                diningOption: 'dine-in',
                note: orderNote,
                status: 'pending',
                paymentStatus: 'unpaid',
                createdAt: serverTimestamp()
            });

            Object.values(cart).forEach(async (item) => {
                await updateDoc(doc(db, "products", item.id), { stock: increment(-item.qty) });
            });

            clearCart();
            toast.success("Pesanan Berhasil!");
            navigate('/history');
        } catch (error) {
            console.error(error);
            toast.error("Gagal membuat pesanan");
            setIsSubmitting(false);
        }
    };

    const downloadQris = () => {
        const link = document.createElement('a');
        link.href = '/assets/qris.png';
        link.download = 'QRIS-Cafe-Futura.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (Object.keys(cart).length === 0) return <div className="p-10 text-center">Keranjang Kosong <button onClick={() => navigate('/')} className="block mx-auto mt-4 text-orange-600 font-bold">Belanja Dulu</button></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-36">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center gap-4">
                <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={24} /></button>
                <h1 className="font-bold text-lg">Checkout</h1>
            </header>

            <div className="p-4 space-y-4">
                <div className={`border p-4 rounded-xl flex items-start gap-3 ${checkingLoc ? 'bg-blue-50 text-blue-700' : isLocationValid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    <div className="mt-1 shrink-0">{checkingLoc ? <Loader2 className="animate-spin" /> : isLocationValid ? <Navigation /> : <AlertTriangle />}</div>
                    <div className="flex-1">
                        <p className="font-bold text-sm">{checkingLoc ? "Cek Lokasi..." : isLocationValid ? "Lokasi Valid (Dalam Jangkauan)" : "Lokasi Invalid (Terlalu Jauh)"}</p>
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

                <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                    <h3 className="font-bold text-sm text-gray-500 uppercase border-b pb-2">Data Pemesan</h3>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Nama Pemesan <span className="text-red-500">*</span></label>
                        <div className="flex items-center gap-2 border rounded-xl px-3 py-2 bg-gray-50 focus-within:bg-white focus-within:border-orange-500 transition">
                            <User size={18} className="text-gray-400" />
                            <input
                                type="text"
                                placeholder="Masukkan Nama Anda"
                                className="w-full bg-transparent outline-none font-bold text-gray-800"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Nomor Meja <span className="text-red-500">* (Wajib Scan)</span></label>

                        <div className={`flex items-center gap-2 border rounded-xl px-3 py-2 transition ${scannedTable ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-200'}`}>
                            {scannedTable ? <QrCode size={18} className="text-green-600" /> : <ScanLine size={18} className="text-red-400 animate-pulse" />}

                            <input
                                type="text"
                                placeholder="Belum Scan QR Code"
                                className={`w-full bg-transparent outline-none font-bold ${scannedTable ? 'text-green-800' : 'text-red-800'}`}
                                value={scannedTable ? scannedTable : ''}
                                readOnly
                                disabled
                            />

                            <Lock size={14} className={scannedTable ? "text-green-600" : "text-red-400"} />
                        </div>

                        {!scannedTable ? (
                            <p className="text-[10px] text-red-500 mt-1 font-bold flex items-center gap-1">
                                <AlertCircle size={10} /> Anda belum Scan QR Code di meja.
                            </p>
                        ) : (
                            <p className="text-[10px] text-green-600 mt-1 font-bold flex items-center gap-1">
                                <QrCode size={10} /> Meja terverifikasi dari Scan QR
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Catatan Tambahan</label>
                        <textarea
                            placeholder="Contoh: Jangan terlalu pedas, es dipisah..."
                            className="w-full border rounded-xl px-3 py-2 bg-gray-50 outline-none text-sm"
                            rows={2}
                            value={orderNote}
                            onChange={(e) => setOrderNote(e.target.value)}
                        ></textarea>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <h3 className="font-bold mb-3 text-sm text-gray-500 uppercase">Opsi Penyajian</h3>
                    <div className="p-3 border border-orange-500 bg-orange-50 rounded-xl flex items-center gap-3">
                        <MapPin size={24} className="text-orange-600" />
                        <div>
                            <span className="text-sm font-bold block text-orange-800">Diantar ke Meja</span>
                            <span className="text-[10px] text-orange-600">Pesanan akan diantar waiter ke meja Anda.</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <h3 className="font-bold mb-3 text-sm text-gray-500 uppercase">Metode Pembayaran</h3>
                    <div className="p-3 border border-blue-500 bg-blue-50 rounded-xl flex items-center gap-3">
                        <CreditCard size={24} className="text-blue-600" />
                        <div>
                            <span className="text-sm font-bold block text-blue-800">QRIS (Cashless Only)</span>
                            <span className="text-[10px] text-blue-600">Scan QRIS & Upload Bukti Transfer.</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 w-full bg-white border-t p-4 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <div className="flex justify-between mb-3 font-bold text-lg">
                    <span>Total</span>
                    <span>Rp {totalWithCode.toLocaleString()}</span>
                </div>

                <button
                    onClick={handlePreCheck}
                    disabled={isSubmitting || checkingLoc || !isLocationValid || isCheckingTable}
                    className={`w-full py-4 rounded-xl font-bold shadow-lg flex justify-center items-center gap-2 text-white transition-all
                        ${(isSubmitting || checkingLoc || isCheckingTable) ? 'bg-gray-400 cursor-wait' : !isLocationValid ? 'bg-red-400' : !scannedTable ? 'bg-gray-400' : 'bg-slate-900 hover:bg-slate-800'}
                    `}
                >
                    {isSubmitting || isCheckingTable ? <><Loader2 className="animate-spin" /> Memproses...</> : 'Buat Pesanan'}
                </button>
            </div>

            {showTableOccupiedModal && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl">
                        <div className="bg-red-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                            <Armchair size={32} className="text-red-600" />
                        </div>
                        <h3 className="font-bold text-lg text-gray-800 mb-2">Meja Sedang Terisi</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Maaf, <b>Meja {scannedTable}</b> sudah memiliki pesanan aktif yang belum selesai.
                            <br /><br />
                            Silakan pindah ke meja lain yang kosong dan Scan QR Code di meja tersebut.
                        </p>
                        <button
                            onClick={() => setShowTableOccupiedModal(false)}
                            className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700"
                        >
                            Baik, Saya Pindah Meja
                        </button>
                    </div>
                </div>
            )}

            {showQrisModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 flex flex-col items-center max-h-[95vh] overflow-y-auto">
                        <div className="w-full flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Pembayaran QRIS</h3>
                            <button onClick={() => setShowQrisModal(false)}><X className="text-gray-500" /></button>
                        </div>

                        <div className="relative group w-full flex justify-center mb-4">
                            <div className="bg-white p-2 border-2 border-orange-500 rounded-xl shadow-lg">
                                <img src="/assets/qris.png" alt="QRIS CODE" className="h-64 object-contain" onError={(e) => e.target.src = 'https://via.placeholder.com/300x400?text=QRIS+IMAGE'} />
                            </div>
                            <button onClick={downloadQris} className="absolute bottom-4 right-1/2 translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg hover:bg-slate-700">
                                <Download size={14} /> Simpan QRIS
                            </button>
                        </div>

                        <div className="text-center w-full mb-4 bg-orange-50 p-4 rounded-xl border border-orange-200">
                            <p className="text-sm text-gray-600 mb-1 font-bold">TOTAL TRANSFER:</p>
                            <div className="text-4xl font-black text-orange-600 tracking-tight">
                                Rp {totalWithCode.toLocaleString('id-ID')}
                            </div>
                            <div className="mt-2 text-xs bg-white p-2 rounded border border-orange-100 text-orange-800">
                                Kode Unik: <b>{uniqueCode}</b> (Sudah termasuk)
                            </div>
                        </div>

                        <div className="w-full mb-6">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Upload Bukti Transfer <span className="text-red-500">*</span></label>
                            <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50 text-center hover:bg-gray-100 transition cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                {previewUrl ? (
                                    <div className="relative">
                                        <img src={previewUrl} alt="Preview" className="h-32 mx-auto rounded object-contain" />
                                        <div className="text-xs text-green-600 font-bold mt-2 flex items-center justify-center gap-1"><ImageIcon size={12} /> Foto Siap Upload</div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-gray-400">
                                        <Upload size={32} className="mb-2" />
                                        <span className="text-xs font-bold">Klik untuk upload foto</span>
                                        <span className="text-[10px]">Format: JPG/PNG (Max 2MB)</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={submitToFirebase}
                            disabled={isSubmitting}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-green-200 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : "Konfirmasi Pembayaran"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CartPage;