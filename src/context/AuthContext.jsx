import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import {
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updatePassword,
    updateProfile,
    GoogleAuthProvider
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    // Login Google
    const loginGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            // Force account selection (biar bisa ganti akun kalau logout)
            provider.setCustomParameters({
                prompt: 'select_account'
            });
            const result = await signInWithPopup(auth, provider);
            return result;
        } catch (error) {
            console.error("AuthContext Google Error:", error);
            throw error;
        }
    };

    const loginEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);

    const registerEmail = async (email, password, name) => {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(res.user, { displayName: name });
        return res;
    }

    const logout = () => {
        setUserRole(null);
        return signOut(auth);
    };

    const changePassword = (newPassword) => updatePassword(currentUser, newPassword);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const docRef = doc(db, "users", user.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setUserRole(docSnap.data().role);
                    } else {
                        setUserRole('user');
                    }
                    setCurrentUser(user);
                } catch (error) {
                    console.error("Error fetching role:", error);
                    setCurrentUser(user);
                    setUserRole('user');
                }
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
        loading,
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