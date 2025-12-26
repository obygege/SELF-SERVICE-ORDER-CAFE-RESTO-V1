import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChefHat, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';

const LoginKitchenBarista = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await signInWithEmailAndPassword(auth, email.trim(), password);
            const user = res.user;

            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                const role = userData.role;

                if (role === 'kitchen') {
                    toast.success("Akses Dapur Diberikan");
                    window.location.href = "/kitchen";
                } else if (role === 'barista') {
                    toast.success("Akses Barista Diberikan");
                    window.location.href = "/barista";
                } else if (role === 'admin' || role === 'head') {
                    toast.success("Akses Management");
                    window.location.href = "/admin/live-orders";
                } else {
                    toast.error("Role Anda (" + role + ") tidak diizinkan masuk ke area operasional.");
                    await auth.signOut();
                }
            } else {
                toast.error("Profil tidak ditemukan di Database. Pastikan Role sudah diinput di Firestore!");
                await auth.signOut();
            }

        } catch (error) {
            console.error(error);
            if (error.code === 'auth/wrong-password') {
                toast.error("Password salah!");
            } else if (error.code === 'auth/user-not-found') {
                toast.error("Email staff tidak terdaftar!");
            } else {
                toast.error("Gagal Masuk: " + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100">
                <div className="bg-orange-600 p-10 text-white text-center relative overflow-hidden">
                    <div className="absolute -top-4 -right-4 opacity-10 rotate-12">
                        <ChefHat size={160} />
                    </div>
                    <div className="relative z-10 flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/30 shadow-xl">
                            <ShieldCheck size={40} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tighter uppercase">LOGIN KITCHEN & BARISTA</h1>
                            <p className="text-orange-100 text-[10px] font-bold tracking-widest mt-1 uppercase">AKSES KHUSUS BARISTA DAN KITCHEN</p>
                        </div>
                    </div>
                </div>

                <div className="p-10">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-4 text-gray-400 group-focus-within:text-orange-600 transition-colors" size={20} />
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-12 py-4 font-bold text-slate-700 outline-none focus:bg-white focus:border-orange-500 transition-all shadow-sm"
                                    placeholder="nama@gmail.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Kata Sandi</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-4 text-gray-400 group-focus-within:text-orange-600 transition-colors" size={20} />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-12 py-4 font-bold text-slate-700 outline-none focus:bg-white focus:border-orange-500 transition-all shadow-sm"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-3 mt-4"
                        >
                            {loading ? <Loader2 className="animate-spin" size={24} /> : "MASUK KERJA"}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <Link to="/login" className="text-xs text-slate-400 hover:text-orange-600 transition font-black uppercase tracking-tighter">
                            ← Kembali ke Login Customer
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginKitchenBarista;