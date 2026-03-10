"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function Home() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 relative overflow-hidden">
      {/* Abstract Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[128px]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px]"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 text-center max-w-3xl"
      >
        <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium tracking-wide">
          Knowledge Engine v1.0
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-100 to-indigo-200">
          Institutional Knowledge<br />Intelligence Graph
        </h1>

        <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Discover experts, explore research trends, and find your next collaborator using AI-powered semantic search and graph analytics.
        </p>

        <form onSubmit={handleSearch} className="relative max-w-xl mx-auto group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative flex items-center bg-slate-900 ring-1 ring-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <span className="pl-6 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find researchers working on AI for healthcare..."
              className="w-full bg-transparent px-4 py-5 text-slate-200 placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              className="mx-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors"
            >
              Search
            </button>
          </div>
        </form>

        <div className="mt-16 flex flex-wrap justify-center gap-4 text-sm text-slate-400">
          <span className="px-4 py-2 rounded-full border border-slate-800 bg-slate-900/50 hover:border-slate-700 cursor-pointer transition-colors" onClick={() => setQuery("Quantum Machine Learning")}>Quantum ML</span>
          <span className="px-4 py-2 rounded-full border border-slate-800 bg-slate-900/50 hover:border-slate-700 cursor-pointer transition-colors" onClick={() => setQuery("Robotics for Agriculture")}>Agri-Robotics</span>
          <span className="px-4 py-2 rounded-full border border-slate-800 bg-slate-900/50 hover:border-slate-700 cursor-pointer transition-colors" onClick={() => setQuery("Medical Imaging")}>Medical Imaging</span>
        </div>

        <div className="mt-8">
          <button onClick={() => router.push('/graph')} className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2 mx-auto text-sm">
            View Global Knowledge Graph <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
          </button>
        </div>
      </motion.div>
    </main>
  );
}
