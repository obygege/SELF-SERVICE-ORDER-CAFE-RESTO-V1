import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { Plus, Trash2, Edit2, X, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminProducts = () => {
    const [products, setProducts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    const [formProduct, setFormProduct] = useState({
        name: '', price: '', stock: '', category: 'Makanan', image: ''
    });

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "products"), (snapshot) => {
            setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
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
        setFormProduct({ name: '', price: '', stock: '', category: 'Makanan', image: '' });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Manajemen Produk</h1>
                <button onClick={() => setShowModal(true)} className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-orange-700 shadow-lg text-sm md:text-base">
                    <Plus size={20} /> <span className="hidden md:inline">Tambah Menu Baru</span><span className="md:hidden">Baru</span>
                </button>
            </div>

            {/* --- TABLE VIEW (DESKTOP) --- */}
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
                        {products.map(item => (
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
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- CARD VIEW (MOBILE) --- */}
            <div className="md:hidden grid gap-4">
                {products.map(item => (
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
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{isEditing ? 'Edit Menu' : 'Tambah Menu'}</h2>
                            <button onClick={closeModal}><X /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-3">
                            <input required type="text" placeholder="Nama Menu" className="w-full border p-2 rounded" value={formProduct.name} onChange={e => setFormProduct({ ...formProduct, name: e.target.value })} />
                            <div className="grid grid-cols-2 gap-3">
                                <input required type="number" placeholder="Harga" className="w-full border p-2 rounded" value={formProduct.price} onChange={e => setFormProduct({ ...formProduct, price: e.target.value })} />
                                <input required type="number" placeholder="Stok" className="w-full border p-2 rounded" value={formProduct.stock} onChange={e => setFormProduct({ ...formProduct, stock: e.target.value })} />
                            </div>
                            <select className="w-full border p-2 rounded" value={formProduct.category} onChange={e => setFormProduct({ ...formProduct, category: e.target.value })}>
                                <option value="Makanan">Makanan</option>
                                <option value="Minuman">Minuman</option>
                                <option value="Dimsum">Dimsum</option>
                            </select>
                            <input required type="url" placeholder="URL Gambar" className="w-full border p-2 rounded" value={formProduct.image} onChange={e => setFormProduct({ ...formProduct, image: e.target.value })} />

                            <div className="flex gap-2 mt-4">
                                <button type="button" onClick={closeModal} className="flex-1 bg-gray-200 py-2 rounded font-bold">Batal</button>
                                <button type="submit" className="flex-1 bg-orange-600 text-white py-2 rounded font-bold">{isEditing ? 'Update' : 'Simpan'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminProducts;