import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck } from 'lucide-react';

const AdminHome = () => {
    const { userRole, currentUser } = useAuth();

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-lg w-full border border-gray-100">
                <div className="bg-orange-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck size={48} className="text-orange-600" />
                </div>
                <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Selamat Datang</h1>
                <p className="text-gray-500 mb-6">Sistem Kasir & Manajemen Cafe Futura</p>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">User Login</p>
                    <p className="text-lg font-bold text-gray-800">{currentUser?.email}</p>
                    <span className="inline-block mt-2 px-3 py-1 bg-slate-800 text-white text-xs rounded-full uppercase font-bold">
                        {userRole}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default AdminHome;