import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Coffee, FileBarChart, User, LogOut, ShieldCheck, ClipboardList, History, QrCode } from 'lucide-react';

const AdminLayout = () => {
    const { userRole, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/staff-login');
    };

    const isActive = (path) => location.pathname === path ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800 hover:text-white';

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-20">
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <div className="bg-orange-600 p-2 rounded-lg">
                        <ShieldCheck size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">POS ADMIN</h1>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">{userRole} ACCESS</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 mt-4 overflow-y-auto">
                    <Link to="/admin" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${isActive('/admin')}`}>
                        <LayoutDashboard size={20} /> Dashboard
                    </Link>

                    <Link to="/admin/live-orders" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${isActive('/admin/live-orders')}`}>
                        <ClipboardList size={20} /> Pesanan Masuk
                    </Link>

                    <Link to="/admin/history" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${isActive('/admin/history')}`}>
                        <History size={20} /> Riwayat Transaksi
                    </Link>

                    {/* MENU BARU */}
                    <Link to="/admin/tables" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${isActive('/admin/tables')}`}>
                        <QrCode size={20} /> Manajemen Meja
                    </Link>

                    <Link to="/admin/products" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${isActive('/admin/products')}`}>
                        <Coffee size={20} /> Produk & Menu
                    </Link>

                    <Link to="/admin/reports" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${isActive('/admin/reports')}`}>
                        <FileBarChart size={20} /> Laporan Keuangan
                    </Link>

                    <div className="pt-4 mt-4 border-t border-slate-800">
                        <Link to="/profile" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${isActive('/profile')}`}>
                            <User size={20} /> Akun Saya
                        </Link>
                    </div>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button onClick={handleLogout} className="flex items-center gap-3 text-red-400 hover:bg-red-500/10 hover:text-red-500 px-4 py-3 w-full rounded-xl transition font-medium">
                        <LogOut size={20} /> Keluar Sistem
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto bg-gray-50 relative">
                <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b px-8 py-4 flex justify-between items-center">
                    <h2 className="font-bold text-gray-800 text-lg">Panel Kontrol {userRole === 'admin' ? 'Administrator' : 'Kepala Toko'}</h2>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-bold text-gray-700">Staff Active</p>
                            <p className="text-xs text-gray-500 capitalize">{userRole}</p>
                        </div>
                        <div className="h-10 w-10 bg-gradient-to-tr from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                            {userRole[0].toUpperCase()}
                        </div>
                    </div>
                </header>
                <div className="p-8 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout; 