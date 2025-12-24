import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Settings, MapPin, Save, Globe, Loader2, AlertTriangle, Navigation, Info } from 'lucide-react';
import { MapContainer, TileLayer, Circle, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import toast from 'react-hot-toast';

// Fix Icon Marker Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const RecenterMap = ({ lat, lng }) => {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) {
            map.flyTo([lat, lng], 17); // Zoom level diperbesar biar kelihatan detail
        }
    }, [lat, lng, map]);
    return null;
};

const AdminSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [inputString, setInputString] = useState('');
    const [radius, setRadius] = useState(0.1);
    const [coords, setCoords] = useState({ lat: -6.200000, lng: 106.816666 });
    const [isConfigLoaded, setIsConfigLoaded] = useState(false);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const docRef = doc(db, "settings", "location");
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setCoords({ lat: data.latitude, lng: data.longitude });
                    setRadius(data.radiusKM || 0.1);
                    setInputString(`${data.latitude}, ${data.longitude}`);
                    setIsConfigLoaded(true);
                }
            } catch (error) {
                console.error(error);
                toast.error("Gagal memuat data lokasi");
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const parseCoordinates = (text) => {
        if (!text) return null;
        const simplePattern = /([-+]?\d+\.\d+),\s*([-+]?\d+\.\d+)/;
        const simpleMatch = text.match(simplePattern);
        if (simpleMatch) return { lat: parseFloat(simpleMatch[1]), lng: parseFloat(simpleMatch[2]) };

        const atPattern = /@([-+]?\d+\.\d+),([-+]?\d+\.\d+)/;
        const atMatch = text.match(atPattern);
        if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

        const qPattern = /q=([-+]?\d+\.\d+),([-+]?\d+\.\d+)/;
        const qMatch = text.match(qPattern);
        if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

        const latLongPattern = /!3d([-+]?\d+\.\d+)!4d([-+]?\d+\.\d+)/;
        const embedMatch = text.match(latLongPattern);
        if (embedMatch) return { lat: parseFloat(embedMatch[1]), lng: parseFloat(embedMatch[2]) };

        return null;
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setInputString(val);
        const detected = parseCoordinates(val);
        if (detected) {
            setCoords(detected);
            setIsConfigLoaded(true);
        }
    };

    const handleSave = async () => {
        if (!isConfigLoaded || !coords.lat || !coords.lng) {
            return toast.error("Koordinat belum valid!");
        }

        setSaving(true);
        try {
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
        <div className="max-w-6xl mx-auto pb-20">
            <h1 className="text-3xl font-black text-gray-800 mb-8 flex items-center gap-3">
                <Settings className="text-orange-600" size={32} /> Pengaturan Lokasi
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-700">
                            <MapPin size={20} className="text-orange-500" /> Koordinat & Radius
                        </h2>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Paste Link / Koordinat Google Maps</label>
                                <textarea
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-0 outline-none font-mono text-sm h-24 resize-none transition"
                                    placeholder="-6.175392, 106.827153"
                                    value={inputString}
                                    onChange={handleInputChange}
                                />
                                <p className="text-xs text-gray-400 mt-2 flex gap-1">
                                    <Info size={12} /> Paste link dari browser atau klik kanan di Gmaps.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold">Latitude</span>
                                    <p className="font-mono font-bold text-slate-700 truncate">{coords.lat.toFixed(6)}</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold">Longitude</span>
                                    <p className="font-mono font-bold text-slate-700 truncate">{coords.lng.toFixed(6)}</p>
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Jarak Maksimum (Radius)</label>
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full pl-4 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none font-bold"
                                            value={radius}
                                            onChange={(e) => setRadius(parseFloat(e.target.value) || 0)}
                                        />
                                        <span className="absolute right-4 top-3.5 text-gray-400 font-bold text-sm">KM</span>
                                    </div>
                                    <div className="bg-orange-50 px-4 py-3 rounded-xl border border-orange-100 min-w-[100px] text-center">
                                        <span className="block text-[10px] text-orange-400 font-bold uppercase">Meter</span>
                                        <span className="font-bold text-orange-700">{Math.round(radius * 1000)} m</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={saving || !isConfigLoaded}
                                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg mt-4
                                    ${isConfigLoaded
                                        ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200 hover:scale-[1.02]'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                    }
                                `}
                            >
                                {saving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> SIMPAN PENGATURAN</>}
                            </button>

                            {!isConfigLoaded && (
                                <div className="bg-red-50 p-3 rounded-lg border border-red-100 flex gap-2 items-center text-xs text-red-600 font-medium">
                                    <AlertTriangle size={14} /> Koordinat belum valid.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 h-[500px] lg:h-auto bg-gray-900 rounded-3xl overflow-hidden shadow-inner border border-gray-800 relative z-0">
                    {coords.lat && coords.lng ? (
                        <MapContainer
                            center={[coords.lat, coords.lng]}
                            zoom={17}
                            scrollWheelZoom={true}
                            style={{ height: "100%", width: "100%" }}
                        >
                            {/* GOOGLE HYBRID TILES (SATELIT + NAMA JALAN) */}
                            <TileLayer
                                url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                                attribution='&copy; Google Maps'
                            />

                            <RecenterMap lat={coords.lat} lng={coords.lng} />

                            <CircleMarker
                                center={[coords.lat, coords.lng]}
                                radius={8}
                                pathOptions={{ color: 'white', fillColor: '#f97316', fillOpacity: 1, weight: 3 }}
                            />

                            <Circle
                                center={[coords.lat, coords.lng]}
                                radius={radius * 1000}
                                pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.2, weight: 2, dashArray: '10, 10' }}
                            />
                        </MapContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">Peta akan muncul setelah koordinat diisi</div>
                    )}

                    <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md p-3 rounded-xl shadow-lg border border-gray-600 z-[400] text-xs max-w-[200px] text-white">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow-sm"></span>
                            <span className="font-bold">Lokasi Toko</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500"></span>
                            <span className="font-bold">Area Login ({Math.round(radius * 1000)}m)</span>
                        </div>
                    </div>

                    <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-gray-200 z-[400] text-xs font-bold text-slate-600 flex items-center gap-2">
                        <Navigation size={14} className="text-blue-500" />
                        Mode Satelit (Hybrid)
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;