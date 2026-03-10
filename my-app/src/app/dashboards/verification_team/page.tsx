"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { db } from "@/lib/firebase/firebaseClient";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

interface PendingUser {
    id: string;
    email: string;
    displayName: string;
    role: string;
    proofUrl: string;
    createdAt?: any;
}

export default function VerificationTeamDashboard() {
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [rejectionReasons, setRejectionReasons] = useState<{ [key: string]: string }>({});
    const [showRejectionInput, setShowRejectionInput] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"users" | "posts">("users");

    const fetchPendingUsers = async () => {
        setLoading(true);
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("verificationStatus", "==", "pending"));
            const querySnapshot = await getDocs(q);

            const users: PendingUser[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                users.push({
                    id: doc.id,
                    email: data.email,
                    displayName: data.displayName || "Unknown",
                    role: data.role,
                    proofUrl: data.proofUrl,
                    createdAt: data.createdAt,
                });
            });

            setPendingUsers(users);
        } catch (error) {
            console.error("Error fetching pending users:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingUsers();
    }, []);

    const handleVerificationAction = async (userId: string, status: 'approved' | 'rejected') => {
        if (status === 'rejected' && showRejectionInput !== userId) {
            // First click: show the input field
            setShowRejectionInput(userId);
            return;
        }

        const reason = rejectionReasons[userId];
        if (status === 'rejected' && (!reason || reason.trim() === '')) {
            alert("A reason for rejection is required.");
            return;
        }

        setActionLoading(userId);
        try {
            const userRef = doc(db, "users", userId);

            const updatePayload: any = {
                verificationStatus: status,
                verifiedAt: new Date()
            };

            if (status === 'rejected') {
                updatePayload.rejectionReason = reason.trim();
            }

            await updateDoc(userRef, updatePayload);

            // Remove user from the local state list immediately
            setPendingUsers(prev => prev.filter(user => user.id !== userId));
        } catch (error) {
            console.error(`Error marking user as ${status}:`, error);
            alert("An error occurred while updating the user status.");
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <ProtectedRoute allowedRoles={["verification_team", "admin"]}>
            <div className="min-h-screen bg-slate-950 text-white p-8 pt-24">
                <div className="max-w-7xl mx-auto space-y-8">

                    <div className="flex justify-between items-end border-b border-white/10 pb-6">
                        <div>
                            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                                Verification Hub
                            </h1>
                            <p className="text-slate-400 mt-2">Review pending profiles and ensure platform integrity.</p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-4 border-b border-white/10 mb-8">
                        <button
                            className={`pb-4 px-2 font-medium transition-colors border-b-2 ${activeTab === 'users' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                            onClick={() => setActiveTab('users')}
                        >
                            Pending User Profiles
                            <span className="ml-2 bg-indigo-500/20 text-indigo-400 py-0.5 px-2 rounded-full text-xs">
                                {pendingUsers.length}
                            </span>
                        </button>
                        <button
                            className={`pb-4 px-2 font-medium transition-colors border-b-2 ${activeTab === 'posts' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                            onClick={() => setActiveTab('posts')}
                        >
                            Reported Posts
                        </button>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'users' && (
                        <div>
                            {loading ? (
                                <div className="text-center py-12 text-slate-400">
                                    <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
                                    Loading pending requests...
                                </div>
                            ) : pendingUsers.length === 0 ? (
                                <div className="glass-card text-center py-16 border border-white/10 rounded-2xl bg-slate-900/50 backdrop-blur-sm">
                                    <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
                                    <p className="text-slate-400">There are no pending user profile verifications right now.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {pendingUsers.map(user => (
                                        <div key={user.id} className="glass-card p-6 border border-white/10 rounded-2xl bg-slate-900/50 backdrop-blur-sm flex flex-col hover:border-indigo-500/30 transition-colors group">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="font-semibold text-lg truncate">{user.displayName}</h3>
                                                    <p className="text-sm text-slate-400 truncate">{user.email}</p>
                                                    <span className="inline-block mt-2 text-xs font-medium px-2 py-1 bg-slate-800 rounded-md border border-slate-700 capitalize">
                                                        Role: {user.role}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-4 mb-6 flex-1 flex flex-col justify-end">
                                                <a
                                                    href={user.proofUrl}
                                                    download={`proof_${user.displayName.split(' ').join('_')}`}
                                                    className="flex items-center justify-center gap-2 p-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg text-sm text-indigo-300 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                    Download Uploaded Proof
                                                </a>
                                            </div>

                                            <div className="flex flex-col gap-3 mt-auto">
                                                {showRejectionInput === user.id && (
                                                    <div className="space-y-2">
                                                        <label className="text-xs text-slate-400">Reason for Rejection (Visible to User/Admin):</label>
                                                        <textarea
                                                            value={rejectionReasons[user.id] || ''}
                                                            onChange={(e) => setRejectionReasons(prev => ({ ...prev, [user.id]: e.target.value }))}
                                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 resize-none h-16"
                                                            placeholder="e.g., Proof document is blurry..."
                                                        />
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        onClick={() => {
                                                            if (showRejectionInput === user.id) {
                                                                setShowRejectionInput(null); // Cancel rejection
                                                            } else {
                                                                handleVerificationAction(user.id, 'rejected'); // Show input
                                                            }
                                                        }}
                                                        disabled={actionLoading === user.id}
                                                        className="py-2 px-4 rounded-lg text-sm font-medium border border-slate-600 hover:border-slate-500 hover:bg-slate-800 text-slate-300 transition-colors disabled:opacity-50"
                                                    >
                                                        {showRejectionInput === user.id ? 'Cancel' : 'Reject'}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (showRejectionInput === user.id) {
                                                                handleVerificationAction(user.id, 'rejected'); // Submit rejection
                                                            } else {
                                                                handleVerificationAction(user.id, 'approved'); // Direct approve
                                                            }
                                                        }}
                                                        disabled={actionLoading === user.id}
                                                        className={`py-2 px-4 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${showRejectionInput === user.id ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'
                                                            }`}
                                                    >
                                                        {actionLoading === user.id ? '...' : showRejectionInput === user.id ? 'Confirm Reject' : 'Approve'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'posts' && (
                        <div className="glass-card text-center py-16 border border-white/10 rounded-2xl bg-slate-900/50 backdrop-blur-sm">
                            <h3 className="text-xl font-semibold mb-2">Content Moderation</h3>
                            <p className="text-slate-400">Post reporting and moderation interface infrastructure is under construction.</p>
                        </div>
                    )}

                </div>
            </div>
        </ProtectedRoute>
    );
}
