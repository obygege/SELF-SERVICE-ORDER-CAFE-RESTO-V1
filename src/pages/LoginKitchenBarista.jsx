import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChefHat, Coffee, Loader2, Lock, Mail } from 'lucide-react';

const LoginKitchenBarista = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Login ke Firebase
            const res = await signInWithEmailAndPassword(auth, email, password);
            const user = res.user;

            // 2. Cek Data di Firestore
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            let role = 'user';

            // 3. Logika Deteksi Role
            if (docSnap.exists()) {
                role = docSnap.data().role || 'user';
            } else {
                // Auto-Assign Role jika belum ada di database
                const lowerEmail = email.toLowerCase();
                if (lowerEmail.includes('kitchen') || lowerEmail.includes('dapur')) role = 'kitchen';
                else if (lowerEmail.includes('barista') || lowerEmail.includes('bar')) role = 'barista';

                if (role !== 'user') {
                    await setDoc(docRef, {
                        email: email,
                        role: role,
                        uid: user.uid,
                        createdAt: new Date()
                    }, { merge: true });
                }
            }

            // 4. Redirect sesuai Role (Pakai window.location agar refresh total)
            if (role === 'kitchen') {
                toast.success("Login Dapur Berhasil");
                window.location.href = "/kitchen";
            } else if (role === 'barista') {
                toast.success("Login Barista Berhasil");
                window.location.href = "/barista";
            } else {
                toast.error("Akses Ditolak: Bukan akun Operasional (Kitchen/Barista).");
                await auth.signOut(); // Logout paksa jika salah role
                setLoading(false);
            }

        } catch (error) {
            console.error(error);
            toast.error("Login Gagal: Periksa Email/Password");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-green-600 rounded-full blur-[100px] opacity-20"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-yellow-600 rounded-full blur-[100px] opacity-20"></div>

            <div className="bg-white/10 backdrop-blur-lg border border-white/10 p-8 rounded-2xl shadow-2xl w-full max-w-sm relative z-10">
                <div className="text-center mb-8">
                    <div className="flex justify-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                            <ChefHat className="text-white" size={24} />
                        </div>
                        <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/30">
                            <Coffee className="text-white" size={24} />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Operasional</h1>
                    <p className="text-slate-400 text-sm mt-1">Area Khusus Kitchen & Barista</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="relative group">
                        <Mail className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-green-400 transition-colors" size={18} />
                        <input
                            type="email"
                            placeholder="Email Operasional"
                            className="w-full bg-slate-800/50 border border-slate-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder:text-slate-500"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-green-400 transition-colors" size={18} />
                        <input
                            type="password"
                            placeholder="Password"
                            className="w-full bg-slate-800/50 border border-slate-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder:text-slate-500"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-green-600 to-yellow-600 hover:from-green-500 hover:to-yellow-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-900/20 transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : "Masuk Kerja"}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-white/10 text-center">
                    <Link to="/login" className="text-xs text-slate-400 hover:text-white transition font-medium">
                        ← Kembali ke Login Pelanggan
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LoginKitchenBarista;