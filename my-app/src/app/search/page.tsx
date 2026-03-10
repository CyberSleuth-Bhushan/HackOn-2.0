"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function SearchResults() {
    const searchParams = useSearchParams();
    const query = searchParams.get("q") || "";
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchResults() {
            if (!query) return;
            setLoading(true);
            try {
                const res = await fetch("/api/search", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query }),
                });
                const data = await res.json();
                if (data.results) {
                    setResults(data.results);
                }
            } catch (e) {
                console.error("Search failed", e);
            } finally {
                setLoading(false);
            }
        }

        fetchResults();
    }, [query]);

    return (
        <div className="min-h-screen bg-slate-950 p-8 sm:p-20 relative text-slate-200">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[128px]"></div>

            <div className="max-w-4xl mx-auto z-10 relative">
                <h1 className="text-3xl font-bold mb-2">Semantic Search Results</h1>
                <p className="text-slate-400 mb-8 border-b border-white/10 pb-6">Querying AI embeddings for: <span className="text-indigo-400 font-medium">"{query}"</span></p>

                {loading ? (
                    <div className="space-y-4 animate-pulse">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-slate-900 h-24 rounded-xl border border-white/5"></div>
                        ))}
                    </div>
                ) : results.length === 0 ? (
                    <div className="text-center py-20 text-slate-500">
                        No matching knowledge nodes found. Try checking your API keys or seeding the database.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {results.map((node, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                key={node.id}
                                className="group p-6 rounded-2xl bg-slate-900 border border-white/5 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all shadow-lg text-left"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h2 className="text-xl font-semibold text-blue-100">{node.name || node.title}</h2>
                                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-medium border border-white/10">{node.type}</span>
                                </div>

                                {node.type === "Professor" && (
                                    <p className="text-sm text-slate-400">Department: {node.department}</p>
                                )}
                                {node.type === "Paper" && (
                                    <p className="text-sm text-slate-400">Published: {node.year}</p>
                                )}

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {(node.expertise || node.keywords || node.interests || []).map((tag: string) => (
                                        <span key={tag} className="text-xs px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
