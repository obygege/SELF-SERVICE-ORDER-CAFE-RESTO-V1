import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Lock, Mail, User, UtensilsCrossed, Loader2, Navigation, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginUser = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    // State Validasi Lokasi
    const [storeConfig, setStoreConfig] = useState(null);
    const [isAllowed, setIsAllowed] = useState(false);
    const [gpsStatus, setGpsStatus] = useState('loading');
    const [distance, setDistance] = useState(null);

    const { loginEmail, registerEmail, loginGoogle } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tableParam = searchParams.get('table');

    // 1. Ambil Config Lokasi
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const docRef = doc(db, "settings", "location");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setStoreConfig(docSnap.data());
                } else {
                    // Jika admin belum set lokasi, izinkan login
                    setGpsStatus('allowed');
                    setIsAllowed(true);
                }
            } catch (error) {
                console.error(error);
                // Fallback jika error, izinkan login
                setIsAllowed(true);
                setGpsStatus('allowed');
            }
        };
        fetchConfig();
    }, []);

    // Rumus Jarak
    const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const deg2rad = (deg) => deg * (Math.PI / 180);

    // 2. Cek GPS
    useEffect(() => {
        if (!storeConfig) return;

        // Jika latitude 0 atau tidak ada, anggap mode bebas (boleh login)
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
                console.error("GPS Error:", error);
                setGpsStatus('error');
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [storeConfig]);

    // Handle Redirect setelah Login Sukses
    const handleSuccessRedirect = () => {
        if (tableParam) {
            navigate(`/?table=${tableParam}`);
        } else {
            navigate('/');
        }
    };

    // --- HANDLE LOGIN EMAIL ---
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
            console.error(err);
            toast.error(isRegister ? "Gagal Daftar (Email terpakai?)" : "Email/Password Salah");
        }
    };

    // --- HANDLE LOGIN GOOGLE ---
    const handleGoogle = async () => {
        // Cek lokasi dulu secara sinkron (variabel state)
        if (!isAllowed) {
            if (gpsStatus === 'loading') toast("Sedang mencari lokasi...");
            else if (gpsStatus === 'error') toast.error("Aktifkan GPS Browser Anda!");
            else toast.error("Lokasi Anda terlalu jauh dari Cafe.");
            return;
        }

        try {
            const res = await loginGoogle();

            // Simpan/Update data user di Firestore
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
            console.error("Google Login Error Full:", err);

            if (err.code === 'auth/popup-closed-by-user') {
                toast("Login dibatalkan");
            } else if (err.code === 'auth/unauthorized-domain') {
                toast.error("Domain belum diizinkan di Firebase Console!");
            } else {
                toast.error("Gagal Login Google: " + err.message);
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-orange-500 to-orange-400 rounded-b-[50px] z-0"></div>

            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md z-10 overflow-hidden relative">
                <div className="p-8 pb-4 text-center">
                    <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                        <UtensilsCrossed />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">
                        {isRegister ? 'Buat Akun Baru' : 'Selamat Datang'}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1 mb-2">
                        Wajib berada di lokasi cafe untuk login.
                    </p>

                    {/* STATUS BAR GPS */}
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
                    {/* GOOGLE BUTTON */}
                    <button
                        onClick={handleGoogle}
                        // Matikan tombol jika lokasi belum valid (kecuali mode dev/loading)
                        disabled={!isAllowed}
                        className={`w-full border border-gray-300 py-2.5 rounded-lg flex items-center justify-center gap-2 transition mb-6 font-medium text-gray-700 
                        ${!isAllowed ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50 active:scale-95'}`}
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />
                        {isRegister ? 'Daftar dengan Google' : 'Masuk dengan Google'}
                    </button>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                        <div className="relative flex justify-center text-xs uppercase text-gray-400 font-bold tracking-wider"><span className="bg-white px-2">Atau via Email</span></div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isRegister && (
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input type="text" className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Nama Lengkap" required value={name} onChange={(e) => setName(e.target.value)} disabled={!isAllowed} />
                            </div>
                        )}
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input type="email" className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="email@anda.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isAllowed} />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input type="password" className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={!isAllowed} />
                        </div>

                        <button type="submit" className={`w-full bg-orange-600 text-white py-3 rounded-lg font-bold transition shadow-lg shadow-orange-200 flex justify-center items-center gap-2 ${!isAllowed ? 'opacity-50 cursor-not-allowed shadow-none' : 'hover:bg-orange-700 active:scale-95'}`} disabled={!isAllowed}>
                            {isRegister ? 'Daftar Sekarang' : 'Masuk Aplikasi'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        <span className="text-gray-500">{isRegister ? 'Sudah punya akun? ' : 'Belum punya akun? '}</span>
                        <button onClick={() => setIsRegister(!isRegister)} className="text-orange-600 font-bold hover:underline">
                            {isRegister ? 'Login disini' : 'Daftar disini'}
                        </button>
                    </div>

                    <div className="mt-8 pt-4 border-t text-center">
                        <Link to="/staff-login" className="text-xs text-gray-400 hover:text-gray-600 font-medium">Login Khusus Staff (Admin/Kepala)</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginUser;