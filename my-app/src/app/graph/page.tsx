"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import { motion } from "framer-motion";

// Dynamically import to avoid SSR issues with canvas
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
    ssr: false,
});

export default function GraphView() {
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const fgRef = useRef();

    useEffect(() => {
        async function fetchGraph() {
            try {
                // Fetch Nodes
                const nodesSnapshot = await getDocs(collection(db, "nodes"));
                const nodes = nodesSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    name: doc.data().name || doc.data().title || doc.data().id,
                    group: doc.data().type,
                    val: doc.data().type === "Professor" ? 20 : 10,
                }));

                // Fetch Edges
                const edgesSnapshot = await getDocs(collection(db, "edges"));
                const links = edgesSnapshot.docs.map((doc) => ({
                    source: doc.data().source,
                    target: doc.data().target,
                    type: doc.data().type,
                }));

                setGraphData({ nodes, links });
            } catch (e) {
                console.error("Error fetching graph data:", e);
            } finally {
                setLoading(false);
            }
        }

        fetchGraph();
    }, []);

    return (
        <div className="h-screen w-full bg-slate-950 relative overflow-hidden">
            <div className="absolute top-6 left-6 z-10 p-6 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-2xl max-w-sm">
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-400 mb-2">Network Topology</h1>
                <p className="text-sm text-slate-400 mb-4">
                    Interactive 2D visualization of the institutional knowledge graph. Nodes represent Entities (People, Papers) and edges represent Relationships.
                </p>

                <div className="space-y-2 text-xs font-medium">
                    <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-[#ef4444]"></div> Professor</div>
                    <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div> Student</div>
                    <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-[#10b981]"></div> Paper / Project</div>
                    <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div> Skill</div>
                </div>

                <button
                    onClick={() => window.location.href = "/"}
                    className="mt-6 px-4 py-2 w-full text-center bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded-lg text-sm transition-colors border border-indigo-500/30"
                >
                    Back to Dashboard
                </button>
            </div>

            {loading ? (
                <div className="absolute inset-0 flex items-center justify-center text-indigo-400 animate-pulse">
                    Loading Knowledge Graph...
                </div>
            ) : graphData.nodes.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500 flex-col gap-4">
                    <div>No graph data found.</div>
                    <p className="text-sm">Please make sure you have run the `seed-database.js` script and provided Firebase Keys.</p>
                </div>
            ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} className="h-full w-full cursor-grab active:cursor-grabbing">
                    <ForceGraph2D
                        ref={fgRef}
                        graphData={graphData}
                        nodeLabel="name"
                        nodeColor={(node: any) => {
                            switch (node.group) {
                                case 'Professor': return '#ef4444'; // Red
                                case 'Student': return '#3b82f6';   // Blue
                                case 'Paper':
                                case 'Project': return '#10b981';   // Green
                                case 'Skill': return '#f59e0b';     // Yellow
                                default: return '#94a3b8';          // Slate
                            }
                        }}
                        nodeRelSize={6}
                        linkColor={() => 'rgba(255,255,255,0.1)'}
                        linkWidth={1.5}
                        linkDirectionalParticles={2}
                        linkDirectionalParticleSpeed={0.01}
                        backgroundColor="#020617" // slate-950
                        onNodeClick={(node: any) => {
                            // Optional: Centralize on node
                            const fg = fgRef.current;
                            if (fg) {
                                fg.centerAt(node.x, node.y, 1000);
                                fg.zoom(4, 2000);
                            }
                        }}
                    />
                </motion.div>
            )}
        </div>
    );
}
