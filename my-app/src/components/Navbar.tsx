"use client";

import Link from "next/link";
import { useAuth } from "@/lib/firebase/AuthContext";
import { usePathname } from "next/navigation";

export default function Navbar() {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    const getDashboardLink = () => {
        if (!user || !user.role) return "/";
        return `/dashboards/${user.role}`;
    };

    return (
        <nav className="border-b border-white/10 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                            HackOn Engine
                        </Link>

                        {/* Global Navigation Links */}
                        <div className="hidden md:flex items-center space-x-4">
                            <Link href="/search" className={`text-sm font-medium transition-colors ${pathname === '/search' ? 'text-indigo-400' : 'text-slate-300 hover:text-white'}`}>
                                Semantic Search
                            </Link>
                            <Link href="/graph" className={`text-sm font-medium transition-colors ${pathname === '/graph' ? 'text-indigo-400' : 'text-slate-300 hover:text-white'}`}>
                                Network Graph
                            </Link>
                            {user && (
                                <Link
                                    href={getDashboardLink()}
                                    className={`text-sm font-medium transition-colors ${pathname.includes('/dashboards') ? 'text-indigo-400' : 'text-slate-300 hover:text-white'}`}
                                >
                                    My Dashboard
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {user ? (
                            <div className="flex items-center gap-4">
                                <div className="text-right hidden sm:block">
                                    <div className="text-sm font-medium text-white">{user.displayName || user.email}</div>
                                    <div className="text-xs text-indigo-400 capitalize">{user.role}</div>
                                </div>
                                <button
                                    onClick={logout}
                                    className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-700/50 transition-colors"
                                >
                                    Sign Out
                                </button>
                            </div>
                        ) : (
                            <Link
                                href="/login"
                                className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg shadow-lg shadow-indigo-500/25 transition-all"
                            >
                                Sign In
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
