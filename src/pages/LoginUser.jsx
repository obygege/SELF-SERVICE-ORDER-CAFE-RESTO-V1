import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Lock, Mail, User, UtensilsCrossed, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginUser = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [checkingLoc, setCheckingLoc] = useState(false);
    const [storeConfig, setStoreConfig] = useState(null);

    const { loginEmail, registerEmail, loginGoogle } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tableParam = searchParams.get('table');

    useEffect(() => {
        if (tableParam) localStorage.setItem('activeTable', tableParam);

        // FETCH CONFIG LOKASI DARI DB
        const fetchConfig = async () => {
            const docRef = doc(db, "config", "storeSettings");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setStoreConfig(docSnap.data());
            } else {
                // Default jika belum disetting admin
                setStoreConfig({ latitude: 0, longitude: 0, radius: 0 });
            }
        };
        fetchConfig();
    }, [tableParam]);

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
            if (!storeConfig || storeConfig.latitude === 0) {
                // Jika admin belum set lokasi, loloskan saja (Mode Dev) atau Blokir
                // Disini kita loloskan agar tidak error saat setup awal
                return resolve(true);
            }

            if (!navigator.geolocation) {
                toast.error("Browser tidak mendukung GPS.");
                reject(false);
                return;
            }

            setCheckingLoc(true);
            toast("Memeriksa lokasi...", { icon: '📍' });

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLat = position.coords.latitude;
                    const userLng = position.coords.longitude;
                    const distance = getDistanceFromLatLonInKm(userLat, userLng, storeConfig.latitude, storeConfig.longitude);

                    setCheckingLoc(false);

                    if (distance <= storeConfig.radius) {
                        resolve(true);
                    } else {
                        toast.error(`Akses Ditolak! Anda berjarak ${distance.toFixed(2)} km dari lokasi.`);
                        reject(false);
                    }
                },
                (error) => {
                    setCheckingLoc(false);
                    toast.error("Wajib izinkan akses Lokasi!");
                    reject(false);
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    };

    const handleSuccessRedirect = () => {
        const finalTable = tableParam || localStorage.getItem('activeTable');
        if (finalTable) navigate(`/?table=${finalTable}`);
        else navigate('/');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (checkingLoc) return;
        try {
            await verifyLocation();
            if (isRegister) {
                await registerEmail(email, password, name);
                toast.success("Akun berhasil dibuat!");
            } else {
                await loginEmail(email, password);
                toast.success("Berhasil Masuk!");
            }
            handleSuccessRedirect();
        } catch (err) { if (err !== false) toast.error("Gagal Login"); }
    };

    const handleGoogle = async () => {
        if (checkingLoc) return;
        try {
            await verifyLocation();
            await loginGoogle();
            handleSuccessRedirect();
        } catch (err) { if (err !== false) toast.error("Gagal Login Google"); }
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
                    <p className="text-gray-500 text-sm mt-1">Sistem akan memverifikasi lokasi Anda.</p>
                    {tableParam && <div className="mt-2 inline-block bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200">Meja {tableParam}</div>}
                </div>

                <div className="px-8 pb-8">
                    <button onClick={handleGoogle} disabled={checkingLoc} className={`w-full border border-gray-300 py-2.5 rounded-lg flex items-center justify-center gap-2 transition mb-6 font-medium text-gray-700 ${checkingLoc ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
                        {checkingLoc ? <Loader2 className="animate-spin w-5 h-5" /> : <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />}
                        {checkingLoc ? 'Mengecek Lokasi...' : (isRegister ? 'Daftar dengan Google' : 'Masuk dengan Google')}
                    </button>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                        <div className="relative flex justify-center text-xs uppercase text-gray-400 font-bold tracking-wider"><span className="bg-white px-2">Atau via Email</span></div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isRegister && (
                            <div className="relative"><User className="absolute left-3 top-3 text-gray-400" size={18} /><input type="text" className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none" placeholder="Nama Lengkap" required value={name} onChange={(e) => setName(e.target.value)} /></div>
                        )}
                        <div className="relative"><Mail className="absolute left-3 top-3 text-gray-400" size={18} /><input type="email" className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none" placeholder="email@anda.com" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                        <div className="relative"><Lock className="absolute left-3 top-3 text-gray-400" size={18} /><input type="password" className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>

                        <button type="submit" disabled={checkingLoc} className={`w-full bg-orange-600 text-white py-3 rounded-lg font-bold transition flex justify-center items-center gap-2 ${checkingLoc ? 'opacity-70' : 'hover:bg-orange-700'}`}>
                            {checkingLoc ? <><Loader2 className="animate-spin w-5 h-5" /> Verifikasi...</> : (isRegister ? 'Daftar Sekarang' : 'Masuk Aplikasi')}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        <span className="text-gray-500">{isRegister ? 'Sudah punya akun? ' : 'Belum punya akun? '}</span>
                        <button onClick={() => setIsRegister(!isRegister)} className="text-orange-600 font-bold hover:underline">{isRegister ? 'Login disini' : 'Daftar disini'}</button>
                    </div>
                    <div className="mt-8 pt-4 border-t text-center"><Link to="/staff-login" className="text-xs text-gray-400 hover:text-gray-600 font-medium">Login Khusus Staff</Link></div>
                </div>
            </div>
        </div>
    );
};

export default LoginUser;