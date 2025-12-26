import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword } from 'firebase/auth';
// Tambahkan AlertCircle di baris bawah ini
import { UserPlus, Shield, ChefHat, Coffee, Loader2, Mail, Lock, User, Phone, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const HeadAddStaff = () => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phoneNumber: '',
        role: 'kitchen'
    });

    const roles = [
        { id: 'kitchen', label: 'Kitchen / Dapur', icon: <ChefHat size={18} /> },
        { id: 'barista', label: 'Barista / Bar', icon: <Coffee size={18} /> },
        { id: 'admin', label: 'Admin / Kasir', icon: <Shield size={18} /> },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const headEmail = auth.currentUser.email;
        const headPassword = window.prompt("Masukkan kembali password Anda (Head) untuk konfirmasi keamanan:");

        if (!headPassword) {
            setLoading(false);
            return;
        }

        try {
            const res = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const newStaff = res.user;

            await setDoc(doc(db, "users", newStaff.uid), {
                uid: newStaff.uid,
                name: formData.name,
                email: formData.email,
                phoneNumber: formData.phoneNumber,
                role: formData.role,
                createdAt: new Date()
            });

            await signOut(auth);
            await signInWithEmailAndPassword(auth, headEmail, headPassword);

            toast.success(`Akun ${formData.role.toUpperCase()} berhasil dibuat!`);
            setFormData({ name: '', email: '', password: '', phoneNumber: '', role: 'kitchen' });
        } catch (error) {
            console.error(error);
            if (error.code === 'auth/email-already-in-use') {
                toast.error("Email sudah terdaftar di sistem.");
            } else {
                toast.error("Gagal: " + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
            <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <UserPlus className="text-orange-600" size={32} /> TAMBAH STAFF BARU
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 uppercase font-bold tracking-widest">Registrasi Akses Operasional Cafe</p>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
                    <div className="bg-slate-900 p-6 text-white text-center">
                        <p className="text-[10px] font-black tracking-[0.2em] opacity-60 uppercase">Pilih Hak Akses</p>
                        <div className="flex justify-center gap-2 mt-4">
                            {roles.map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => setFormData({ ...formData, role: r.id })}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${formData.role === r.id ? 'bg-orange-600 text-white shadow-lg' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
                                >
                                    {r.icon} {r.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Nama Lengkap</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-3.5 text-gray-300" size={20} />
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-12 py-3.5 font-bold outline-none focus:border-orange-500 focus:bg-white transition-all"
                                        placeholder="Nama Staff"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Nomor WhatsApp</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-3.5 text-gray-300" size={20} />
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-12 py-3.5 font-bold outline-none focus:border-orange-500 focus:bg-white transition-all"
                                        placeholder="0812..."
                                        value={formData.phoneNumber}
                                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Email Staff</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 text-gray-300" size={20} />
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-12 py-3.5 font-bold outline-none focus:border-orange-500 focus:bg-white transition-all"
                                    placeholder="email@cafefutura.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Password Login</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-3.5 text-gray-300" size={20} />
                                <input
                                    type="password"
                                    required
                                    minLength="6"
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-12 py-3.5 font-bold outline-none focus:border-orange-500 focus:bg-white transition-all"
                                    placeholder="Min. 6 Karakter"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                            >
                                {loading ? <Loader2 className="animate-spin" size={24} /> : "DAFTARKAN STAFF SEKARANG"}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="text-blue-500 shrink-0" size={20} />
                    <p className="text-[10px] font-bold text-blue-700 leading-relaxed uppercase">
                        Sistem akan mendaftarkan akun ke Firebase Auth dan membuat profil otomatis di Firestore. Anda akan diminta memasukkan password Head kembali untuk memulihkan sesi setelah pembuatan akun selesai.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default HeadAddStaff;