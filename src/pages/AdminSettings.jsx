import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Settings, MapPin, Save, Loader2, AlertTriangle, Navigation, Info, PenTool, Trash2, Undo, Check } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, useMap, Polygon, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import toast from 'react-hot-toast';

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
            map.flyTo([lat, lng], 20);
        }
    }, [lat, lng, map]);
    return null;
};

const MapClickHandler = ({ isDrawing, onMapClick }) => {
    useMapEvents({
        click(e) {
            if (isDrawing) {
                onMapClick(e.latlng);
            }
        },
    });
    return null;
};

const AdminSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [inputString, setInputString] = useState('');
    const [coords, setCoords] = useState({ lat: -6.200000, lng: 106.816666 });
    const [isConfigLoaded, setIsConfigLoaded] = useState(false);

    const [drawMode, setDrawMode] = useState(false);
    const [polygonPoints, setPolygonPoints] = useState([]);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const docRef = doc(db, "settings", "location");
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setCoords({ lat: data.latitude, lng: data.longitude });
                    setInputString(`${data.latitude}, ${data.longitude}`);

                    if (data.polygon && Array.isArray(data.polygon)) {
                        setPolygonPoints(data.polygon);
                    }
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
        try {
            const latLongMatch = text.match(/!3d([-+]?\d+\.\d+)!4d([-+]?\d+\.\d+)/);
            if (latLongMatch) return { lat: parseFloat(latLongMatch[1]), lng: parseFloat(latLongMatch[2]) };

            const atMatch = text.match(/@([-+]?\d+\.\d+),([-+]?\d+\.\d+)/);
            if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

            const standardMatch = text.match(/([-+]?\d+\.\d+),\s*([-+]?\d+\.\d+)/);
            if (standardMatch) return { lat: parseFloat(standardMatch[1]), lng: parseFloat(standardMatch[2]) };
        } catch (e) {
            return null;
        }
        return null;
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setInputString(val);
        const detected = parseCoordinates(val);
        if (detected) {
            setCoords(detected);
            setIsConfigLoaded(true);
            toast.success("Koordinat ditemukan dari link!");
        }
    };

    const handleAddPoint = (latlng) => {
        const newPoint = { lat: latlng.lat, lng: latlng.lng };
        setPolygonPoints([...polygonPoints, newPoint]);
    };

    const handleUndoPoint = () => {
        setPolygonPoints(polygonPoints.slice(0, -1));
    };

    const handleResetPolygon = () => {
        if (window.confirm("Hapus semua titik area tanah?")) {
            setPolygonPoints([]);
        }
    };

    const handleSave = async () => {
        if (!isConfigLoaded || !coords.lat || !coords.lng) {
            return toast.error("Koordinat belum valid!");
        }

        if (polygonPoints.length < 3) {
            return toast.error("Area tanah minimal harus memiliki 3 titik sudut!");
        }

        setSaving(true);
        try {
            await setDoc(doc(db, "settings", "location"), {
                latitude: parseFloat(coords.lat),
                longitude: parseFloat(coords.lng),
                polygon: polygonPoints,
                updatedAt: new Date()
            });
            toast.success("✅ Lokasi & Area Tanah Berhasil Disimpan!");
            setDrawMode(false);
        } catch (error) {
            console.error(error);
            toast.error("Gagal menyimpan: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-orange-600" /></div>;

    return (
        <div className="max-w-7xl mx-auto pb-20 p-4">
            <h1 className="text-3xl font-black text-gray-800 mb-8 flex items-center gap-3">
                <Settings className="text-orange-600" size={32} /> Pengaturan Lokasi
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-700">
                            <MapPin size={20} className="text-orange-500" /> Titik Pusat & Area
                        </h2>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Google Maps Link / Koordinat</label>
                                <textarea
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-0 outline-none font-mono text-sm h-28 resize-none transition"
                                    placeholder="Paste link Google Maps di sini..."
                                    value={inputString}
                                    onChange={handleInputChange}
                                />
                                <p className="text-xs text-gray-400 mt-2 flex gap-1">
                                    <Info size={12} /> Paste link untuk memusatkan peta.
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

                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                                <p className="font-bold mb-1">Mode Tracking Area</p>
                                <p>Hanya pengguna yang berada DI DALAM garis biru (area tanah) yang dapat melakukan pemesanan.</p>
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
                                {saving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> SIMPAN AREA</>}
                            </button>

                            {!isConfigLoaded && (
                                <div className="bg-red-50 p-3 rounded-lg border border-red-100 flex gap-2 items-center text-xs text-red-600 font-medium">
                                    <AlertTriangle size={14} /> Masukkan link Google Maps yang valid.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8 h-[600px] bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-800 relative z-0 group">
                    {coords.lat && coords.lng ? (
                        <MapContainer
                            center={[coords.lat, coords.lng]}
                            zoom={20}
                            maxZoom={22}
                            scrollWheelZoom={true}
                            style={{ height: "100%", width: "100%" }}
                        >
                            <TileLayer
                                url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                                attribution='&copy; Google Maps'
                                maxZoom={22}
                            />

                            <RecenterMap lat={coords.lat} lng={coords.lng} />
                            <MapClickHandler isDrawing={drawMode} onMapClick={handleAddPoint} />

                            <CircleMarker
                                center={[coords.lat, coords.lng]}
                                radius={6}
                                pathOptions={{ color: 'white', fillColor: '#ef4444', fillOpacity: 1, weight: 3 }}
                            />

                            {polygonPoints.length > 0 && (
                                <>
                                    <Polygon
                                        positions={polygonPoints}
                                        pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.4, weight: 3 }}
                                    />
                                    {polygonPoints.map((pos, idx) => (
                                        <CircleMarker
                                            key={idx}
                                            center={pos}
                                            radius={3}
                                            pathOptions={{ color: 'white', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }}
                                        />
                                    ))}
                                </>
                            )}
                        </MapContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">Peta akan muncul setelah koordinat diisi</div>
                    )}

                    <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2">
                        <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg border border-gray-200 text-xs font-bold text-slate-700 flex items-center gap-2">
                            <Navigation size={14} className="text-blue-600" /> Mode Satelit HD
                        </div>
                    </div>

                    <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2 items-end">
                        {!drawMode ? (
                            <button
                                onClick={() => setDrawMode(true)}
                                className="bg-white hover:bg-gray-50 text-slate-800 px-4 py-2 rounded-lg shadow-lg border border-gray-200 text-sm font-bold flex items-center gap-2 transition"
                            >
                                <PenTool size={16} className="text-orange-600" /> Gambar Area Tanah
                            </button>
                        ) : (
                            <div className="bg-white p-2 rounded-xl shadow-xl border border-gray-200 flex flex-col gap-2 animate-in fade-in zoom-in duration-200">
                                <div className="px-2 py-1 text-xs font-bold text-center text-slate-500 border-b border-gray-100 pb-2">
                                    Mode Pen Tool Aktif
                                </div>
                                <button
                                    onClick={handleUndoPoint}
                                    disabled={polygonPoints.length === 0}
                                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-slate-700 disabled:opacity-50"
                                >
                                    <Undo size={14} /> Undo Titik
                                </button>
                                <button
                                    onClick={handleResetPolygon}
                                    disabled={polygonPoints.length === 0}
                                    className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-bold text-red-600 disabled:opacity-50"
                                >
                                    <Trash2 size={14} /> Reset Shape
                                </button>
                                <button
                                    onClick={() => setDrawMode(false)}
                                    className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-xs font-bold text-white justify-center shadow-md"
                                >
                                    <Check size={14} /> Selesai Gambar
                                </button>
                            </div>
                        )}
                    </div>

                    {drawMode && (
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[400] bg-black/80 text-white px-4 py-2 rounded-full text-xs font-bold backdrop-blur-sm pointer-events-none">
                            Klik peta untuk buat batas tanah
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;