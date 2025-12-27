import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { Plus, Trash2, Edit2, X, Search, Upload, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminProducts = () => {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('Semua');
    const [previewUrl, setPreviewUrl] = useState(null);

    const [formProduct, setFormProduct] = useState({
        name: '', price: '', stock: '', category: 'Makanan Berat', image: ''
    });

    const categories = ['Semua', 'Makanan Berat', 'Makanan Ringan', 'Coffee', 'Non-Coffee'];

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "products"), (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProducts(list);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        let result = products;
        if (activeCategory !== 'Semua') {
            result = result.filter(item => item.category === activeCategory);
        }
        if (searchTerm) {
            result = result.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        setFilteredProducts(result);
    }, [products, searchTerm, activeCategory]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 1024 * 1024) {
                toast.error("Ukuran file terlalu besar (Maks 1MB)");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormProduct({ ...formProduct, image: reader.result });
                setPreviewUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formProduct.image) return toast.error("Mohon upload foto menu");

        try {
            const data = {
                ...formProduct,
                price: Number(formProduct.price),
                stock: Number(formProduct.stock)
            };

            if (isEditing && editId) {
                await updateDoc(doc(db, "products", editId), data);
                toast.success("Menu Berhasil Diupdate!");
            } else {
                await addDoc(collection(db, "products"), data);
                toast.success("Menu Berhasil Ditambahkan!");
            }
            closeModal();
        } catch (error) {
            toast.error("Gagal menyimpan menu");
        }
    };

    const handleEdit = (product) => {
        setFormProduct({
            name: product.name,
            price: product.price,
            stock: product.stock,
            category: product.category,
            image: product.image
        });
        setPreviewUrl(product.image);
        setEditId(product.id);
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Hapus menu ini permanen?")) {
            await deleteDoc(doc(db, "products", id));
            toast.success("Menu dihapus");
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setIsEditing(false);
        setEditId(null);
        setPreviewUrl(null);
        setFormProduct({ name: '', price: '', stock: '', category: 'Makanan Berat', image: '' });
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Daftar Produk</h1>
                <button onClick={() => setShowModal(true)} className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-orange-700 shadow-lg text-sm md:text-base w-full md:w-auto justify-center">
                    <Plus size={20} /> Tambah Menu Baru
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border mb-6 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeCategory === cat ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Cari nama menu..."
                        className="w-full pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="hidden md:block bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 text-gray-600 text-sm uppercase">
                        <tr>
                            <th className="p-4">Produk</th>
                            <th className="p-4">Kategori</th>
                            <th className="p-4">Harga</th>
                            <th className="p-4">Stok</th>
                            <th className="p-4 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredProducts.length === 0 ? (
                            <tr><td colSpan="5" className="p-8 text-center text-gray-400">Tidak ada produk ditemukan.</td></tr>
                        ) : (
                            filteredProducts.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="p-4 flex items-center gap-3">
                                        <img src={item.image} alt="" className="w-10 h-10 rounded object-cover bg-gray-200" onError={(e) => e.target.src = 'https://via.placeholder.com/150'} />
                                        <span className="font-bold text-gray-700">{item.name}</span>
                                    </td>
                                    <td className="p-4"><span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold">{item.category}</span></td>
                                    <td className="p-4">Rp {item.price.toLocaleString()}</td>
                                    <td className="p-4">
                                        <span className={`font-bold ${item.stock <= 5 ? 'text-red-600' : 'text-green-600'}`}>{item.stock}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleEdit(item)} className="text-blue-500 hover:bg-blue-50 p-2 rounded transition">
                                                <Edit2 size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:bg-red-50 p-2 rounded transition">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="md:hidden grid gap-4">
                {filteredProducts.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-4">
                        <img src={item.image} alt="" className="w-16 h-16 rounded-lg object-cover bg-gray-100 flex-shrink-0" onError={(e) => e.target.src = 'https://via.placeholder.com/150'} />
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-800 truncate">{item.name}</h3>
                            <p className="text-xs text-gray-500 mb-1">{item.category}</p>
                            <div className="flex justify-between items-center">
                                <span className="text-orange-600 font-bold">Rp {item.price.toLocaleString()}</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${item.stock <= 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>Stok: {item.stock}</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => handleEdit(item)} className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100"><Edit2 size={16} /></button>
                            <button onClick={() => handleDelete(item.id)} className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100"><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{isEditing ? 'Edit Menu' : 'Tambah Menu'}</h2>
                            <button onClick={closeModal}><X /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="flex flex-col items-center justify-center">
                                <div className="relative w-full h-40 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden">
                                    {previewUrl ? (
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                                    ) : (
                                        <label className="flex flex-col items-center cursor-pointer">
                                            <Upload className="text-gray-400 mb-2" size={32} />
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Klik Upload Foto</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                        </label>
                                    )}
                                    {previewUrl && (
                                        <label className="absolute bottom-2 right-2 bg-orange-600 text-white p-2 rounded-full cursor-pointer shadow-lg">
                                            <Edit2 size={14} />
                                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Nama Menu</label>
                                <input required type="text" placeholder="Nama Menu" className="w-full border p-3 rounded-xl outline-none focus:border-orange-500" value={formProduct.name} onChange={e => setFormProduct({ ...formProduct, name: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Harga</label>
                                    <input required type="number" placeholder="Harga" className="w-full border p-3 rounded-xl outline-none focus:border-orange-500" value={formProduct.price} onChange={e => setFormProduct({ ...formProduct, price: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Stok</label>
                                    <input required type="number" placeholder="Stok" className="w-full border p-3 rounded-xl outline-none focus:border-orange-500" value={formProduct.stock} onChange={e => setFormProduct({ ...formProduct, stock: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Kategori</label>
                                <select className="w-full border p-3 rounded-xl outline-none focus:border-orange-500 bg-white" value={formProduct.category} onChange={e => setFormProduct({ ...formProduct, category: e.target.value })}>
                                    <option value="Makanan Berat">Makanan Berat</option>
                                    <option value="Makanan Ringan">Makanan Ringan</option>
                                    <option value="Coffee">Coffee</option>
                                    <option value="Non-Coffee">Non-Coffee</option>
                                </select>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={closeModal} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition">Batal</button>
                                <button type="submit" className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 shadow-lg transition">{isEditing ? 'Update Menu' : 'Simpan Menu'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminProducts;