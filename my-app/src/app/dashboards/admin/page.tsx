"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { auth, db } from "@/lib/firebase/firebaseClient";
import { UserRole } from "@/lib/firebase/AuthContext";
import { collection, getDocs } from "firebase/firestore";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

export default function AdminDashboard() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState<UserRole>("verification_team");

    const [loading, setLoading] = useState(false);
    const [fetchingStats, setFetchingStats] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [roleData, setRoleData] = useState<{ name: string, value: number }[]>([]);
    const [verificationData, setVerificationData] = useState<{ name: string, count: number }[]>([]);

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
    const VERIFICATION_COLORS = {
        'approved': '#10b981',
        'pending': '#f59e0b',
        'rejected': '#ef4444'
    };

    useEffect(() => {
        const fetchSystemStats = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "users"));
                const roleCounts: Record<string, number> = {};
                const verificationCounts: Record<string, number> = {
                    approved: 0,
                    pending: 0,
                    rejected: 0
                };

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    // Process Role
                    const r = data.role || 'unknown';
                    roleCounts[r] = (roleCounts[r] || 0) + 1;

                    // Process Verification
                    const v = data.verificationStatus;
                    if (v) {
                        verificationCounts[v] = (verificationCounts[v] || 0) + 1;
                    }
                });

                const formattedRoleData = Object.keys(roleCounts).map(key => ({
                    name: key.charAt(0).toUpperCase() + key.slice(1),
                    value: roleCounts[key]
                }));

                // Exclude system accounts from verification stats usually, but for now show all
                const formattedVerData = [
                    { name: 'Approved', count: verificationCounts.approved, fill: VERIFICATION_COLORS.approved },
                    { name: 'Pending', count: verificationCounts.pending, fill: VERIFICATION_COLORS.pending },
                    { name: 'Rejected', count: verificationCounts.rejected, fill: VERIFICATION_COLORS.rejected }
                ];

                setRoleData(formattedRoleData);
                setVerificationData(formattedVerData);
            } catch (err) {
                console.error("Error fetching stats:", err);
            } finally {
                setFetchingStats(false);
            }
        };

        fetchSystemStats();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("Not authenticated");

            const token = await currentUser.getIdToken();

            const response = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email, password, displayName: name, role })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create user");
            }

            setSuccess(`User ${email} successfully created with role: ${role}`);
            setEmail("");
            setPassword("");
            setName("");

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <div className="min-h-screen bg-slate-950 text-white p-8 pt-24">
                <div className="max-w-6xl mx-auto space-y-8">

                    <div className="flex justify-between items-end border-b border-white/10 pb-6">
                        <div>
                            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">
                                System Administration
                            </h1>
                            <p className="text-slate-400 mt-2">Manage platform security and verification teams.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Create User Form */}
                        <div className="glass-card p-6 border border-white/10 rounded-2xl bg-slate-900/50 backdrop-blur-sm">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                    </svg>
                                </span>
                                Create Personnel Account
                            </h2>

                            {error && <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">{error}</div>}
                            {success && <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm p-3 rounded-lg">{success}</div>}

                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                                    <input
                                        type="text" required value={name} onChange={e => setName(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                                    <input
                                        type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Temporary Password</label>
                                    <input
                                        type="password" required value={password} onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Assign Role</label>
                                    <select
                                        value={role || "verification_team"} onChange={e => setRole(e.target.value as UserRole)}
                                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                                    >
                                        <option value="verification_team">Verification Team Member</option>
                                        <option value="admin">System Admin</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 mt-4"
                                >
                                    {loading ? "Creating..." : "Create Account"}
                                </button>
                            </form>
                        </div>

                        {/* Quick Stats / Overview Placeholder */}
                        <div className="glass-card p-6 border border-white/10 rounded-2xl bg-slate-900/50 backdrop-blur-sm flex flex-col">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </span>
                                System Overview
                            </h2>
                            <div className="flex-1 flex flex-col gap-8 text-slate-400">
                                {fetchingStats ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                                    </div>
                                ) : (
                                    <>
                                        {/* Status Bar Chart */}
                                        <div className="flex-1 min-h-[200px] flex flex-col items-center">
                                            <h3 className="text-sm font-medium text-slate-300 mb-4 whitespace-nowrap">User Verification Statuses</h3>
                                            <div className="w-full h-full min-h-[160px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={verificationData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                                        <RechartsTooltip
                                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                                                        />
                                                        <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* Roles Pie Chart */}
                                        <div className="flex-1 min-h-[200px] flex flex-col items-center border-t border-slate-800/50 pt-6">
                                            <h3 className="text-sm font-medium text-slate-300 mb-2">Platform Roles Distribution</h3>
                                            <div className="w-full h-full min-h-[160px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={roleData}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={40}
                                                            outerRadius={70}
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                            stroke="transparent"
                                                        >
                                                            {roleData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <RechartsTooltip
                                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff' }}
                                                            itemStyle={{ color: '#fff' }}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="flex flex-wrap justify-center gap-3 mt-2">
                                                {roleData.map((entry, index) => (
                                                    <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                                        {entry.name}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
