import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Lock, Mail, User, UtensilsCrossed, Loader2, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginUser = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    // State Validasi Lokasi
    const [checkingLoc, setCheckingLoc] = useState(false);
    const [storeConfig, setStoreConfig] = useState(null);

    const { loginEmail, registerEmail, loginGoogle } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tableParam = searchParams.get('table');

    // 1. Ambil Data Lokasi dari Database (settings/location)
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                // Pastikan path ini SAMA dengan yang disimpan AdminSettings
                const docRef = doc(db, "settings", "location");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setStoreConfig(docSnap.data());
                } else {
                    // Jika admin belum set, set radius 0 (atau bypass jika perlu)
                    console.warn("Lokasi toko belum diatur oleh admin.");
                }
            } catch (error) {
                console.error("Gagal ambil config lokasi", error);
            }
        };
        fetchConfig();
    }, []);

    // Rumus Haversine untuk hitung jarak
    const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radius bumi dalam km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const deg2rad = (deg) => deg * (Math.PI / 180);

    // Fungsi Validasi Lokasi
    const verifyLocation = () => {
        return new Promise((resolve, reject) => {
            // Jika admin belum setting lokasi, izinkan saja (mode development)
            if (!storeConfig || !storeConfig.latitude) {
                toast("Lokasi toko belum diatur Admin. Login diizinkan (Dev Mode).", { icon: '⚠️' });
                return resolve(true);
            }

            if (!navigator.geolocation) {
                toast.error("Browser Anda tidak mendukung GPS.");
                return reject("Browser tidak support GPS");
            }

            setCheckingLoc(true);
            const toastId = toast.loading("Memeriksa lokasi Anda...");

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLat = position.coords.latitude;
                    const userLng = position.coords.longitude;

                    // Hitung Jarak
                    const distance = getDistanceFromLatLonInKm(
                        userLat, userLng,
                        storeConfig.latitude, storeConfig.longitude
                    );

                    setCheckingLoc(false);
                    toast.dismiss(toastId);

                    // Validasi Jarak (storeConfig.radiusKM biasanya dalam KM)
                    const maxRadius = storeConfig.radiusKM || 0.1; // Default 100m jika null

                    if (distance <= maxRadius) {
                        toast.success(`Lokasi Valid! Jarak: ${(distance * 1000).toFixed(0)}m`);
                        resolve(true);
                    } else {
                        toast.error(`Terlalu Jauh! Jarak: ${(distance * 1000).toFixed(0)}m (Max: ${maxRadius * 1000}m)`);
                        reject("Lokasi Kejauhan");
                    }
                },
                (error) => {
                    setCheckingLoc(false);
                    toast.dismiss(toastId);
                    toast.error("Wajib aktifkan GPS untuk Login!");
                    reject("GPS Error/Denied");
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    };

    // 2. Handle Login Email/Password dengan Validasi
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (checkingLoc) return;

        try {
            // Cek Lokasi Dulu!
            await verifyLocation();

            // Jika Lokasi OK, Lanjut Login Firebase
            if (isRegister) {
                const res = await registerEmail(email, password);
                // Simpan data user tambahan
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

            // Redirect ke Menu (bawa parameter meja jika ada)
            if (tableParam) {
                navigate(`/?table=${tableParam}`);
            } else {
                navigate('/');
            }

        } catch (err) {
            // Error handling (bisa error lokasi atau error firebase)
            console.error(err);
            if (err.code) { // Error dari Firebase
                toast.error(isRegister ? "Gagal Daftar (Email sudah ada?)" : "Email/Password Salah");
            }
        }
    };

    // 3. Handle Login Google dengan Validasi
    const handleGoogle = async () => {
        if (checkingLoc) return;

        try {
            // Cek Lokasi Dulu!
            await verifyLocation();

            // Jika Lokasi OK, Lanjut Login Google
            const res = await loginGoogle();

            // Cek apakah user baru, jika ya simpan ke DB
            const userRef = doc(db, "users", res.user.uid);
            const userSnap = await getDoc(db, "users", res.user.uid); // Menggunakan getDoc helper auth context jika ada, atau import manual
            // Note: best practice cek di context atau setDoc dengan merge:true
            await setDoc(userRef, {
                uid: res.user.uid,
                name: res.user.displayName,
                email: res.user.email,
                role: 'user',
                lastLogin: new Date()
            }, { merge: true });

            if (tableParam) {
                navigate(`/?table=${tableParam}`);
            } else {
                navigate('/');
            }

        } catch (err) {
            if (err !== "Lokasi Kejauhan" && err !== "GPS Error/Denied") {
                toast.error("Gagal Login Google");
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

                    {/* Indikator Status Toko */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold border flex items-center gap-1 ${storeConfig ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                            <Navigation size={10} /> {storeConfig ? "Lokasi Toko Aktif" : "Menunggu Data Toko..."}
                        </span>
                    </div>
                </div>

                <div className="px-8 pb-8">
                    <button
                        onClick={handleGoogle}
                        disabled={checkingLoc}
                        className="w-full border border-gray-300 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition mb-6 font-medium text-gray-700"
                    >
                        {checkingLoc ? <Loader2 className="animate-spin w-5 h-5" /> : <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />}
                        {checkingLoc ? 'Memeriksa Lokasi...' : (isRegister ? 'Daftar dengan Google' : 'Masuk dengan Google')}
                    </button>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                        <div className="relative flex justify-center text-xs uppercase text-gray-400 font-bold tracking-wider"><span className="bg-white px-2">Atau via Email</span></div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isRegister && (
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input type="text" className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Nama Lengkap" required value={name} onChange={(e) => setName(e.target.value)} disabled={checkingLoc} />
                            </div>
                        )}
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input type="email" className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="email@anda.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={checkingLoc} />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input type="password" className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={checkingLoc} />
                        </div>

                        <button type="submit" className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700 transition shadow-lg shadow-orange-200 flex justify-center items-center gap-2" disabled={checkingLoc}>
                            {checkingLoc ? <><Loader2 className="animate-spin w-5 h-5" /> Memvalidasi...</> : (isRegister ? 'Daftar Sekarang' : 'Masuk Aplikasi')}
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