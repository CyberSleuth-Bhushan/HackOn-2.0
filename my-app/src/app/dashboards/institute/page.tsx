"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/firebase/AuthContext";
import { useState, useEffect } from "react";

export default function InstituteDashboard() {
    const { user } = useAuth();

    // Mock metrics
    const [metrics, setMetrics] = useState({
        activeGrants: "$12.4M",
        totalPublications: 452,
        activeResearchers: 128,
        crossdepartmentConnections: 86
    });

    return (
        <ProtectedRoute allowedRoles={["institute"]}>
            <div className="min-h-screen p-8">
                <header className="mb-12 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Institutional Intelligence</h1>
                        <p className="text-slate-400">Welcome, Administrator {user?.displayName}. Real-time analytics view.</p>
                    </div>
                    <button className="px-5 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 hover:bg-slate-700 transition">
                        Export Report
                    </button>
                </header>

                {/* Top Level Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="glass-card p-6 rounded-xl border border-white/10">
                        <div className="text-sm font-medium text-slate-400 mb-1">Active Grant Funding</div>
                        <div className="text-3xl font-bold text-emerald-400">{metrics.activeGrants}</div>
                        <div className="text-xs text-emerald-500 mt-2 flex items-center gap-1">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                            +14% from Q1
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-xl border border-white/10">
                        <div className="text-sm font-medium text-slate-400 mb-1">Total Publications (YTD)</div>
                        <div className="text-3xl font-bold text-white">{metrics.totalPublications}</div>
                    </div>

                    <div className="glass-card p-6 rounded-xl border border-white/10">
                        <div className="text-sm font-medium text-slate-400 mb-1">Active Researchers</div>
                        <div className="text-3xl font-bold text-blue-400">{metrics.activeResearchers}</div>
                    </div>

                    <div className="glass-card p-6 rounded-xl border border-indigo-500/30 bg-indigo-500/5">
                        <div className="text-sm font-medium text-indigo-300 mb-1">Cross-Dept Collaborations</div>
                        <div className="text-3xl font-bold text-indigo-400">{metrics.crossdepartmentConnections}</div>
                        <div className="text-xs text-indigo-300/70 mt-2">Driven by semantic match engine</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="glass-card p-6 rounded-xl border border-white/10 min-h-[400px] flex flex-col">
                        <h3 className="text-lg font-semibold text-white mb-4">Departmental Connections</h3>
                        <div className="flex-1 flex items-center justify-center border border-dashed border-slate-700 rounded-lg">
                            <span className="text-slate-500 text-sm">Interactive Graph View Placeholder</span>
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-xl border border-white/10 min-h-[400px] flex flex-col">
                        <h3 className="text-lg font-semibold text-white mb-4">Recent AI Search Trends</h3>
                        <div className="flex-1 space-y-4">
                            {[
                                { query: "Quantum computing in cryptography", frequency: "High" },
                                { query: "CRISPR gene editing ethics", frequency: "Medium" },
                                { query: "LLM Hallucination mitigation", frequency: "High" },
                                { query: "Renewable energy drone automation", frequency: "Low" }
                            ].map((trend, i) => (
                                <div key={i} className="flex justify-between items-center p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                                    <span className="text-slate-300 font-medium">{trend.query}</span>
                                    <span className={`text-xs px-2 py-1 rounded border ${trend.frequency === 'High' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' :
                                            trend.frequency === 'Medium' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                                                'text-slate-400 border-slate-700 bg-slate-800/50'
                                        }`}>{trend.frequency}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
