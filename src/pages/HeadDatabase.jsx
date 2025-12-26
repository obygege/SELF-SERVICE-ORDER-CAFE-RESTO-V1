import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Database, Download, Table, Package, Users, Search, Loader2, Trash2, Edit, X, Check, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

const HeadDatabase = () => {
    const [activeTab, setActiveTab] = useState('users');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editModal, setEditModal] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const collections = [
        { id: 'users', label: 'Data Pengguna', icon: <Users size={18} /> },
        { id: 'orders', label: 'Data Transaksi', icon: <Table size={18} /> },
        { id: 'products', label: 'Data Produk', icon: <Package size={18} /> },
    ];

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const q = activeTab === 'orders'
                ? query(collection(db, activeTab), orderBy("createdAt", "desc"))
                : query(collection(db, activeTab));

            const snapshot = await getDocs(q);
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setData(list);
        } catch (error) {
            console.error(error);
            toast.error("Gagal memuat data");
        } finally {
            setLoading(false);
        }
    };

    const formatTimestamp = (ts) => {
        if (!ts) return '-';
        if (ts.seconds) {
            return new Date(ts.seconds * 1000).toLocaleString('id-ID');
        }
        return String(ts);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsUpdating(true);
        try {
            const docRef = doc(db, activeTab, editModal.id);
            const updatedFields = { ...editModal };
            delete updatedFields.id;

            await updateDoc(docRef, updatedFields);

            setData(data.map(item => item.id === editModal.id ? editModal : item));
            toast.success("Data berhasil diperbarui");
            setEditModal(null);
        } catch (error) {
            console.error(error);
            toast.error("Gagal memperbarui data");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Hapus data ini secara permanen?")) {
            try {
                await deleteDoc(doc(db, activeTab, id));
                setData(data.filter(item => item.id !== id));
                toast.success("Data berhasil dihapus");
            } catch (error) {
                toast.error("Gagal menghapus");
            }
        }
    };

    const exportToExcel = () => {
        if (data.length === 0) return toast.error("Tidak ada data untuk diekspor");
        const processedData = data.map(item => {
            const newItem = { ...item };
            if (newItem.createdAt) newItem.createdAt = formatTimestamp(newItem.createdAt);
            if (newItem.lastLogin) newItem.lastLogin = formatTimestamp(newItem.lastLogin);
            if (newItem.items) newItem.items = newItem.items.map(i => `${i.qty}x ${i.name}`).join(', ');
            delete newItem.proofImage;
            delete newItem.uid;
            return newItem;
        });
        const ws = XLSX.utils.json_to_sheet(processedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, activeTab.toUpperCase());
        XLSX.writeFile(wb, `Database_${activeTab}_${new Date().getTime()}.xlsx`);
    };

    const filteredData = data.filter(item =>
        Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                            <Database className="text-blue-600" size={32} /> DATABASE TOKO
                        </h1>
                        <p className="text-gray-500 text-sm">Kelola dan edit data sistem secara langsung.</p>
                    </div>
                    <button onClick={exportToExcel} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition shadow-lg">
                        <Download size={20} /> Export Excel
                    </button>
                </div>

                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                    {collections.map((tab) => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-gray-400 border hover:bg-gray-50'}`}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                <div className="bg-white p-4 rounded-3xl shadow-sm border mb-6 flex items-center gap-4">
                    <Search className="text-gray-300" />
                    <input type="text" placeholder={`Cari di ${activeTab}...`} className="w-full outline-none font-semibold text-slate-700" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>

                <div className="bg-white rounded-[2rem] shadow-sm border overflow-hidden">
                    <div className="overflow-x-auto max-h-[60vh]">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                                <Loader2 className="animate-spin mb-4 text-blue-500" size={48} />
                                <p className="font-bold">Syncing Database...</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-100 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase">Informasi</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase">Detail Tambahan</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredData.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800">{item.name || item.orderId || item.id}</div>
                                                <div className="text-xs text-gray-400 truncate max-w-xs">{item.email || item.category || `Meja: ${item.tableNumber}`}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-600">
                                                    {activeTab === 'users' && (item.role || 'user')}
                                                    {activeTab === 'products' && `Rp ${item.price?.toLocaleString()}`}
                                                    {activeTab === 'orders' && `Rp ${item.total?.toLocaleString()} - ${item.status}`}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button onClick={() => setEditModal(item)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"><Edit size={16} /></button>
                                                    <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {editModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <form onSubmit={handleUpdate} className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                            <h3 className="font-black uppercase tracking-tight">Edit Data {activeTab}</h3>
                            <button type="button" onClick={() => setEditModal(null)}><X size={24} /></button>
                        </div>
                        <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto">
                            {Object.keys(editModal).filter(key => !['id', 'createdAt', 'lastLogin', 'proofImage', 'items', 'uid'].includes(key)).map(key => (
                                <div key={key}>
                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">{key}</label>
                                    <input
                                        type={typeof editModal[key] === 'number' ? 'number' : 'text'}
                                        className="w-full bg-gray-50 border rounded-xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500 transition"
                                        value={editModal[key]}
                                        onChange={(e) => setEditModal({ ...editModal, [key]: e.target.type === 'number' ? Number(e.target.value) : e.target.value })}
                                    />
                                </div>
                            ))}
                            <div className="bg-blue-50 p-4 rounded-2xl flex gap-3 text-blue-600">
                                <AlertCircle size={20} className="shrink-0" />
                                <p className="text-[10px] font-medium leading-relaxed">Berhati-hatilah saat mengedit data mentah. Perubahan akan langsung berdampak pada sistem operasional.</p>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 border-t flex gap-3">
                            <button type="button" onClick={() => setEditModal(null)} className="flex-1 py-4 font-bold text-gray-500 hover:bg-gray-100 rounded-2xl transition">Batal</button>
                            <button type="submit" disabled={isUpdating} className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700 transition flex justify-center items-center gap-2">
                                {isUpdating ? <Loader2 className="animate-spin" size={20} /> : <><Check size={20} /> Simpan Perubahan</>}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default HeadDatabase;