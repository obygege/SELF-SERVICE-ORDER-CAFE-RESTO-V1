import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const KitchenBaristaAuthContext = createContext();

export const useKitchenBaristaAuth = () => useContext(KitchenBaristaAuthContext);

export const KitchenBaristaAuthProvider = ({ children }) => {
    const [staffUser, setStaffUser] = useState(null);
    const [staffRole, setStaffRole] = useState(null);
    const [loading, setLoading] = useState(true);

    const loginOp = (email, password) => signInWithEmailAndPassword(auth, email, password);

    const logoutOp = () => {
        setStaffRole(null);
        setStaffUser(null);
        return signOut(auth);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const docRef = doc(db, "users", user.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        const role = data.role;

                        if (role === 'kitchen' || role === 'barista') {
                            setStaffRole(role);
                            setStaffUser({ ...user, ...data });
                        } else {
                            setStaffUser(null);
                            setStaffRole(null);
                        }
                    } else {
                        setStaffUser(null);
                        setStaffRole(null);
                    }
                } catch (error) {
                    setStaffUser(null);
                    setStaffRole(null);
                }
            } else {
                setStaffUser(null);
                setStaffRole(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        staffUser,
        staffRole,
        loading,
        loginOp,
        logoutOp
    };

    return (
        <KitchenBaristaAuthContext.Provider value={value}>
            {!loading && children}
        </KitchenBaristaAuthContext.Provider>
    );
};