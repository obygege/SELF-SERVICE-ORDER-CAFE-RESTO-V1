import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Coffee, FileBarChart, User, LogOut, ShieldCheck, ClipboardList, History, QrCode, Settings } from 'lucide-react';

const AdminLayout = () => {
    const { userRole, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = async () => {
        if (window.confirm("Yakin ingin keluar?")) {
            await logout();
            navigate('/staff-login');
        }
    };

    const isActive = (path) => {
        if (path === '/head' && location.pathname === '/head') return 'text-orange-600 font-bold';
        if (path !== '/head' && location.pathname.startsWith(path)) return 'text-orange-600 font-bold';
        return 'text-gray-400 hover:text-slate-800';
    };

    const desktopActive = (path) => {
        if (path === '/head' && location.pathname === '/head') return 'bg-orange-600 text-white shadow-lg';
        if (path !== '/head' && location.pathname.startsWith(path)) return 'bg-orange-600 text-white shadow-lg';
        return 'text-slate-300 hover:bg-slate-800 hover:text-white';
    }

    return (
        <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
            {/* --- DESKTOP SIDEBAR --- */}
            <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col shadow-xl z-20">
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <div className="bg-orange-600 p-2 rounded-lg">
                        <ShieldCheck size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">POS SYSTEM</h1>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">{userRole === 'head' ? 'KEPALA TOKO' : 'ADMIN'}</p>
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

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 overflow-y-auto bg-gray-50 relative pb-24 md:pb-0">
                <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b px-4 md:px-8 py-4 flex justify-between items-center">
                    <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                        <ShieldCheck className="md:hidden text-orange-600" size={24} />
                        {userRole === 'admin' ? 'Control Panel' : 'Laporan Toko'}
                    </h2>

                    {/* Logout Button Mobile (Top Right) */}
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

            {/* --- MOBILE BOTTOM NAV (Scrollable) --- */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 overflow-x-auto no-scrollbar">
                <div className="flex justify-between items-center px-2 py-3 min-w-max w-full">
                    {userRole === 'admin' ? (
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
                            <Link to="/admin/history" className={`flex flex-col items-center gap-1 px-3 ${isActive('/admin/history')}`}>
                                <History size={20} /> <span className="text-[9px] font-bold">Riwayat</span>
                            </Link>
                            <Link to="/admin/settings" className={`flex flex-col items-center gap-1 px-3 ${isActive('/admin/settings')}`}>
                                <Settings size={20} /> <span className="text-[9px] font-bold">Set</span>
                            </Link>
                            <Link to="/profile" className={`flex flex-col items-center gap-1 px-3 ${isActive('/profile')}`}>
                                <User size={20} /> <span className="text-[9px] font-bold">Akun</span>
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link to="/head" className={`flex flex-col items-center gap-1 px-6 w-1/2 ${isActive('/head')}`}>
                                <FileBarChart size={24} /> <span className="text-[10px] font-bold">Laporan Keuangan</span>
                            </Link>
                            <Link to="/profile" className={`flex flex-col items-center gap-1 px-6 w-1/2 ${isActive('/profile')}`}>
                                <User size={24} /> <span className="text-[10px] font-bold">Akun Saya</span>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminLayout;