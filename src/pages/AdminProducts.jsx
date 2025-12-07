import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Plus, Trash2, Image as ImageIcon, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminProducts = () => {
    const [products, setProducts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newProduct, setNewProduct] = useState({
        name: '', price: '', stock: '', category: 'Makanan', image: ''
    });

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "products"), (snapshot) => {
            setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "products"), {
                ...newProduct,
                price: Number(newProduct.price),
                stock: Number(newProduct.stock)
            });
            toast.success("Menu Berhasil Ditambahkan!");
            setShowModal(false);
            setNewProduct({ name: '', price: '', stock: '', category: 'Makanan', image: '' });
        } catch (error) {
            toast.error("Gagal simpan menu");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Hapus menu ini permanen?")) {
            await deleteDoc(doc(db, "products", id));
            toast.success("Menu dihapus");
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Manajemen Produk</h1>
                <button onClick={() => setShowModal(true)} className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-orange-700 shadow-lg">
                    <Plus size={20} /> Tambah Menu Baru
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
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
                                    <img src={item.image} alt="" className="w-10 h-10 rounded object-cover bg-gray-200" />
                                    <span className="font-bold text-gray-700">{item.name}</span>
                                </td>
                                <td className="p-4"><span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold">{item.category}</span></td>
                                <td className="p-4">Rp {item.price.toLocaleString()}</td>
                                <td className="p-4">{item.stock}</td>
                                <td className="p-4 text-center">
                                    <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:bg-red-50 p-2 rounded transition">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold mb-4">Tambah Menu</h2>
                        <form onSubmit={handleAdd} className="space-y-3">
                            <input required type="text" placeholder="Nama Menu" className="w-full border p-2 rounded" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
                            <div className="grid grid-cols-2 gap-3">
                                <input required type="number" placeholder="Harga" className="w-full border p-2 rounded" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} />
                                <input required type="number" placeholder="Stok" className="w-full border p-2 rounded" value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })} />
                            </div>
                            <select className="w-full border p-2 rounded" value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}>
                                <option value="Makanan">Makanan</option>
                                <option value="Minuman">Minuman</option>
                                <option value="Dimsum">Dimsum</option>
                            </select>
                            <input required type="url" placeholder="URL Gambar" className="w-full border p-2 rounded" value={newProduct.image} onChange={e => setNewProduct({ ...newProduct, image: e.target.value })} />

                            <div className="flex gap-2 mt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 py-2 rounded font-bold">Batal</button>
                                <button type="submit" className="flex-1 bg-orange-600 text-white py-2 rounded font-bold">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminProducts;