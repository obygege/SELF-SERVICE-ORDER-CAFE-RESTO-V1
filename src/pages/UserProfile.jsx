import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, auth as firebaseAuth } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile, updateEmail, reload } from 'firebase/auth';
import { User, Mail, Shield, Lock, Save, Loader2, Phone, AlertTriangle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const UserProfile = () => {
    const { currentUser, changePassword, userRole } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [formData, setFormData] = useState({
        name: '',
        phoneNumber: '',
        email: ''
    });

    const [passwords, setPasswords] = useState({
        newPass: '',
        confirmPass: ''
    });

    const fetchUserData = async () => {
        if (!currentUser) return;
        try {
            await reload(firebaseAuth.currentUser);
            const user = firebaseAuth.currentUser;
            const userDoc = await getDoc(doc(db, "users", user.uid));

            if (userDoc.exists()) {
                const data = userDoc.data();
                setFormData({
                    name: data.name || user.displayName || '',
                    phoneNumber: data.phoneNumber || '',
                    email: user.email || ''
                });

                if (data.email !== user.email) {
                    await updateDoc(doc(db, "users", user.uid), {
                        email: user.email
                    });
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, [currentUser]);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const user = firebaseAuth.currentUser;
            const firestoreUpdates = {};

            if (formData.email && formData.email.toLowerCase() !== user.email.toLowerCase()) {
                try {
                    await updateEmail(user, formData.email.toLowerCase());
                    firestoreUpdates.email = formData.email.toLowerCase();
                } catch (emailError) {
                    if (emailError.code === 'auth/email-already-in-use') {
                        throw new Error("EMAIL_EXISTS");
                    } else if (emailError.code === 'auth/requires-recent-login') {
                        throw new Error("RE_LOGIN");
                    } else {
                        throw emailError;
                    }
                }
            }

            if (formData.name && formData.name !== user.displayName) {
                await updateProfile(user, { displayName: formData.name });
                firestoreUpdates.name = formData.name;
            }

            if (formData.phoneNumber !== undefined) {
                firestoreUpdates.phoneNumber = formData.phoneNumber;
            }

            if (Object.keys(firestoreUpdates).length > 0) {
                await updateDoc(doc(db, "users", user.uid), firestoreUpdates);
                toast.success("Profil berhasil diperbarui!");
            } else {
                toast("Tidak ada perubahan");
            }

        } catch (error) {
            console.error(error);
            if (error.message === 'EMAIL_EXISTS') {
                toast.error("Email ini terdeteksi sudah terdaftar di sistem. Coba email lain.");
            } else if (error.message === 'RE_LOGIN') {
                toast.error("Sesi keamanan habis. Silakan Logout dan Login kembali untuk ganti email.");
            } else {
                toast.error("Gagal: " + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleChangePass = async (e) => {
        e.preventDefault();
        if (!passwords.newPass || passwords.newPass.length < 6) {
            return toast.error("Password minimal 6 karakter");
        }
        if (passwords.newPass !== passwords.confirmPass) {
            return toast.error("Konfirmasi password tidak cocok");
        }

        setLoading(true);
        try {
            await changePassword(passwords.newPass);
            toast.success("Password berhasil diperbarui!");
            setPasswords({ newPass: '', confirmPass: '' });
        } catch (error) {
            toast.error("Gagal ubah password. Login ulang diperlukan.");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="animate-spin text-orange-600" size={40} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-10 p-4">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-slate-900 p-8 text-white relative">
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 rounded-3xl bg-orange-500 flex items-center justify-center text-3xl font-black shadow-lg">
                                {formData.name ? formData.name[0].toUpperCase() : '?'}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tight">{formData.name}</h2>
                                <p className="text-slate-400 text-sm flex items-center gap-2 mt-1 lowercase italic">
                                    <Mail size={14} /> {firebaseAuth.currentUser?.email}
                                </p>
                                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/10 text-orange-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                                    <Shield size={12} /> {userRole}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={fetchUserData}
                            className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-2xl font-black text-xs transition-all shadow-lg shadow-orange-900/20"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> REFRESH STATUS
                        </button>
                    </div>
                </div>

                <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <section className="space-y-6">
                        <h3 className="font-black text-slate-800 text-sm uppercase flex items-center gap-2 tracking-widest">
                            <User size={18} className="text-orange-600" /> Informasi Akun
                        </h3>
                        <form onSubmit={handleUpdateProfile} className="space-y-5">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-1">Nama Lengkap</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 font-bold text-slate-800 focus:bg-white focus:border-orange-500 outline-none transition-all"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-1">Email Login Baru</label>
                                <input
                                    type="email"
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 font-bold text-slate-800 focus:bg-white focus:border-orange-500 outline-none transition-all"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-1">WhatsApp</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 font-bold text-slate-800 focus:bg-white focus:border-orange-500 outline-none transition-all"
                                    value={formData.phoneNumber}
                                    onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 hover:bg-slate-800 transition shadow-xl active:scale-95"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : "Simpan Perubahan"}
                            </button>
                        </form>
                    </section>

                    <section className="space-y-6">
                        <h3 className="font-black text-slate-800 text-sm uppercase flex items-center gap-2 tracking-widest">
                            <Lock size={18} className="text-blue-600" /> Keamanan
                        </h3>
                        <form onSubmit={handleChangePass} className="space-y-5">
                            <input
                                type="password"
                                placeholder="Sandi Baru"
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
                                value={passwords.newPass}
                                onChange={e => setPasswords({ ...passwords, newPass: e.target.value })}
                            />
                            <input
                                type="password"
                                placeholder="Ulangi Sandi"
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
                                value={passwords.confirmPass}
                                onChange={e => setPasswords({ ...passwords, confirmPass: e.target.value })}
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs hover:bg-blue-700 transition shadow-xl active:scale-95"
                            >
                                Ganti Password
                            </button>
                        </form>
                    </section>
                </div>
            </div>

            <div className="bg-red-50 border border-red-200 p-6 rounded-[2rem] flex items-start gap-4">
                <AlertTriangle className="text-red-600 shrink-0" size={24} />
                <div>
                    <h4 className="font-black text-red-900 text-sm uppercase">Peringatan Sistem</h4>
                    <p className="text-red-800 text-[10px] font-bold leading-relaxed mt-1">
                        Jika Anda mendapatkan pesan "Email sudah digunakan" padahal di Firebase tidak ada, silakan **Logout** dan **Hapus Cache Browser**, lalu coba kembali. Firebase terkadang menyimpan data "Email Terpakai" sementara dalam sistem proteksi mereka.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;