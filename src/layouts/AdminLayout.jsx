import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Coffee, FileBarChart, User, LogOut, ClipboardList, History, QrCode, Settings, ChefHat } from 'lucide-react';

const AdminLayout = () => {
    const { userRole, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = async () => {
        if (window.confirm("Yakin ingin keluar?")) {
            await logout();
            navigate('/login');
        }
    };

    const isActive = (path) => {
        if (location.pathname === path || location.pathname.startsWith(path + '/')) return 'text-orange-600 font-bold';
        return 'text-gray-400 hover:text-slate-800';
    };

    const desktopActive = (path) => {
        if (location.pathname === path || location.pathname.startsWith(path + '/')) return 'bg-orange-600 text-white shadow-lg';
        return 'text-slate-300 hover:bg-slate-800 hover:text-white';
    }

    const getRoleLabel = () => {
        switch (userRole) {
            case 'head': return 'KEPALA TOKO';
            case 'kitchen': return 'KITCHEN STAFF';
            case 'barista': return 'BARISTA';
            case 'admin': return 'ADMINISTRATOR';
            default: return 'STAFF';
        }
    };

    const getPageTitle = () => {
        switch (userRole) {
            case 'head': return 'Laporan Toko';
            case 'kitchen': return 'Dapur Area';
            case 'barista': return 'Bar Area';
            case 'admin': return 'Control Panel';
            default: return 'Dashboard';
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
            <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col shadow-xl z-20">
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <img
                        src="/assets/logo.png"
                        alt="Logo"
                        className="w-10 h-10 object-contain"
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    />
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">FUTURA LINK</h1>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">{getRoleLabel()}</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 mt-4 overflow-y-auto">
                    {userRole === 'admin' && (
                        <>
                            <Link to="/admin" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${desktopActive('/admin')}`}>
                                <LayoutDashboard size={20} /> Dashboard
                            </Link>
                            <Link to="/admin/live-orders" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${desktopActive('/admin/live-orders')}`}>
                                <ClipboardList size={20} /> Pesanan Masuk
                            </Link>
                            <Link to="/admin/history" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${desktopActive('/admin/history')}`}>
                                <History size={20} /> Riwayat
                            </Link>
                            <Link to="/admin/tables" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${desktopActive('/admin/tables')}`}>
                                <QrCode size={20} /> Meja & QR
                            </Link>
                            <Link to="/admin/products" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${desktopActive('/admin/products')}`}>
                                <Coffee size={20} /> Produk
                            </Link>
                            <Link to="/admin/reports" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${desktopActive('/admin/reports')}`}>
                                <FileBarChart size={20} /> Laporan
                            </Link>
                            <Link to="/admin/settings" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${desktopActive('/admin/settings')}`}>
                                <Settings size={20} /> Pengaturan
                            </Link>
                        </>
                    )}

                    {userRole === 'head' && (
                        <Link to="/head" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${desktopActive('/head')}`}>
                            <FileBarChart size={20} /> Laporan Keuangan
                        </Link>
                    )}

                    {userRole === 'kitchen' && (
                        <Link to="/kitchen" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${desktopActive('/kitchen')}`}>
                            <ChefHat size={20} /> Pesanan Dapur
                        </Link>
                    )}

                    {userRole === 'barista' && (
                        <Link to="/barista" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${desktopActive('/barista')}`}>
                            <Coffee size={20} /> Pesanan Bar
                        </Link>
                    )}

                    <div className="pt-4 mt-4 border-t border-slate-800">
                        <Link to="/profile" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${desktopActive('/profile')}`}>
                            <User size={20} /> Akun Saya
                        </Link>
                    </div>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button onClick={handleLogout} className="flex items-center gap-3 text-red-400 hover:bg-red-500/10 hover:text-red-500 px-4 py-3 w-full rounded-xl transition font-medium">
                        <LogOut size={20} /> Keluar
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto bg-gray-50 relative pb-24 md:pb-0">
                <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b px-4 md:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <img
                            src="/assets/logo.png"
                            alt="Logo"
                            className="md:hidden w-8 h-8 object-contain"
                            onError={(e) => e.target.style.display = 'none'}
                        />
                        <h2 className="font-bold text-gray-800 text-lg">
                            {getPageTitle()}
                        </h2>
                    </div>

                    <button onClick={handleLogout} className="md:hidden p-2 text-red-500 bg-red-50 rounded-full">
                        <LogOut size={20} />
                    </button>

                    <div className="hidden md:flex h-9 w-9 bg-gradient-to-tr from-orange-500 to-red-500 rounded-full items-center justify-center text-white font-bold shadow-md text-sm">
                        {userRole ? userRole[0].toUpperCase() : 'U'}
                    </div>
                </header>
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>

            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 overflow-x-auto no-scrollbar">
                <div className="flex justify-between items-center px-2 py-3 min-w-max w-full">
                    {userRole === 'admin' && (
                        <>
                            <Link to="/admin" className={`flex flex-col items-center gap-1 px-3 ${isActive('/admin')}`}>
                                <LayoutDashboard size={20} /> <span className="text-[9px] font-bold">Dash</span>
                            </Link>
                            <Link to="/admin/live-orders" className={`flex flex-col items-center gap-1 px-3 ${isActive('/admin/live-orders')}`}>
                                <ClipboardList size={20} /> <span className="text-[9px] font-bold">Order</span>
                            </Link>
                            <Link to="/admin/products" className={`flex flex-col items-center gap-1 px-3 ${isActive('/admin/products')}`}>
                                <Coffee size={20} /> <span className="text-[9px] font-bold">Menu</span>
                            </Link>
                            <Link to="/admin/reports" className={`flex flex-col items-center gap-1 px-3 ${isActive('/admin/reports')}`}>
                                <FileBarChart size={20} /> <span className="text-[9px] font-bold">Laporan</span>
                            </Link>
                            <Link to="/admin/settings" className={`flex flex-col items-center gap-1 px-3 ${isActive('/admin/settings')}`}>
                                <Settings size={20} /> <span className="text-[9px] font-bold">Set</span>
                            </Link>
                        </>
                    )}

                    {userRole === 'head' && (
                        <Link to="/head" className={`flex flex-col items-center gap-1 px-6 w-full ${isActive('/head')}`}>
                            <FileBarChart size={24} /> <span className="text-[10px] font-bold">Laporan Keuangan</span>
                        </Link>
                    )}

                    {userRole === 'kitchen' && (
                        <Link to="/kitchen" className={`flex flex-col items-center gap-1 px-6 w-full ${isActive('/kitchen')}`}>
                            <ChefHat size={24} /> <span className="text-[10px] font-bold">Pesanan Dapur</span>
                        </Link>
                    )}

                    {userRole === 'barista' && (
                        <Link to="/barista" className={`flex flex-col items-center gap-1 px-6 w-full ${isActive('/barista')}`}>
                            <Coffee size={24} /> <span className="text-[10px] font-bold">Pesanan Bar</span>
                        </Link>
                    )}

                    <Link to="/profile" className={`flex flex-col items-center gap-1 px-3 ${isActive('/profile')}`}>
                        <User size={20} /> <span className="text-[9px] font-bold">Akun</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AdminLayout;