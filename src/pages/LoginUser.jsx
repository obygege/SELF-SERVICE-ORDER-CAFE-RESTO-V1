import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Lock, Mail, User, Navigation, ScanLine, QrCode, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginUser = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    const [storeConfig, setStoreConfig] = useState(null);
    const [isAllowed, setIsAllowed] = useState(false);
    const [gpsStatus, setGpsStatus] = useState('loading');
    const [distance, setDistance] = useState(null);
    const [hasTable, setHasTable] = useState(false);

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
                    setStoreConfig(docSnap.data());
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
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    useEffect(() => {
        if (!storeConfig) return;

        if (!storeConfig.latitude) {
            setIsAllowed(true);
            setGpsStatus('allowed');
            return;
        }

        if (!navigator.geolocation) {
            setGpsStatus('error');
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;

                const dist = getDistanceFromLatLonInKm(userLat, userLng, storeConfig.latitude, storeConfig.longitude);
                setDistance(dist);

                const maxRadius = storeConfig.radiusKM || 0.1;

                if (dist <= maxRadius) {
                    setIsAllowed(true);
                    setGpsStatus('allowed');
                } else {
                    setIsAllowed(false);
                    setGpsStatus('denied');
                }
            },
            (error) => {
                setGpsStatus('error');
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [storeConfig]);

    const handleSuccessRedirect = () => {
        navigate('/');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isAllowed) return toast.error("Lokasi kejauhan! Mendekat ke Cafe.");

        try {
            if (isRegister) {
                const res = await registerEmail(email, password, name);
                await setDoc(doc(db, "users", res.user.uid), {
                    uid: res.user.uid,
                    name: name,
                    email: email,
                    role: 'user',
                    createdAt: new Date()
                });
                toast.success("Akun berhasil dibuat!");
            } else {
                await loginEmail(email, password);
                toast.success("Berhasil Masuk!");
            }
            handleSuccessRedirect();
        } catch (err) {
            toast.error(isRegister ? "Gagal Daftar" : "Email/Password Salah");
        }
    };

    const handleGoogle = async () => {
        if (!isAllowed) {
            toast.error("Lokasi Anda terlalu jauh dari Cafe.");
            return;
        }

        try {
            const res = await loginGoogle();

            const userRef = doc(db, "users", res.user.uid);
            await setDoc(userRef, {
                uid: res.user.uid,
                name: res.user.displayName,
                email: res.user.email,
                role: 'user',
                lastLogin: new Date()
            }, { merge: true });

            handleSuccessRedirect();
        } catch (err) {
            console.error("Google Error:", err);
            if (err.code === 'auth/popup-closed-by-user') {
                toast("Login dibatalkan");
            } else if (err.code === 'auth/unauthorized-domain') {
                toast.error("Domain belum diizinkan di Firebase!");
            } else {
                toast.error("Gagal Login Google");
            }
        }
    };

    if (!hasTable) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center relative overflow-hidden font-sans">
                <div className="absolute top-[-20%] left-[-20%] w-96 h-96 bg-orange-300 rounded-full blur-[100px] opacity-30 animate-pulse"></div>
                <div className="absolute bottom-[-20%] right-[-20%] w-96 h-96 bg-red-300 rounded-full blur-[100px] opacity-30 animate-pulse"></div>

                <div className="bg-white/80 backdrop-blur-xl border border-white shadow-2xl p-8 rounded-3xl max-w-sm w-full relative z-10">
                    <div className="w-20 h-20 bg-gradient-to-tr from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-200">
                        <QrCode className="text-white w-10 h-10" />
                    </div>

                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Scan QR Meja</h1>
                    <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                        Untuk melakukan pemesanan, silakan scan <b>QR Code</b> yang berada di meja Anda menggunakan kamera HP.
                    </p>

                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="bg-white p-2 rounded-full border border-gray-200 shadow-sm">
                                <Smartphone className="text-orange-500 w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <p className="text-gray-800 text-xs font-bold">Langkah 1</p>
                                <p className="text-gray-400 text-[10px]">Buka Kamera / App QR Scanner</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="bg-white p-2 rounded-full border border-gray-200 shadow-sm">
                                <ScanLine className="text-orange-500 w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <p className="text-gray-800 text-xs font-bold">Langkah 2</p>
                                <p className="text-gray-400 text-[10px]">Arahkan ke QR Code di Meja</p>
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
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-orange-50 shadow-md p-2">
                        <img
                            src="/assets/logo.png"
                            alt="Logo"
                            className="w-full h-full object-contain"
                            onError={(e) => e.target.style.display = 'none'}
                        />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">
                        {isRegister ? 'Buat Akun Baru' : 'Selamat Datang'}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1 mb-2">
                        Silakan login untuk mulai memesan.
                    </p>

                    <div className="flex flex-col items-center justify-center gap-1 mb-4">
                        <span className={`text-[10px] px-3 py-1.5 rounded-full font-bold border flex items-center gap-1 transition-colors ${gpsStatus === 'allowed' ? 'bg-green-50 text-green-700 border-green-200' :
                            gpsStatus === 'denied' ? 'bg-red-50 text-red-700 border-red-200' :
                                'bg-gray-100 text-gray-500 border-gray-200'
                            }`}>
                            <Navigation size={12} />
                            {gpsStatus === 'loading' && "Mencari Lokasi..."}
                            {gpsStatus === 'allowed' && "Lokasi Valid - Silakan Masuk"}
                            {gpsStatus === 'denied' && "Lokasi Kejauhan"}
                            {gpsStatus === 'error' && "GPS Error / Mati"}
                        </span>
                        {distance !== null && <span className="text-[10px] text-gray-400">Jarak: {(distance * 1000).toFixed(0)}m</span>}
                    </div>
                </div>

                <div className="px-8 pb-8">
                    <button
                        onClick={handleGoogle}
                        className={`w-full border border-gray-300 bg-white py-2.5 rounded-xl flex items-center justify-center gap-2 transition mb-6 font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm active:scale-95`}
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />
                        {isRegister ? 'Daftar dengan Google' : 'Masuk dengan Google'}
                    </button>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                        <div className="relative flex justify-center text-xs uppercase text-gray-400 font-bold tracking-wider"><span className="bg-white px-3">Atau via Email</span></div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isRegister && (
                            <div className="relative group">
                                <User className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                                <input type="text" className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition bg-gray-50 focus:bg-white" placeholder="Nama Lengkap" required value={name} onChange={(e) => setName(e.target.value)} disabled={!isAllowed} />
                            </div>
                        )}
                        <div className="relative group">
                            <Mail className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                            <input type="email" className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition bg-gray-50 focus:bg-white" placeholder="email@anda.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isAllowed} />
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                            <input type="password" className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition bg-gray-50 focus:bg-white" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={!isAllowed} />
                        </div>

                        <button type="submit" className={`w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-orange-200 flex justify-center items-center gap-2 ${!isAllowed ? 'opacity-50 cursor-not-allowed shadow-none grayscale' : 'hover:from-orange-500 hover:to-red-500 active:scale-95'}`} disabled={!isAllowed}>
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