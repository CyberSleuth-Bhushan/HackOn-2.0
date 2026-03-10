"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/firebase/AuthContext";
import { db } from "@/lib/firebase/firebaseClient";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, orderBy, onSnapshot } from "firebase/firestore";
import ProtectedRoute from "@/components/ProtectedRoute";
import { motion, AnimatePresence } from "framer-motion";

interface Proposal {
    id: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    receiverId: string;
    receiverName: string;
    topic: string;
    message: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: any;
}

interface UserData {
    id: string;
    name: string;
    role: string;
}

export default function ProposalsPage() {
    const { user } = useAuth();
    const [incomingProposals, setIncomingProposals] = useState<Proposal[]>([]);
    const [outgoingProposals, setOutgoingProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<UserData[]>([]);
    const [selectedReceiver, setSelectedReceiver] = useState("");
    const [newTopic, setNewTopic] = useState("");
    const [newMessage, setNewMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!user) return;

        // Fetch Users for the Dropdown
        const fetchUsers = async () => {
            try {
                const usersRef = collection(db, "users");
                // Don't show current user in the 'To' dropdown
                // Firebase '!=' queries are tricky, so we fetch all and filter client-side
                const q = query(usersRef, where("verificationStatus", "==", "approved"));
                const snapshot = await getDocs(q);
                let usersList: UserData[] = [];
                snapshot.forEach(doc => {
                    if (doc.id !== user.uid) {
                        usersList.push({ id: doc.id, name: doc.data().name || "Unknown", role: doc.data().role || "student" });
                    }
                });
                setAvailableUsers(usersList);
            } catch (error) {
                console.error("Error fetching users:", error);
            }
        };

        fetchUsers();

        // Listen for Incoming Proposals
        const incomingQuery = query(collection(db, "proposals"), where("receiverId", "==", user.uid));
        const unsubscribeIncoming = onSnapshot(incomingQuery, (snapshot) => {
            const proposals: Proposal[] = [];
            snapshot.forEach((doc) => proposals.push({ id: doc.id, ...doc.data() } as Proposal));
            // Sort client-side due to missing index
            proposals.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setIncomingProposals(proposals);
        });

        // Listen for Outgoing Proposals
        const outgoingQuery = query(collection(db, "proposals"), where("senderId", "==", user.uid));
        const unsubscribeOutgoing = onSnapshot(outgoingQuery, (snapshot) => {
            const proposals: Proposal[] = [];
            snapshot.forEach((doc) => proposals.push({ id: doc.id, ...doc.data() } as Proposal));
            proposals.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setOutgoingProposals(proposals);
            setLoading(false);
        });

        return () => {
            unsubscribeIncoming();
            unsubscribeOutgoing();
        };
    }, [user]);

    const handleSendProposal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !selectedReceiver || !newTopic || !newMessage) return;
        setSubmitting(true);

        try {
            const receiver = availableUsers.find(u => u.id === selectedReceiver);
            await addDoc(collection(db, "proposals"), {
                senderId: user.uid,
                senderName: user.displayName || "Anonymous",
                senderRole: user.role || "student",
                receiverId: selectedReceiver,
                receiverName: receiver?.name || "Unknown",
                topic: newTopic,
                message: newMessage,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            setIsModalOpen(false);
            setNewTopic("");
            setNewMessage("");
            setSelectedReceiver("");
        } catch (error) {
            console.error("Error sending proposal:", error);
            alert("Failed to send proposal. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateStatus = async (proposalId: string, newStatus: 'accepted' | 'rejected') => {
        try {
            await updateDoc(doc(db, "proposals", proposalId), {
                status: newStatus
            });
        } catch (error) {
            console.error("Error updating proposal:", error);
            alert("Failed to update proposal status.");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'accepted': return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'rejected': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-950 text-indigo-400">Loading Proposals...</div>;

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-slate-950 text-slate-200 p-8 sm:p-20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[128px]"></div>

                <div className="max-w-6xl mx-auto relative z-10">
                    <div className="flex justify-between items-end mb-12 border-b border-white/10 pb-6">
                        <div>
                            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-2">
                                Collaborative Proposals
                            </h1>
                            <p className="text-slate-400">Manage incoming requests and out-reach for academic collaboration.</p>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-indigo-500/25"
                        >
                            + New Proposal
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Inbox */}
                        <div>
                            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                                <span>📥</span> Incoming Requests
                            </h2>
                            <div className="space-y-4">
                                {incomingProposals.length === 0 ? (
                                    <div className="p-8 text-center rounded-2xl border border-dashed border-slate-700 text-slate-500">
                                        No incoming proposals found.
                                    </div>
                                ) : (
                                    incomingProposals.map(proposal => (
                                        <div key={proposal.id} className="p-6 rounded-2xl bg-slate-900 border border-white/5 shadow-xl relative overflow-hidden group">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-white">{proposal.topic}</h3>
                                                    <p className="text-sm text-slate-400 mt-1">
                                                        From: <span className="text-indigo-300 font-medium">{proposal.senderName}</span>
                                                        <span className="ml-2 px-2 py-0.5 rounded text-[10px] uppercase bg-slate-800 border border-slate-700">{proposal.senderRole}</span>
                                                    </p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(proposal.status)} uppercase tracking-wider`}>
                                                    {proposal.status}
                                                </span>
                                            </div>
                                            <div className="p-4 rounded-xl bg-slate-950/50 border border-white/5 text-sm text-slate-300 italic mb-4">
                                                "{proposal.message}"
                                            </div>

                                            {proposal.status === 'pending' && (
                                                <div className="flex gap-3 pt-2">
                                                    <button onClick={() => handleUpdateStatus(proposal.id, 'accepted')} className="flex-1 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-sm font-medium transition-colors border border-green-500/30">
                                                        Accept Collaboration
                                                    </button>
                                                    <button onClick={() => handleUpdateStatus(proposal.id, 'rejected')} className="flex-1 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm font-medium transition-colors border border-red-500/30">
                                                        Decline
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Outbox */}
                        <div>
                            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                                <span>📤</span> Sent Proposals
                            </h2>
                            <div className="space-y-4">
                                {outgoingProposals.length === 0 ? (
                                    <div className="p-8 text-center rounded-2xl border border-dashed border-slate-700 text-slate-500">
                                        You haven't sent any proposals yet.
                                    </div>
                                ) : (
                                    outgoingProposals.map(proposal => (
                                        <div key={proposal.id} className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 shadow-xl">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-slate-200">{proposal.topic}</h3>
                                                    <p className="text-sm text-slate-400 mt-1">
                                                        Sent to: <span className="text-blue-300 font-medium">{proposal.receiverName}</span>
                                                    </p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(proposal.status)} uppercase tracking-wider`}>
                                                    {proposal.status}
                                                </span>
                                            </div>
                                            <div className="text-sm text-slate-400 truncate">
                                                {proposal.message}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* New Proposal Modal */}
                <AnimatePresence>
                    {isModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                                onClick={() => setIsModalOpen(false)}
                            />

                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative bg-slate-900 border border-slate-700 p-8 rounded-3xl w-full max-w-lg shadow-2xl"
                            >
                                <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white">✕</button>

                                <h2 className="text-2xl font-bold text-white mb-6">Initiate Collaboration</h2>

                                <form onSubmit={handleSendProposal} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Select recipient</label>
                                        <select
                                            required
                                            value={selectedReceiver}
                                            onChange={(e) => setSelectedReceiver(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                        >
                                            <option value="" disabled>Choose a user...</option>
                                            {availableUsers.map(u => (
                                                <option key={u.id} value={u.id}>{u.name} ({u.role.toUpperCase()})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Topic / Project Title</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="e.g. Joint Research on AI in Healthcare"
                                            value={newTopic}
                                            onChange={(e) => setNewTopic(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Proposal Details</label>
                                        <textarea
                                            required
                                            rows={4}
                                            placeholder="Explain why you want to collaborate and what value you bring..."
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting || availableUsers.length === 0}
                                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                                    >
                                        {submitting ? 'Sending...' : 'Send Proposal'}
                                    </button>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </ProtectedRoute>
    );
}
