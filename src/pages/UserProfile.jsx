import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const UserProfile = () => {
    const { currentUser, changePassword, userRole } = useAuth();
    const [newPass, setNewPass] = useState('');

    const handleChange = async (e) => {
        e.preventDefault();
        if (newPass.length < 6) return toast.error("Password minimal 6 karakter");
        try {
            await changePassword(newPass);
            toast.success("Password berhasil diubah!");
            setNewPass('');
        } catch (error) {
            toast.error("Gagal ubah password (Login ulang dulu)");
        }
    };

    return (
        <div className="max-w-2xl bg-white p-8 rounded-xl shadow-sm">
            <h2 className="text-2xl font-bold mb-6">Profil Pengguna</h2>

            <div className="mb-6">
                <label className="block text-sm text-gray-500">Email</label>
                <div className="p-3 bg-gray-50 rounded mt-1 font-mono">{currentUser?.email}</div>
            </div>

            <div className="mb-6">
                <label className="block text-sm text-gray-500">Role</label>
                <div className="p-3 bg-gray-50 rounded mt-1 uppercase font-bold text-orange-600">{userRole}</div>
            </div>

            <hr className="my-6" />

            <h3 className="text-lg font-bold mb-4">Ganti Password</h3>
            <form onSubmit={handleChange} className="flex gap-4">
                <input
                    type="password"
                    placeholder="Password Baru"
                    className="flex-1 border p-2 rounded"
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                />
                <button type="submit" className="bg-orange-600 text-white px-6 py-2 rounded hover:bg-orange-700">
                    Simpan
                </button>
            </form>
        </div>
    );
};

export default UserProfile;