import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShieldCheck, Loader2, Lock, Mail, UserCog } from 'lucide-react';

const LoginStaff = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await signInWithEmailAndPassword(auth, email.trim(), password);
            const user = res.user;

            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            let role = 'user';

            if (docSnap.exists()) {
                role = docSnap.data().role;
            } else {
                if (email.toLowerCase().includes('admin')) role = 'admin';
                else if (email.toLowerCase().includes('head') || email.toLowerCase().includes('kepala')) role = 'head';

                if (role !== 'user') {
                    await setDoc(docRef, {
                        email: email,
                        role: role,
                        uid: user.uid,
                        createdAt: new Date()
                    }, { merge: true });
                }
            }

            if (role === 'admin') {
                toast.success("Login Admin Berhasil");
                window.location.href = "/admin";
            } else if (role === 'head') {
                toast.success("Login Kepala Toko Berhasil");
                window.location.href = "/head";
            } else {
                toast.error("Akun Anda terdaftar sebagai Pelanggan, bukan Staff.");
                await auth.signOut();
            }

        } catch (error) {
            console.error(error);
            if (error.code === 'auth/wrong-password') {
                toast.error("Password salah!");
            } else if (error.code === 'auth/user-not-found') {
                toast.error("Email staff tidak terdaftar!");
            } else {
                toast.error("Gagal Masuk: Periksa Email/Password");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100">
                <div className="bg-slate-900 p-10 text-white text-center relative overflow-hidden">
                    <div className="absolute -top-4 -right-4 opacity-10 rotate-12">
                        <UserCog size={160} />
                    </div>
                    <div className="relative z-10 flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/20 shadow-xl">
                            <ShieldCheck size={40} className="text-orange-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">LOGIN MANAGEMENT</h1>
                            <p className="text-slate-400 text-[10px] font-bold tracking-widest mt-2 uppercase">AKSES ADMIN & KEPALA TOKO</p>
                        </div>
                    </div>
                </div>

                <div className="p-10">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Email Management</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-4 text-gray-400 group-focus-within:text-slate-900 transition-colors" size={20} />
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-12 py-4 font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-900 transition-all shadow-sm"
                                    placeholder="admin@gmail.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Kata Sandi</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-4 text-gray-400 group-focus-within:text-slate-900 transition-colors" size={20} />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-12 py-4 font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-900 transition-all shadow-sm"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-3 mt-4"
                        >
                            {loading ? <Loader2 className="animate-spin" size={24} /> : "OTORISASI MASUK"}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <Link to="/login" className="text-xs text-slate-400 hover:text-slate-900 transition font-black uppercase tracking-tighter">
                            ← Kembali ke Login Customer
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginStaff;