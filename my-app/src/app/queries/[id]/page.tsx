"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/firebase/AuthContext";
import { db } from "@/lib/firebase/firebaseClient";
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, increment } from "firebase/firestore";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useParams, useRouter } from "next/navigation";
import { QueryPost } from "../page";
import Link from "next/link";

interface Answer {
    id: string;
    authorId: string;
    authorName: string;
    authorRole: string;
    content: string;
    isAccepted: boolean;
    createdAt: any;
}

export default function QueryThread() {
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();
    const queryId = params.id as string;

    const [queryPost, setQueryPost] = useState<QueryPost | null>(null);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [loading, setLoading] = useState(true);
    const [newAnswer, setNewAnswer] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!queryId) return;

        // Fetch original query details
        const fetchQuery = async () => {
            try {
                const docRef = doc(db, "queries", queryId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setQueryPost({ id: docSnap.id, ...docSnap.data() } as QueryPost);
                } else {
                    router.push('/queries');
                }
            } catch (e) {
                console.error("Error fetching query:", e);
            }
        };

        fetchQuery();

        // Listen for answers
        const answersRef = collection(db, "queries", queryId, "answers");
        const q = query(answersRef, orderBy("createdAt", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedAnswers: Answer[] = [];
            snapshot.forEach((doc) => {
                fetchedAnswers.push({ id: doc.id, ...doc.data() } as Answer);
            });
            setAnswers(fetchedAnswers);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [queryId, router]);

    const handlePostAnswer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newAnswer.trim()) return;
        setSubmitting(true);

        try {
            const answersRef = collection(db, "queries", queryId, "answers");
            await addDoc(answersRef, {
                authorId: user.uid,
                authorName: user.displayName || "Unknown User",
                authorRole: user.role || "student",
                content: newAnswer,
                isAccepted: false,
                createdAt: serverTimestamp()
            });

            // Increment the answer count on the parent query document
            const queryRef = doc(db, "queries", queryId);
            await updateDoc(queryRef, {
                answerCount: increment(1)
            });

            setNewAnswer("");
        } catch (error) {
            console.error("Error posting answer:", error);
            alert("Failed to post answer.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleAcceptAnswer = async (answerId: string) => {
        // Only the original author can mark an answer as accepted
        if (!user || user.uid !== queryPost?.authorId) return;

        try {
            const answerRef = doc(db, "queries", queryId, "answers", answerId);
            await updateDoc(answerRef, {
                isAccepted: true
            });

            const queryRef = doc(db, "queries", queryId);
            await updateDoc(queryRef, {
                status: 'resolved'
            });

            // Update local state temporarily to feel instant
            setQueryPost(prev => prev ? { ...prev, status: 'resolved' } : null);
        } catch (error) {
            console.error("Error accepting answer:", error);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-950 text-indigo-400">Loading Thread...</div>;
    if (!queryPost) return null;

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-slate-950 text-slate-200 p-6 sm:p-12 relative overflow-hidden">
                <div className="max-w-4xl mx-auto relative z-10">
                    <Link href="/queries" className="text-sm font-medium text-slate-400 hover:text-indigo-400 flex items-center gap-2 mb-8 transition-colors w-max">
                        ← Back to Forum
                    </Link>

                    {/* Original Query */}
                    <div className="p-8 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl relative overflow-hidden mb-12">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]"></div>

                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-2">{queryPost.title}</h1>
                                <div className="flex items-center gap-3 text-sm text-slate-400">
                                    <span className="text-slate-300 font-medium">Asked by {queryPost.authorName}</span>
                                    <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 uppercase text-[10px]">{queryPost.authorRole}</span>
                                    <span>•</span>
                                    <span>{queryPost.createdAt?.toDate().toLocaleDateString() || "Recently"}</span>
                                </div>
                            </div>
                            <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${queryPost.status === 'open' ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-slate-400 bg-slate-500/10 border-slate-500/20'}`}>
                                {queryPost.status}
                            </span>
                        </div>

                        <div className="text-slate-300 leading-relaxed whitespace-pre-wrap relative z-10 text-lg">
                            {queryPost.description}
                        </div>
                    </div>

                    {/* Answers Section */}
                    <div className="mb-12">
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                            <span>💬</span> {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
                        </h2>

                        <div className="space-y-6">
                            {answers.map(ans => (
                                <div key={ans.id} className={`p-6 rounded-2xl border ${ans.isAccepted ? 'bg-indigo-950/20 border-indigo-500/30 shadow-indigo-500/10 shadow-lg' : 'bg-slate-900/50 border-white/5'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-indigo-400 border border-slate-700">
                                                {ans.authorName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-slate-200">{ans.authorName}</span>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded uppercase bg-slate-800 border border-slate-700 text-slate-400">{ans.authorRole}</span>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5">{ans.createdAt?.toDate().toLocaleString() || "Just now"}</div>
                                            </div>
                                        </div>
                                        {ans.isAccepted && (
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                                                ✅ Accepted Solution
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-slate-300 whitespace-pre-wrap ml-11">
                                        {ans.content}
                                    </div>

                                    {/* Action to Accept Answer */}
                                    {user?.uid === queryPost.authorId && queryPost.status === 'open' && !ans.isAccepted && (
                                        <div className="mt-4 ml-11">
                                            <button
                                                onClick={() => handleAcceptAnswer(ans.id)}
                                                className="text-xs font-medium text-slate-400 hover:text-green-400 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-green-500/50 hover:bg-green-500/10 transition-colors"
                                            >
                                                Mark as Accepted Solution
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Post Answer Form */}
                    {queryPost.status === 'open' ? (
                        <div className="p-6 rounded-3xl bg-slate-900 border border-white/5">
                            <h3 className="text-lg font-semibold mb-4 text-slate-200">Submit an Answer</h3>
                            <form onSubmit={handlePostAnswer}>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="Type your solution, suggestion, or follow-up question here..."
                                    value={newAnswer}
                                    onChange={(e) => setNewAnswer(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y mb-4"
                                />
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                                    >
                                        {submitting ? 'Posting...' : 'Post Answer'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className="p-6 text-center rounded-2xl bg-slate-900 border border-white/5 text-slate-400">
                            This query has been resolved and is closed to new answers.
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
