import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { ShoppingCart, LogOut, History, Plus, Minus } from 'lucide-react';

const UserMenu = () => {
    const { currentUser, logout } = useAuth();
    const { cart, addToCart, decreaseQty, getCartCount, getCartTotal } = useCart();
    const [products, setProducts] = useState([]);
    const [categoryFilter, setCategoryFilter] = useState('Semua');
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const tableNumber = searchParams.get('table') || 1;

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "products"), (snapshot) => {
            let list = [];
            snapshot.docs.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
            setProducts(list);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const filteredProducts = products.filter(item =>
        categoryFilter === 'Semua' ? true : item.category === categoryFilter
    );

    const categories = ['Semua', 'Makanan', 'Minuman', 'Dimsum'];

    return (
        <div className="min-h-screen bg-gray-50 font-sans flex flex-col relative">

            {/* HEADER */}
            <header className="bg-white sticky top-0 z-20 shadow-sm border-b px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center overflow-hidden border border-orange-100">
                        <img src="https://cdn-icons-png.flaticon.com/512/3448/3448609.png" alt="Logo" className="w-8 h-8 object-contain" />
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-800 leading-tight text-sm">Cafe Futura</h1>
                        <p className="text-xs text-gray-500">Meja No. {tableNumber}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => navigate('/history')} className="bg-gray-50 p-2 rounded-full text-gray-600 hover:bg-orange-100 hover:text-orange-600 transition border border-gray-100">
                        <History size={20} />
                    </button>
                    <button onClick={logout} className="bg-gray-50 p-2 rounded-full text-red-400 hover:bg-red-50 hover:text-red-600 transition border border-gray-100">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* BANNER */}
            <div className="p-4">
                <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold mb-1">Lapar Banget?</h2>
                        <p className="text-orange-100 text-sm opacity-90">Pesan sekarang, langsung kami antar!</p>
                    </div>
                    <div className="absolute right-[-20px] bottom-[-20px] opacity-20 bg-white rounded-full w-32 h-32 blur-xl"></div>
                </div>
            </div>

            {/* KATEGORI */}
            <div className="px-4 mb-4 overflow-x-auto no-scrollbar">
                <div className="flex gap-2">
                    {categories.map(cat => (
                        <button key={cat} onClick={() => setCategoryFilter(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all shadow-sm ${categoryFilter === cat ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600 border border-gray-200'}`}>
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* PRODUK GRID */}
            <div className="px-4 pb-32 grid grid-cols-2 md:grid-cols-4 gap-4">
                {loading ? <p className="col-span-2 text-center text-gray-400 py-10">Memuat menu...</p> :
                    filteredProducts.map(item => (
                        <div key={item.id} className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col h-full border border-gray-100">
                            <div className="h-36 bg-gray-100 relative group">
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" onError={(e) => e.target.src = 'https://via.placeholder.com/150'} />
                                {item.stock <= 0 && <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm"><span className="text-white text-xs font-bold border border-white px-2 py-1 rounded">HABIS</span></div>}
                            </div>

                            <div className="p-3 flex flex-col flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider border px-1 rounded">{item.category}</span>
                                </div>
                                <h3 className="font-bold text-gray-800 text-sm mb-1 line-clamp-2 leading-tight">{item.name}</h3>
                                <p className="text-orange-600 font-bold mt-auto">Rp {item.price.toLocaleString()}</p>

                                <div className="mt-3">
                                    {cart[item.id] ? (
                                        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-1">
                                            <button onClick={() => decreaseQty(item.id)} className="p-1 bg-white rounded shadow-sm text-gray-600 hover:text-red-500"><Minus size={14} /></button>
                                            <span className="font-bold text-sm w-6 text-center">{cart[item.id].qty}</span>
                                            <button onClick={() => addToCart(item)} className="p-1 bg-white rounded shadow-sm text-green-600 hover:text-green-700"><Plus size={14} /></button>
                                        </div>
                                    ) : (
                                        <button disabled={item.stock <= 0} onClick={() => addToCart(item)} className={`w-full py-2 rounded-lg text-sm font-bold transition-colors ${item.stock > 0 ? 'bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                                            {item.stock > 0 ? 'Tambah' : 'Habis'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
            </div>

            {/* FOOTER FIXED Z-INDEX RENDAH (Di Belakang Cart) */}
            <footer className="fixed bottom-0 left-0 right-0 py-4 bg-gray-100 text-center z-0">
                <p className="text-[10px] text-gray-400 font-medium">Created By <span className="text-orange-600 font-bold">Futura Link</span></p>
                {/* Spacer untuk Cart */}
                <div className="h-16"></div>
            </footer>

            {/* FLOATING CART (Z-INDEX TINGGI) */}
            {getCartCount() > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 z-30 bg-gradient-to-t from-white via-white to-transparent">
                    <button onClick={() => navigate('/cart')} className="w-full bg-slate-900 text-white rounded-2xl shadow-2xl p-4 flex justify-between items-center hover:bg-slate-800 transition transform active:scale-95">
                        <div className="flex flex-col text-left">
                            <span className="text-xs text-gray-400">Total Pesanan</span>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-xl">Rp {getCartTotal().toLocaleString()}</span>
                                <span className="bg-gray-700 text-[10px] px-2 py-0.5 rounded-full text-gray-300">{getCartCount()} Item</span>
                            </div>
                        </div>
                        <div className="bg-orange-600 p-2 rounded-xl text-white shadow-lg shadow-orange-900/20">
                            <ShoppingCart size={24} />
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};

export default UserMenu;