import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShieldCheck, Loader2, Lock, Mail } from 'lucide-react';

const LoginStaff = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await signInWithEmailAndPassword(auth, email, password);
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
            toast.error("Login Gagal: Periksa Email/Password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-orange-600 rounded-full blur-[100px] opacity-20"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-blue-600 rounded-full blur-[100px] opacity-20"></div>

            <div className="bg-white/10 backdrop-blur-lg border border-white/10 p-8 rounded-2xl shadow-2xl w-full max-w-sm relative z-10">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-tr from-orange-500 to-red-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
                        <ShieldCheck className="text-white" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">LOGIN ADMIN</h1>
                    <p className="text-slate-400 text-sm mt-1">Admin & Kepala Toko</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="relative group">
                        <Mail className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                        <input
                            type="email"
                            placeholder="Email"
                            className="w-full bg-slate-800/50 border border-slate-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-slate-500"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                        <input
                            type="password"
                            placeholder="Password"
                            className="w-full bg-slate-800/50 border border-slate-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-slate-500"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-900/20 transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : "LOGIN"}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-white/10 text-center">
                    <Link to="/login" className="text-xs text-slate-400 hover:text-white transition font-medium">
                        ← Login Pelanggan
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LoginStaff;