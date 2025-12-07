import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '../firebase';
import {
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword, // <--- Tambah ini
    signOut,
    onAuthStateChanged,
    updatePassword,
    updateProfile // <--- Tambah ini untuk simpan nama user
} from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    // Login Google
    const loginGoogle = () => signInWithPopup(auth, googleProvider);

    // Login Email Biasa
    const loginEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);

    // Daftar Email Baru (Fitur Baru)
    const registerEmail = async (email, password, name) => {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        // Update nama user agar tidak null
        await updateProfile(res.user, { displayName: name });
        return res;
    }

    const logout = () => signOut(auth);
    const changePassword = (newPassword) => updatePassword(currentUser, newPassword);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                let role = 'user';
                if (user.email === 'admin@cafe.com') role = 'admin';
                if (user.email === 'head@cafe.com') role = 'head';

                setUserRole(role);
                setCurrentUser(user);
            } else {
                setCurrentUser(null);
                setUserRole(null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userRole,
        loginGoogle,
        loginEmail,
        registerEmail, // Export fungsi baru
        logout,
        changePassword
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};