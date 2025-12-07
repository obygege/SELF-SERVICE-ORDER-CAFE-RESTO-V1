import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, UtensilsCrossed } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginUser = () => {
    const [isRegister, setIsRegister] = useState(false); // Toggle Login/Daftar
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    const { loginEmail, registerEmail, loginGoogle } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isRegister) {
                await registerEmail(email, password, name);
                toast.success("Akun berhasil dibuat!");
            } else {
                await loginEmail(email, password);
                toast.success("Berhasil Masuk!");
            }
            navigate('/'); // Masuk ke Menu
        } catch (err) {
            console.error(err);
            toast.error(isRegister ? "Gagal Daftar (Email mungkin sudah ada)" : "Email/Password Salah");
        }
    };

    const handleGoogle = async () => {
        try {
            await loginGoogle();
            navigate('/');
        } catch (err) {
            toast.error("Gagal Login Google");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-orange-500 to-orange-400 rounded-b-[50px] z-0"></div>

            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md z-10 overflow-hidden relative">
                <div className="p-8 pb-4 text-center">
                    <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                        <UtensilsCrossed />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">
                        {isRegister ? 'Buat Akun Baru' : 'Selamat Datang'}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        {isRegister ? 'Isi data diri untuk memesan makanan' : 'Silakan masuk untuk mulai memesan'}
                    </p>
                </div>

                <div className="px-8 pb-8">
                    {/* Google Button */}
                    <button
                        onClick={handleGoogle}
                        className="w-full border border-gray-300 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition mb-6 font-medium text-gray-700"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />
                        {isRegister ? 'Daftar dengan Google' : 'Masuk dengan Google'}
                    </button>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                        <div className="relative flex justify-center text-xs uppercase text-gray-400 font-bold tracking-wider"><span className="bg-white px-2">Atau via Email</span></div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isRegister && (
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                    placeholder="Nama Lengkap"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="email"
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                placeholder="email@anda.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="password"
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                placeholder="Password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button type="submit" className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700 transition shadow-lg shadow-orange-200">
                            {isRegister ? 'Daftar Sekarang' : 'Masuk Aplikasi'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        <span className="text-gray-500">
                            {isRegister ? 'Sudah punya akun? ' : 'Belum punya akun? '}
                        </span>
                        <button
                            onClick={() => setIsRegister(!isRegister)}
                            className="text-orange-600 font-bold hover:underline"
                        >
                            {isRegister ? 'Login disini' : 'Daftar disini'}
                        </button>
                    </div>

                    <div className="mt-8 pt-4 border-t text-center">
                        <Link to="/staff-login" className="text-xs text-gray-400 hover:text-gray-600 font-medium">
                            Login Khusus Staff (Admin/Kepala)
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginUser;