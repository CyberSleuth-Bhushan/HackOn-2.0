"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebaseClient";

// Define the roles available in our system
export type UserRole = "student" | "expert" | "institute" | "researcher" | "admin" | "verification_team" | null;

interface UserProfile {
    uid: string;
    email: string | null;
    role: UserRole;
    displayName: string | null;
    profileCompleted?: boolean;
    verificationStatus?: 'pending' | 'approved' | 'rejected' | null;
}

interface AuthContextType {
    user: UserProfile | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
            if (firebaseUser) {
                // Determine user role from our custom Firestore 'users' collection
                const userDocRef = doc(db, "users", firebaseUser.uid);
                const userDoc = await getDoc(userDocRef);

                let role: UserRole = null;
                let profileCompleted = false;
                let verificationStatus = null;

                if (userDoc.exists()) {
                    const data = userDoc.data();
                    role = data.role as UserRole;
                    profileCompleted = data.profileCompleted || false;
                    verificationStatus = data.verificationStatus || null;
                } else {
                    // This is a brand new user (e.g. via direct Google Sign-in)
                    // We assign them a default role and create their profile in the DB.
                    role = "student"; // Default role
                    try {
                        await setDoc(userDocRef, {
                            email: firebaseUser.email,
                            role: role,
                            displayName: firebaseUser.displayName,
                            profileCompleted: false,
                            createdAt: new Date()
                        });
                    } catch (e) {
                        console.error("Error creating default user profile", e)
                    }
                }

                setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    role,
                    profileCompleted,
                    verificationStatus,
                });
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        // Cleanup subscription
        return () => unsubscribe();
    }, []);

    const logout = async () => {
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
