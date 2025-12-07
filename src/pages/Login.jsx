import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { loginEmail, loginGoogle, userRole } = useAuth();
    const navigate = useNavigate();

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        try {
            await loginEmail(email, password);
            // Redirect dihandle oleh useEffect di App.js atau disini manual
            if (email === 'admin@cafe.com') navigate('/admin');
            else if (email === 'head@cafe.com') navigate('/head');
            else navigate('/');
        } catch (err) {
            toast.error("Login Gagal: Cek Email/Password");
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await loginGoogle();
            navigate('/');
        } catch (err) {
            toast.error("Gagal Login Google");
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row">

                <div className="w-full md:w-1/2 p-8 md:p-12">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">Selamat Datang</h2>
                    <p className="text-gray-500 mb-8">Silakan login untuk melanjutkan</p>

                    <form onSubmit={handleEmailLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email (Admin/Kepala)</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input
                                    type="email"
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                    placeholder="admin@cafe.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input
                                    type="password"
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                    placeholder="••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition">
                            Login Staff
                        </button>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
                        <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Atau Pelanggan</span></div>
                    </div>

                    <button onClick={handleGoogleLogin} className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-50 transition flex items-center justify-center gap-2">
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />
                        Masuk dengan Google
                    </button>
                </div>

                <div className="w-full md:w-1/2 bg-orange-600 p-12 text-white flex flex-col justify-center items-center text-center hidden md:flex">
                    <h1 className="text-4xl font-extrabold mb-4">Cafe POS</h1>
                    <p className="opacity-90 text-lg">Nikmati kemudahan memesan makanan langsung dari meja Anda.</p>
                </div>
            </div>
        </div>
    );
};

export default Login;