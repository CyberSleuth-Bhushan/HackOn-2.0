"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/firebase/AuthContext";
import { db } from "@/lib/firebase/firebaseClient";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export interface QueryPost {
    id: string;
    authorId: string;
    authorName: string;
    authorRole: string;
    title: string;
    description: string;
    status: 'open' | 'resolved';
    createdAt: any;
    answerCount?: number;
}

export default function QueriesForum() {
    const { user } = useAuth();
    const [queriesList, setQueriesList] = useState<QueryPost[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state for posting new query
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        // Fetch all queries
        const q = query(collection(db, "queries"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedQueries: QueryPost[] = [];
            snapshot.forEach((doc) => {
                fetchedQueries.push({ id: doc.id, ...doc.data() } as QueryPost);
            });
            setQueriesList(fetchedQueries);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handlePostQuery = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newTitle || !newDescription) return;
        setSubmitting(true);

        try {
            await addDoc(collection(db, "queries"), {
                authorId: user.uid,
                authorName: user.displayName || "Unknown User",
                authorRole: user.role || "student",
                title: newTitle,
                description: newDescription,
                status: 'open',
                createdAt: serverTimestamp(),
                answerCount: 0
            });
            setIsModalOpen(false);
            setNewTitle("");
            setNewDescription("");
        } catch (error) {
            console.error("Error posting query:", error);
            alert("Failed to post query.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-950 text-indigo-400">Loading Community...</div>;

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-slate-950 text-slate-200 p-8 sm:p-20 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[128px]"></div>

                <div className="max-w-5xl mx-auto relative z-10">
                    <div className="flex justify-between items-end mb-12 border-b border-white/10 pb-6">
                        <div>
                            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-2">
                                Community Queries
                            </h1>
                            <p className="text-slate-400">Ask the community for help, collaborate on issues, or share knowledge.</p>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-indigo-500/25"
                        >
                            + Post New Query
                        </button>
                    </div>

                    <div className="space-y-4">
                        {queriesList.length === 0 ? (
                            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-700 text-slate-500">
                                No queries have been posted yet. Be the first to ask!
                            </div>
                        ) : (
                            queriesList.map((q) => (
                                <Link href={`/queries/${q.id}`} key={q.id}>
                                    <div className="p-6 rounded-2xl bg-slate-900 border border-white/5 shadow-xl hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group mb-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-xl font-semibold text-white group-hover:text-indigo-300 transition-colors">
                                                {q.title}
                                            </h3>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${q.status === 'open' ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-slate-400 bg-slate-500/10 border-slate-500/20'}`}>
                                                {q.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-400 line-clamp-2 mb-4">
                                            {q.description}
                                        </p>
                                        <div className="flex items-center justify-between text-xs text-slate-500">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-slate-300">{q.authorName}</span>
                                                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-white/5 uppercase">{q.authorRole}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span>💬 {q.answerCount || 0} answers</span>
                                                <span>{q.createdAt?.toDate().toLocaleDateString() || "Just now"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                {/* New Query Modal */}
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
                                className="relative bg-slate-900 border border-slate-700 p-8 rounded-3xl w-full max-w-2xl shadow-2xl"
                            >
                                <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white">✕</button>

                                <h2 className="text-2xl font-bold text-white mb-6">Ask the Community</h2>

                                <form onSubmit={handlePostQuery} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="Summarize your issue or question..."
                                            value={newTitle}
                                            onChange={(e) => setNewTitle(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                                        <textarea
                                            required
                                            rows={6}
                                            placeholder="Provide details, code snippets, or context so others can help you effectively..."
                                            value={newDescription}
                                            onChange={(e) => setNewDescription(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50 mt-4"
                                    >
                                        {submitting ? 'Posting...' : 'Post Query'}
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
