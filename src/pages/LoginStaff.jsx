import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginStaff = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { loginEmail } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await loginEmail(email, password);
            // Cek role setelah login berhasil di handle AuthContext
            if (email === 'admin@cafe.com') {
                navigate('/admin');
            } else if (email === 'head@cafe.com') {
                navigate('/head');
            } else {
                toast.error("Akun ini bukan akun Staff!");
                navigate('/'); // Tendang ke user menu jika user biasa coba login disini
            }
        } catch (err) {
            toast.error("Akses Ditolak: Email/Password Salah");
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm border border-slate-700 p-8">

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
                        <ShieldCheck size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Portal Staff</h2>
                    <p className="text-slate-400 text-sm">Admin & Kepala Toko</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Staff</label>
                        <input
                            type="email"
                            className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-600 outline-none transition"
                            placeholder="admin@cafe.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                        <div className="relative">
                            <input
                                type="password"
                                className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-600 outline-none transition"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                            <Lock className="absolute right-3 top-3.5 text-slate-500" size={18} />
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-500 transition shadow-lg shadow-orange-900/20">
                        MASUK DASHBOARD
                    </button>
                </form>

                <div className="mt-8 text-center border-t border-slate-700 pt-4">
                    <Link to="/login" className="text-slate-500 text-sm hover:text-white transition">
                        &larr; Kembali ke Login Pelanggan
                    </Link>
                </div>

            </div>
        </div>
    );
};

export default LoginStaff;