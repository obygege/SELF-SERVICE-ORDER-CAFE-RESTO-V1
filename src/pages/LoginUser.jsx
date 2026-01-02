import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Lock, Mail, User, Navigation, ScanLine, QrCode, Smartphone, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginUser = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');

    const [storeConfig, setStoreConfig] = useState(null);
    const [isAllowed, setIsAllowed] = useState(false);
    const [gpsStatus, setGpsStatus] = useState('loading');
    const [distance, setDistance] = useState(null);
    const [hasTable, setHasTable] = useState(false);
    const [checkingLoc, setCheckingLoc] = useState(false);

    const { loginEmail, registerEmail, loginGoogle } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tableParam = searchParams.get('table');

    useEffect(() => {
        const savedTable = localStorage.getItem('activeTable');
        if (tableParam) {
            localStorage.setItem('activeTable', tableParam);
            setHasTable(true);
        } else if (savedTable) {
            setHasTable(true);
        } else {
            setHasTable(false);
        }

        const fetchConfig = async () => {
            try {
                const docRef = doc(db, "settings", "location");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setStoreConfig(data);
                    if (!data.latitude) {
                        setIsAllowed(true);
                        setGpsStatus('allowed');
                    }
                } else {
                    setGpsStatus('allowed');
                    setIsAllowed(true);
                }
            } catch (error) {
                setGpsStatus('allowed');
                setIsAllowed(true);
            }
        };
        fetchConfig();
    }, [tableParam]);

    const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    useEffect(() => {
        if (!storeConfig || !storeConfig.latitude) return;
        setCheckingLoc(true);

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const dist = getDistanceFromLatLonInKm(
                    position.coords.latitude,
                    position.coords.longitude,
                    storeConfig.latitude,
                    storeConfig.longitude
                );
                setDistance(dist);
                const maxRadius = storeConfig.radiusKM || 0.1;

                if (dist <= maxRadius) {
                    setIsAllowed(true);
                    setGpsStatus('allowed');
                } else {
                    setIsAllowed(false);
                    setGpsStatus('denied');
                }
                setCheckingLoc(false);
            },
            () => {
                setGpsStatus('error');
                setCheckingLoc(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [storeConfig]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isAllowed) return toast.error("Lokasi tidak diizinkan");

        const loadingToast = toast.loading(isRegister ? "Mendaftarkan..." : "Memverifikasi...");

        try {
            if (isRegister) {
                const res = await registerEmail(email, password, name);
                await setDoc(doc(db, "users", res.user.uid), {
                    uid: res.user.uid,
                    name: name,
                    email: email,
                    phoneNumber: phoneNumber,
                    role: 'user',
                    createdAt: serverTimestamp()
                });
                toast.success("Daftar Berhasil!", { id: loadingToast });
            } else {
                const res = await loginEmail(email, password);
                if (phoneNumber) {
                    await updateDoc(doc(db, "users", res.user.uid), {
                        phoneNumber: phoneNumber
                    }).catch(() => { });
                }
                toast.success("Masuk Berhasil!", { id: loadingToast });
            }
            navigate('/');
        } catch (err) {
            console.error(err);
            let msg = "Terjadi kesalahan";
            if (err.code === 'auth/email-already-in-use') msg = "Email sudah terdaftar";
            if (err.code === 'auth/weak-password') msg = "Password terlalu lemah";
            if (err.code === 'auth/invalid-credential') msg = "Email atau Password salah";
            toast.error(msg, { id: loadingToast });
        }
    };

    const handleGoogle = async () => {
        if (!isAllowed) return toast.error("Lokasi terlalu jauh");

        const loadingToast = toast.loading("Menghubungkan Google...");
        try {
            const res = await loginGoogle();
            const userRef = doc(db, "users", res.user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    uid: res.user.uid,
                    name: res.user.displayName,
                    email: res.user.email,
                    phoneNumber: res.user.phoneNumber || '',
                    role: 'user',
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp()
                });
            } else {
                await updateDoc(userRef, {
                    lastLogin: serverTimestamp()
                });
            }

            toast.success("Berhasil Masuk!", { id: loadingToast });
            navigate('/');
        } catch (err) {
            console.error(err);
            toast.error("Gagal Login Google", { id: loadingToast });
        }
    };

    if (!hasTable) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center relative overflow-hidden">
                <div className="absolute top-[-20%] left-[-20%] w-96 h-96 bg-orange-300 rounded-full blur-[100px] opacity-30"></div>
                <div className="bg-white/80 backdrop-blur-xl border border-white shadow-2xl p-8 rounded-3xl max-w-sm w-full relative z-10">
                    <div className="w-20 h-20 bg-gradient-to-tr from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <QrCode className="text-white w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Scan QR Meja</h1>
                    <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                        Silakan scan <b>QR Code</b> di meja Anda untuk memesan.
                    </p>
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-4">
                            <Smartphone className="text-orange-500 w-5 h-5" />
                            <div className="text-left">
                                <p className="text-gray-800 text-xs font-bold">Langkah 1</p>
                                <p className="text-gray-400 text-[10px]">Buka Kamera HP</p>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-4">
                            <ScanLine className="text-orange-500 w-5 h-5" />
                            <div className="text-left">
                                <p className="text-gray-800 text-xs font-bold">Langkah 2</p>
                                <p className="text-gray-400 text-[10px]">Arahkan ke QR Code</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 relative overflow-hidden font-sans">
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-orange-500 to-orange-400 rounded-b-[50px] z-0 shadow-lg"></div>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md z-10 overflow-hidden relative border border-gray-100">
                <div className="p-8 pb-4 text-center">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-orange-50 shadow-md">
                        <img src="/assets/logo.png" alt="Logo" className="w-full h-full object-contain" onError={(e) => e.target.style.display = 'none'} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">{isRegister ? 'Buat Akun Baru' : 'Selamat Datang'}</h2>
                    <div className="flex flex-col items-center justify-center gap-1 my-4">
                        <span className={`text-[10px] px-3 py-1.5 rounded-full font-bold border flex items-center gap-1 ${gpsStatus === 'allowed' ? 'bg-green-50 text-green-700 border-green-200' :
                                gpsStatus === 'denied' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-100 text-gray-500'
                            }`}>
                            <Navigation size={12} />
                            {checkingLoc ? "Mencari Lokasi..." : gpsStatus === 'allowed' ? "Lokasi Valid" : gpsStatus === 'denied' ? "Lokasi Kejauhan" : "GPS Mati"}
                        </span>
                        {distance !== null && <span className="text-[10px] text-gray-400">Jarak: {(distance * 1000).toFixed(0)}m</span>}
                    </div>
                </div>

                <div className="px-8 pb-8">
                    <button onClick={handleGoogle} disabled={!isAllowed} className="w-full border border-gray-300 bg-white py-2.5 rounded-xl flex items-center justify-center gap-2 transition mb-6 font-medium text-gray-700 active:scale-95 disabled:opacity-50">
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />
                        {isRegister ? 'Daftar dengan Google' : 'Masuk dengan Google'}
                    </button>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isRegister && (
                            <div className="relative group">
                                <User className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                <input type="text" className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-gray-50" placeholder="Nama Lengkap" required value={name} onChange={(e) => setName(e.target.value)} disabled={!isAllowed} />
                            </div>
                        )}
                        <div className="relative group">
                            <Phone className="absolute left-3 top-3.5 text-gray-400" size={18} />
                            <input type="tel" className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-gray-50" placeholder="No. HP / WhatsApp" required={isRegister} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} disabled={!isAllowed} />
                        </div>
                        <div className="relative group">
                            <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
                            <input type="email" className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-gray-50" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isAllowed} />
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                            <input type="password" className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-gray-50" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={!isAllowed} />
                        </div>
                        <button type="submit" disabled={!isAllowed} className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 rounded-xl font-bold shadow-lg disabled:grayscale active:scale-95 transition-all">
                            {isRegister ? 'Daftar Sekarang' : 'Masuk Aplikasi'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        <span className="text-gray-500">{isRegister ? 'Sudah punya akun? ' : 'Belum punya akun? '}</span>
                        <button onClick={() => setIsRegister(!isRegister)} className="text-orange-600 font-bold hover:underline">
                            {isRegister ? 'Login disini' : 'Daftar disini'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginUser;