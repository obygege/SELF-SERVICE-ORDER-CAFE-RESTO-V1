import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Settings, MapPin, Save, Globe, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [inputString, setInputString] = useState('');
    const [radius, setRadius] = useState(0.1);
    const [coords, setCoords] = useState({ lat: 0, lng: 0 }); // State utama koordinat

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                // PENTING: Gunakan path 'settings/location' agar terbaca di Halaman Login User
                const docRef = doc(db, "settings", "location");
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setCoords({ lat: data.latitude, lng: data.longitude });
                    setRadius(data.radiusKM || 0.1); // Sesuaikan key dengan LoginUser (radiusKM)
                    setInputString(`${data.latitude}, ${data.longitude}`);
                }
            } catch (error) {
                console.error("Gagal memuat setting:", error);
                toast.error("Gagal memuat data lokasi");
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    // FUNGSI PINTAR DETEKSI KOORDINAT
    const parseCoordinates = (text) => {
        if (!text) return null;

        // 1. Cek Pola Umum "Lat, Long" (Contoh: -6.123, 106.123)
        // Menangani spasi atau tanpa spasi
        const simplePattern = /([-+]?\d+\.\d+),\s*([-+]?\d+\.\d+)/;
        const simpleMatch = text.match(simplePattern);
        if (simpleMatch) {
            return { lat: parseFloat(simpleMatch[1]), lng: parseFloat(simpleMatch[2]) };
        }

        // 2. Cek Link Google Maps dengan '@' (Contoh: .../maps/@-6.123,106.123,15z...)
        const atPattern = /@([-+]?\d+\.\d+),([-+]?\d+\.\d+)/;
        const atMatch = text.match(atPattern);
        if (atMatch) {
            return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
        }

        // 3. Cek Link Search '?q=' (Contoh: .../search?q=-6.123,106.123)
        const qPattern = /q=([-+]?\d+\.\d+),([-+]?\d+\.\d+)/;
        const qMatch = text.match(qPattern);
        if (qMatch) {
            return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
        }

        // 4. Cek Link Panjang Embed '!3d' dan '!4d'
        const latLongPattern = /!3d([-+]?\d+\.\d+)!4d([-+]?\d+\.\d+)/;
        const embedMatch = text.match(latLongPattern);
        if (embedMatch) {
            return { lat: parseFloat(embedMatch[1]), lng: parseFloat(embedMatch[2]) };
        }

        return null;
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setInputString(val);

        // Coba deteksi koordinat setiap kali ketik/paste
        const detected = parseCoordinates(val);
        if (detected) {
            setCoords(detected);
        }
    };

    const handleSave = async () => {
        if (!coords.lat || !coords.lng) {
            return toast.error("Koordinat belum valid! Pastikan angka Lat/Long terdeteksi.");
        }

        setSaving(true);
        try {
            // Simpan ke path yang benar: 'settings/location'
            await setDoc(doc(db, "settings", "location"), {
                latitude: parseFloat(coords.lat),
                longitude: parseFloat(coords.lng),
                radiusKM: parseFloat(radius),
                updatedAt: new Date()
            });
            toast.success("✅ Lokasi Toko Berhasil Disimpan!");
        } catch (error) {
            console.error(error);
            toast.error("Gagal menyimpan: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-orange-600" /></div>;

    return (
        <div className="max-w-2xl mx-auto pb-20">
            <h1 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2">
                <Settings className="text-orange-600" /> Pengaturan Toko
            </h1>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-700">
                    <MapPin size={20} /> Titik Koordinat Toko
                </h2>

                <div className="bg-blue-50 p-4 rounded-xl mb-6 text-sm text-blue-800 border border-blue-100">
                    <p className="font-bold mb-2 flex items-center gap-2"><Globe size={16} /> Cara Mengisi:</p>
                    <ul className="list-disc pl-5 space-y-1 opacity-90">
                        <li>Buka Google Maps Toko Anda.</li>
                        <li><strong>Klik Kanan</strong> tepat di lokasi toko, lalu klik angka koordinat (Contoh: -6.200, 106.816).</li>
                        <li><strong>Paste</strong> angka tersebut ke kolom di bawah.</li>
                        <li>Atau Paste Link lengkap dari Address Bar browser.</li>
                    </ul>
                </div>

                <div className="space-y-6">
                    {/* INPUT STRING */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Paste Koordinat / Link Maps</label>
                        <div className="relative">
                            <input
                                type="text"
                                className="w-full pl-4 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-0 outline-none transition font-medium"
                                placeholder="Contoh: -6.175392, 106.827153"
                                value={inputString}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>

                    {/* PREVIEW HASIL DETEKSI */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider">Latitude (Garis Lintang)</span>
                            <p className={`font-mono font-bold text-lg ${coords.lat ? 'text-slate-800' : 'text-gray-300'}`}>
                                {coords.lat || 'Belum Terdeteksi'}
                            </p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider">Longitude (Garis Bujur)</span>
                            <p className={`font-mono font-bold text-lg ${coords.lng ? 'text-slate-800' : 'text-gray-300'}`}>
                                {coords.lng || 'Belum Terdeteksi'}
                            </p>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* RADIUS */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Jarak Maksimum Login (KM)</label>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                step="0.01"
                                className="w-32 p-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none font-bold text-center"
                                value={radius}
                                onChange={(e) => setRadius(e.target.value)}
                            />
                            <div className="text-sm text-gray-500">
                                <span className="font-bold text-orange-600">= {Math.round(radius * 1000)} Meter</span>
                                <p className="text-xs">Jarak aman pengguna bisa login.</p>
                            </div>
                        </div>
                    </div>

                    {/* TOMBOL SIMPAN */}
                    <button
                        onClick={handleSave}
                        disabled={saving || !coords.lat}
                        className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg
                            ${coords.lat
                                ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                            }
                        `}
                    >
                        {saving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> SIMPAN PENGATURAN</>}
                    </button>

                    {!coords.lat && (
                        <p className="text-center text-xs text-red-500 font-medium flex items-center justify-center gap-1">
                            <AlertTriangle size={12} /> Masukkan koordinat yang valid untuk menyimpan.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;