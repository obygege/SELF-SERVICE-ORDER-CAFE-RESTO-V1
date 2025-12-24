import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import {
    TrendingUp,
    ShoppingBag,
    Users,
    ArrowRight,
    Activity,
    DollarSign,
    ClipboardList,
    Coffee,
    Loader2
} from 'lucide-react';

const AdminHome = () => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        dailyRevenue: 0,
        dailyOrders: 0,
        topItem: '-',
        activeTables: 0
    });

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const ordersRef = collection(db, "orders");

                const todayQuery = query(
                    ordersRef,
                    where("createdAt", ">=", today),
                    orderBy("createdAt", "desc")
                );

                const activeQuery = query(
                    ordersRef,
                    where("status", "in", ["pending", "cooking", "ready"])
                );

                const [todaySnap, activeSnap] = await Promise.all([
                    getDocs(todayQuery),
                    getDocs(activeQuery)
                ]);

                let revenue = 0;
                let orderCount = 0;
                let itemFrequency = {};

                todaySnap.forEach(doc => {
                    const data = doc.data();

                    if (data.status !== 'cancelled') {
                        orderCount++;
                        if (data.paymentStatus === 'paid' || data.status === 'completed') {
                            revenue += (data.total || 0);
                        }
                    }

                    if (data.status !== 'cancelled' && data.items) {
                        data.items.forEach(item => {
                            const itemName = item.name;
                            itemFrequency[itemName] = (itemFrequency[itemName] || 0) + item.qty;
                        });
                    }
                });

                let bestSellingItem = "Belum ada data";
                let maxQty = 0;

                Object.entries(itemFrequency).forEach(([name, qty]) => {
                    if (qty > maxQty) {
                        maxQty = qty;
                        bestSellingItem = name;
                    }
                });

                setStats({
                    dailyRevenue: revenue,
                    dailyOrders: orderCount,
                    topItem: maxQty > 0 ? bestSellingItem : "Belum ada",
                    activeTables: activeSnap.size
                });

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="animate-spin text-orange-600" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-white shadow-2xl">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-orange-500 opacity-20 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-blue-500 opacity-20 blur-3xl"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-bold rounded-full uppercase tracking-wider">
                                Administrator Panel
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
                            Halo, <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-200">{currentUser?.email?.split('@')[0]}</span>
                        </h1>
                        <p className="text-slate-400 max-w-lg">
                            Selamat datang kembali di Cafe Futura. Berikut adalah ringkasan aktivitas toko hari ini.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Link to="/admin/reports" className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white px-5 py-3 rounded-xl font-semibold transition flex items-center gap-2">
                            <TrendingUp size={18} /> Lihat Laporan
                        </Link>
                        <Link to="/admin/live-orders" className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-3 rounded-xl font-semibold shadow-lg shadow-orange-900/20 transition flex items-center gap-2">
                            <Activity size={18} /> Live Orders
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-green-50 rounded-xl group-hover:bg-green-100 transition">
                            <DollarSign className="text-green-600" size={24} />
                        </div>
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">Hari Ini</span>
                    </div>
                    <p className="text-gray-500 text-sm font-medium">Omzet Hari Ini</p>
                    <h3 className="text-2xl font-black text-gray-800 mt-1">Rp {stats.dailyRevenue.toLocaleString('id-ID')}</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition">
                            <ShoppingBag className="text-blue-600" size={24} />
                        </div>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Hari Ini</span>
                    </div>
                    <p className="text-gray-500 text-sm font-medium">Pesanan Masuk</p>
                    <h3 className="text-2xl font-black text-gray-800 mt-1">{stats.dailyOrders} Pesanan</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-orange-50 rounded-xl group-hover:bg-orange-100 transition">
                            <Coffee className="text-orange-600" size={24} />
                        </div>
                        <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">Top Item</span>
                    </div>
                    <p className="text-gray-500 text-sm font-medium">Menu Terlaris (Hari Ini)</p>
                    <h3 className="text-xl font-black text-gray-800 mt-1 truncate" title={stats.topItem}>{stats.topItem}</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition">
                            <Users className="text-purple-600" size={24} />
                        </div>
                        <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">Live</span>
                    </div>
                    <p className="text-gray-500 text-sm font-medium">Pesanan Aktif</p>
                    <h3 className="text-2xl font-black text-gray-800 mt-1">{stats.activeTables} Meja</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <ClipboardList className="text-slate-800" /> Akses Cepat
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link to="/admin/live-orders" className="group flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50 transition cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                                    <Activity size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 group-hover:text-orange-700">Dapur / Kitchen</h4>
                                    <p className="text-sm text-gray-400">Pantau pesanan masuk</p>
                                </div>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-white border flex items-center justify-center text-gray-300 group-hover:text-orange-500 group-hover:border-orange-200 transition">
                                <ArrowRight size={16} />
                            </div>
                        </Link>

                        <Link to="/admin/products" className="group flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                    <Coffee size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 group-hover:text-blue-700">Manajemen Menu</h4>
                                    <p className="text-sm text-gray-400">Update harga & stok</p>
                                </div>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-white border flex items-center justify-center text-gray-300 group-hover:text-blue-500 group-hover:border-blue-200 transition">
                                <ArrowRight size={16} />
                            </div>
                        </Link>

                        <Link to="/admin/reports" className="group flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-green-200 hover:bg-green-50 transition cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center font-bold">
                                    <TrendingUp size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 group-hover:text-green-700">Laporan Keuangan</h4>
                                    <p className="text-sm text-gray-400">Download rekap bulanan</p>
                                </div>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-white border flex items-center justify-center text-gray-300 group-hover:text-green-500 group-hover:border-green-200 transition">
                                <ArrowRight size={16} />
                            </div>
                        </Link>

                        <Link to="/admin/settings" className="group flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-slate-200 hover:bg-slate-50 transition cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 group-hover:text-slate-700">Pengaturan Toko</h4>
                                    <p className="text-sm text-gray-400">Lokasi & Akun</p>
                                </div>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-white border flex items-center justify-center text-gray-300 group-hover:text-slate-500 group-hover:border-slate-200 transition">
                                <ArrowRight size={16} />
                            </div>
                        </Link>
                    </div>
                </div>

                <div className="bg-gradient-to-b from-orange-500 to-red-500 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white opacity-20 blur-2xl"></div>
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div>
                            <h3 className="text-lg font-bold mb-1 opacity-90">Status Sistem</h3>
                            <p className="text-orange-100 text-sm">Semua sistem berjalan normal.</p>
                        </div>

                        <div className="mt-8 space-y-4">
                            <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                                <span className="text-sm font-medium">Koneksi Database</span>
                                <span className="flex h-2 w-2 rounded-full bg-green-400"></span>
                            </div>
                            <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                                <span className="text-sm font-medium">Printer Kasir</span>
                                <span className="flex h-2 w-2 rounded-full bg-green-400"></span>
                            </div>
                            <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                                <span className="text-sm font-medium">Gateway Payment</span>
                                <span className="flex h-2 w-2 rounded-full bg-green-400"></span>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/20 text-center text-xs text-orange-100">
                            Versi Aplikasi v1.0
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminHome;