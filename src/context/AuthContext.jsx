import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, signInWithPopup, createUserWithEmailAndPassword, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

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
                } catch (e) {
                    console.error("Error fetching user role", e);
                    setUserRole('user');
                }
                setCurrentUser(user);
            } else {
                setCurrentUser(null);
                setUserRole(null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const loginEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);

    const registerEmail = (email, password) => createUserWithEmailAndPassword(auth, email, password);

    const loginGoogle = () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        return signInWithPopup(auth, provider);
    };

    const logout = () => signOut(auth);

    return (
        <AuthContext.Provider value={{ currentUser, userRole, loading, loginEmail, registerEmail, loginGoogle, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};