import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { ShoppingCart, LogOut, History, Plus, Minus, QrCode, ScanLine, Smartphone } from 'lucide-react';

const UserMenu = () => {
    const { currentUser, logout } = useAuth();
    const { cart, addToCart, decreaseQty, getCartCount, getCartTotal } = useCart();
    const [products, setProducts] = useState([]);
    const [categoryFilter, setCategoryFilter] = useState('Semua');
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const urlTable = searchParams.get('table');
    const savedTable = localStorage.getItem('activeTable');

    const activeTable = urlTable || savedTable;
    const displayTable = activeTable ? activeTable.toString().replace(/Meja\s*/i, "").replace(/No\.?\s*/i, "").trim() : "";

    useEffect(() => {
        if (urlTable) {
            localStorage.setItem('activeTable', urlTable);
        }
    }, [urlTable]);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "products"), (snapshot) => {
            let list = [];
            snapshot.docs.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
            setProducts(list);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const uniqueCategories = ['Semua', ...new Set(products.map(item => item.category))].filter(Boolean).sort();

    const filteredProducts = products.filter(item =>
        categoryFilter === 'Semua' ? true : item.category === categoryFilter
    );

    const handleLogout = async () => {
        await logout();
    };

    if (!activeTable) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center relative overflow-hidden font-sans">
                <div className="absolute top-[-20%] left-[-20%] w-96 h-96 bg-orange-300 rounded-full blur-[100px] opacity-30 animate-pulse"></div>
                <div className="absolute bottom-[-20%] right-[-20%] w-96 h-96 bg-red-300 rounded-full blur-[100px] opacity-30 animate-pulse"></div>

                <div className="bg-white/80 backdrop-blur-xl border border-white shadow-2xl p-8 rounded-3xl max-w-sm w-full relative z-10">
                    <div className="w-20 h-20 bg-gradient-to-tr from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-200">
                        <QrCode className="text-white w-10 h-10" />
                    </div>

                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Scan QR Meja</h1>
                    <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                        Anda belum terhubung ke meja. Silakan scan <b>QR Code</b> yang berada di meja untuk melihat menu dan memesan.
                    </p>

                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="bg-white p-2 rounded-full border border-gray-200 shadow-sm">
                                <Smartphone className="text-orange-500 w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <p className="text-gray-800 text-xs font-bold">Langkah 1</p>
                                <p className="text-gray-400 text-[10px]">Buka Kamera / App QR Scanner</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="bg-white p-2 rounded-full border border-gray-200 shadow-sm">
                                <ScanLine className="text-orange-500 w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <p className="text-gray-800 text-xs font-bold">Langkah 2</p>
                                <p className="text-gray-400 text-[10px]">Arahkan ke QR Code di Meja</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans flex flex-col relative">
            <header className="bg-white sticky top-0 z-20 shadow-sm border-b px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center overflow-hidden border border-orange-100">
                        <img src="/assets/logo.png" alt="Logo" className="w-8 h-8 object-contain" onError={(e) => e.target.src = 'https://cdn-icons-png.flaticon.com/512/3448/3448609.png'} />
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-800 leading-tight text-sm">Taki Coffee & Eatery</h1>
                        <p className="text-xs text-gray-500">Meja {displayTable} • {currentUser?.displayName?.split(' ')[0] || 'Guest'}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => navigate('/history')} className="bg-gray-50 p-2 rounded-full text-gray-600 hover:bg-orange-100 hover:text-orange-600 transition border border-gray-100">
                        <History size={20} />
                    </button>
                    <button onClick={handleLogout} className="bg-gray-50 p-2 rounded-full text-red-400 hover:bg-red-50 hover:text-red-600 transition border border-gray-100">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main className="flex-1">
                <div className="p-4">
                    <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-2xl font-bold mb-1">Lapar Banget?</h2>
                            <p className="text-orange-100 text-sm opacity-90">Pesan sekarang, langsung kami antar!</p>
                        </div>
                        <div className="absolute right-[-20px] bottom-[-20px] opacity-20 bg-white rounded-full w-32 h-32 blur-xl"></div>
                    </div>
                </div>

                <div className="px-4 mb-4 overflow-x-auto no-scrollbar">
                    <div className="flex gap-2">
                        {uniqueCategories.map(cat => (
                            <button key={cat} onClick={() => setCategoryFilter(cat)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all shadow-sm ${categoryFilter === cat ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600 border border-gray-200'}`}>
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {loading ? <p className="col-span-2 text-center text-gray-400 py-10">Memuat menu...</p> :
                        filteredProducts.length === 0 ? (
                            <div className="col-span-full text-center py-10 text-gray-400">
                                <p>Tidak ada produk di kategori ini</p>
                            </div>
                        ) : (
                            filteredProducts.map(item => (
                                <div key={item.id} className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col h-full border border-gray-100">
                                    <div className="h-36 bg-gray-100 relative group">
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" onError={(e) => e.target.src = 'https://via.placeholder.com/150'} />
                                        {item.stock <= 0 && <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm"><span className="text-white text-xs font-bold border border-white px-2 py-1 rounded">HABIS</span></div>}
                                    </div>

                                    <div className="p-3 flex flex-col flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider border px-1 rounded">{item.category}</span>
                                            <span className="text-[10px] text-gray-400">Stok: {item.stock}</span>
                                        </div>
                                        <h3 className="font-bold text-gray-800 text-sm mb-1 line-clamp-2 leading-tight">{item.name}</h3>
                                        <p className="text-orange-600 font-bold mt-auto">Rp {item.price.toLocaleString()}</p>

                                        <div className="mt-3">
                                            {item.stock <= 0 ? (
                                                <button disabled className="w-full py-2 rounded-lg text-sm font-bold bg-gray-200 text-gray-500 cursor-not-allowed">Habis</button>
                                            ) : (
                                                cart[item.id] ? (
                                                    <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-1">
                                                        <button onClick={() => decreaseQty(item.id)} className="p-1 bg-white rounded shadow-sm text-gray-600 hover:text-red-500"><Minus size={14} /></button>
                                                        <span className="font-bold text-sm w-6 text-center">{cart[item.id].qty}</span>
                                                        <button disabled={cart[item.id].qty >= item.stock} onClick={() => addToCart(item)} className={`p-1 bg-white rounded shadow-sm ${cart[item.id].qty >= item.stock ? 'text-gray-300' : 'text-green-600 hover:text-green-700'}`}><Plus size={14} /></button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => addToCart(item)} className="w-full py-2 rounded-lg text-sm font-bold bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white transition-colors">
                                                        Tambah
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                </div>
            </main>

            <footer className={`py-4 bg-gray-50 text-center ${getCartCount() > 0 ? 'pb-28' : 'pb-6'}`}>
                <p className="text-[10px] text-gray-400 font-medium tracking-widest uppercase">Created By <span className="text-orange-600 font-bold">Futura Link</span></p>
            </footer>

            {getCartCount() > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 z-30">
                    <button onClick={() => navigate('/cart')} className="w-full bg-slate-900 text-white rounded-2xl shadow-2xl p-4 flex justify-between items-center hover:bg-slate-800 transition transform active:scale-95 border border-white/10">
                        <div className="flex flex-col text-left">
                            <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Cek Keranjang</span>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-xl tracking-tighter">Rp {getCartTotal().toLocaleString()}</span>
                                <span className="bg-orange-600 text-[10px] px-2 py-0.5 rounded-full text-white font-black">{getCartCount()} ITEM</span>
                            </div>
                        </div>
                        <div className="bg-white/10 p-2 rounded-xl text-white">
                            <ShoppingCart size={24} />
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};

export default UserMenu;