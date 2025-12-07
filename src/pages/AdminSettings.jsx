import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Settings, MapPin, Save, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminSettings = () => {
    const [loading, setLoading] = useState(true);
    const [inputString, setInputString] = useState('');
    const [radius, setRadius] = useState(0.1);
    const [preview, setPreview] = useState({ lat: 0, lng: 0 });

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const docRef = doc(db, "config", "storeSettings");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setPreview({ lat: data.latitude, lng: data.longitude });
                    setRadius(data.radius || 0.1);
                    setInputString(`${data.latitude}, ${data.longitude}`);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const parseCoordinates = (text) => {
        // 1. Coba Pattern Link Google Maps (@lat,lng)
        const urlPattern = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
        const urlMatch = text.match(urlPattern);
        if (urlMatch) {
            return { lat: parseFloat(urlMatch[1]), lng: parseFloat(urlMatch[2]) };
        }

        // 2. Coba Pattern Copy Coordinates (lat, lng)
        const coordPattern = /(-?\d+\.\d+),\s*(-?\d+\.\d+)/;
        const coordMatch = text.match(coordPattern);
        if (coordMatch) {
            return { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]) };
        }

        return null;
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setInputString(val);
        const coords = parseCoordinates(val);
        if (coords) {
            setPreview(coords);
        }
    };

    const handleSave = async () => {
        const coords = parseCoordinates(inputString);
        if (!coords) {
            return toast.error("Format Koordinat/Link tidak dikenali!");
        }

        try {
            await setDoc(doc(db, "config", "storeSettings"), {
                latitude: coords.lat,
                longitude: coords.lng,
                radius: parseFloat(radius),
                updatedAt: new Date()
            });
            toast.success("Lokasi Toko Disimpan!");
        } catch (error) {
            toast.error("Gagal menyimpan konfigurasi");
        }
    };

    if (loading) return <div className="p-10">Memuat...</div>;

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Settings className="text-orange-600" /> Pengaturan Toko
            </h1>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <MapPin size={20} /> Lokasi & GPS Validasi
                </h2>

                <div className="bg-blue-50 p-4 rounded-lg mb-6 text-sm text-blue-800">
                    <p className="font-bold mb-1">Cara Mengisi Lokasi:</p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Buka Google Maps Toko Anda.</li>
                        <li>Copy Link dari Address Bar (Browser), ATAU</li>
                        <li>Klik Kanan di titik toko, lalu klik angkanya (Copy Coordinates).</li>
                        <li>Paste ke kolom di bawah ini. Sistem otomatis mendeteksi.</li>
                    </ul>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Link Google Maps / Titik Koordinat</label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="text"
                                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                placeholder="Paste Link Google Maps atau Koordinat di sini..."
                                value={inputString}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border">
                        <div>
                            <span className="text-xs text-gray-500 uppercase font-bold">Terdeteksi Latitude</span>
                            <p className="font-mono font-bold text-gray-800">{preview.lat || '-'}</p>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 uppercase font-bold">Terdeteksi Longitude</span>
                            <p className="font-mono font-bold text-gray-800">{preview.lng || '-'}</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Jarak Maksimum Login (KM)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            value={radius}
                            onChange={(e) => setRadius(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">Contoh: 0.1 = 100 meter. 0.05 = 50 meter.</p>
                    </div>

                    <button
                        onClick={handleSave}
                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 flex items-center justify-center gap-2 mt-4"
                    >
                        <Save size={18} /> SIMPAN PENGATURAN
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;