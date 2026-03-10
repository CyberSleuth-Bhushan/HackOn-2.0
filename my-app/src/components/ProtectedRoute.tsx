"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth, UserRole } from "@/lib/firebase/AuthContext";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                // Not logged in, redirect to login
                router.push("/login");
            } else if (allowedRoles && !allowedRoles.includes(user.role)) {
                // Logged in but doesn't have the right role
                router.push("/"); // Or an unauthorized page
            }
        }
    }, [user, loading, router, allowedRoles]);

    // Show a loading state while checking authentication
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        );
    }

    // Only render children if user is authenticated and has the correct role (if restricted)
    if (!user || (allowedRoles && !allowedRoles.includes(user.role))) {
        return null; // Will redirect in useEffect
    }

    // Pass the authorization check! Render the protected view.
    return <>{children}</>;
}
