import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, ShoppingBag, ClipboardList, History, MapPin, FileBarChart, Settings, LogOut, Coffee, Utensils } from 'lucide-react';

const Sidebar = () => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const role = currentUser?.role || 'customer';

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const menus = [
        { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['admin', 'head'] },
        { path: '/products', label: 'Produk', icon: <ShoppingBag size={20} />, roles: ['admin', 'manager', 'head'] },
        { path: '/orders', label: 'Pesanan Masuk', icon: <ClipboardList size={20} />, roles: ['admin', 'head'] },
        { path: '/kitchen', label: 'Dapur (Kitchen)', icon: <Utensils size={20} />, roles: ['kitchen', 'head'] },
        { path: '/barista', label: 'Bar (Barista)', icon: <Coffee size={20} />, roles: ['barista', 'head'] },
        { path: '/admin-history', label: 'Riwayat Order', icon: <History size={20} />, roles: ['admin', 'manager', 'head'] },
        { path: '/tables', label: 'Meja & QR', icon: <MapPin size={20} />, roles: ['admin', 'head'] },
        { path: '/finance', label: 'Laporan Keuangan', icon: <FileBarChart size={20} />, roles: ['admin', 'manager', 'head'] },
        { path: '/settings', label: 'Pengaturan', icon: <Settings size={20} />, roles: ['admin', 'head'] },
    ];

    return (
        <div className="w-64 bg-slate-900 min-h-screen text-white flex flex-col">
            <div className="p-6 border-b border-slate-800">
                <h1 className="text-xl font-bold text-orange-500 tracking-wider">FUTURA POS</h1>
                <p className="text-xs text-slate-400 mt-1 uppercase">Role: {role}</p>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {menus.map((menu, idx) => {
                    if (menu.roles.includes(role)) {
                        return (
                            <NavLink
                                key={idx}
                                to={menu.path}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-3 rounded-xl transition ${isActive ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`
                                }
                            >
                                {menu.icon}
                                <span className="font-medium text-sm">{menu.label}</span>
                            </NavLink>
                        )
                    }
                    return null;
                })}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full text-red-400 hover:bg-slate-800 rounded-xl transition">
                    <LogOut size={20} />
                    <span className="font-medium text-sm">Keluar</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;