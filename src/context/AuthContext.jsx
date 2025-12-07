import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '../firebase';
import {
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updatePassword,
    updateProfile
} from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    const loginGoogle = () => signInWithPopup(auth, googleProvider);

    const loginEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);

    const registerEmail = async (email, password, name) => {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(res.user, { displayName: name });
        return res;
    }

    const logout = () => {
        setUserRole(null); // Reset role saat logout
        return signOut(auth);
    };

    const changePassword = (newPassword) => updatePassword(currentUser, newPassword);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                const email = user.email.toLowerCase(); // Paksa huruf kecil biar aman
                let role = 'user'; // Default role

                // LOGIKA PENENTUAN ROLE
                if (email === 'admin@cafe.com') {
                    role = 'admin';
                } else if (email === 'head@cafe.com') {
                    role = 'head';
                }

                console.log(`Login sebagai: ${email} | Role: ${role}`); // Cek di Console
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
        loading, // Export loading status
        loginGoogle,
        loginEmail,
        registerEmail,
        logout,
        changePassword
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};