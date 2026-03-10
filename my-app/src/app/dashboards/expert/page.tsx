"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/firebase/AuthContext";
import { useState, useEffect } from "react";

export default function ExpertDashboard() {
    const { user } = useAuth();
    const [papers, setPapers] = useState<any[]>([]);

    useEffect(() => {
        if (!user) return;
        // Mock data fetch for Expert dashboard
        const fetchExpertData = () => {
            setTimeout(() => {
                setPapers([
                    { id: 1, title: "Deep Learning for Medical Imaging", citations: 1240, year: 2024 },
                    { id: 2, title: "Attention Mechanisms in NLP", citations: 850, year: 2023 }
                ])
            }, 600);
        };
        fetchExpertData();
    }, [user]);

    return (
        <ProtectedRoute allowedRoles={["expert"]}>
            <div className="min-h-screen p-8">
                <header className="mb-12">
                    <h1 className="text-3xl font-bold text-white mb-2">Faculty & Expert Portal</h1>
                    <p className="text-slate-400">Welcome, Professor {user?.displayName || "Stranger"}.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Authored Papers */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-slate-200">Recent Publications</h2>
                            <button className="text-sm font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-4 py-1.5 rounded-full transition-colors border border-emerald-500/20">
                                + Submit New Paper
                            </button>
                        </div>

                        <div className="grid gap-4">
                            {papers.map((paper) => (
                                <div key={paper.id} className="glass-card p-6 rounded-xl border border-white/10 hover:border-white/20 transition-colors">
                                    <h3 className="font-medium text-white text-lg mb-2">{paper.title}</h3>
                                    <div className="flex gap-4 text-sm text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                            </svg>
                                            {paper.citations} Citations
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                <line x1="16" y1="2" x2="16" y2="6" />
                                                <line x1="8" y1="2" x2="8" y2="6" />
                                                <line x1="3" y1="10" x2="21" y2="10" />
                                            </svg>
                                            {paper.year}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Labs & Grants */}
                    <div className="space-y-6">
                        <div className="glass-card p-6 rounded-xl border border-white/10">
                            <h3 className="font-semibold text-slate-200 mb-4">Active Grants</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="text-sm text-slate-400 mb-1">National Science Foundation (Active)</div>
                                    <div className="text-xl font-bold text-emerald-400">$2.4M</div>
                                    <div className="text-xs text-slate-500 mt-1">Smart Crop Monitoring Robotics</div>
                                </div>
                                <div className="h-px w-full bg-slate-800 my-4" />
                                <div>
                                    <div className="text-sm text-slate-400 mb-1">Dept of Defense Tech Grant (Pending)</div>
                                    <div className="text-xl font-bold text-emerald-400/50">$850K</div>
                                    <div className="text-xs text-slate-500 mt-1">Autonomous Swarm Algorithms</div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-6 rounded-xl border border-blue-500/20 bg-blue-500/5">
                            <h3 className="font-semibold text-blue-300 mb-2">Mentorship Requests</h3>
                            <p className="text-sm text-slate-400 mb-4">2 students have requested to join your lab through the semantic matching engine.</p>
                            <button className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg border border-blue-500/30 transition-colors text-sm font-medium">
                                Review Profiles
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
