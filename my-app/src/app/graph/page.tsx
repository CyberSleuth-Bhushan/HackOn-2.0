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

const getNodeColor = (group: string) => {
    switch (group) {
        case 'Professor': return '#ef4444'; // Red
        case 'Student': return '#3b82f6';   // Blue
        case 'Paper':
        case 'Project': return '#10b981';   // Green
        case 'Skill': return '#f59e0b';     // Yellow
        default: return '#94a3b8';          // Slate
    }
};

export default function GraphView() {
    const [graphData, setGraphData] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const [layoutMode, setLayoutMode] = useState<"none" | "td" | "lr" | "radialout">("none");
    const fgRef = useRef<any>(null);

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

                <div className="mt-6 border-t border-white/10 pt-4">
                    <label className="block text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">Graph Layout Strategy</label>
                    <select
                        value={layoutMode}
                        onChange={(e) => setLayoutMode(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
                    >
                        <option value="none">Standard Physics (Scattered Constellation)</option>
                        <option value="td">Top-Down Tree Diagram</option>
                        <option value="lr">Sequential Pathway (Left-Right)</option>
                        <option value="radialout">Radial Outburst</option>
                    </select>
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
                        nodeColor={(node: any) => getNodeColor(node.group)}
                        nodeRelSize={6}
                        nodeCanvasObject={(node: any, ctx: any, globalScale: number) => {
                            // Calculate radius based on val or default
                            const r = node.val ? Math.sqrt(node.val) * 1.5 : 5;

                            // Draw the circle
                            ctx.beginPath();
                            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
                            ctx.fillStyle = getNodeColor(node.group);
                            ctx.fill();

                            // Ensure text is legible by scaling font relative to zoom
                            const fontSize = Math.max(12 / globalScale, 2); // Prevent it from getting too small
                            const label = node.name;

                            // Only draw labels if we have zoomed in enough, to prevent clutter at macro scale
                            if (globalScale > 0.8) {
                                ctx.font = `${fontSize}px Inter, sans-serif`;
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'top';

                                // Draw text background for readability
                                const textWidth = ctx.measureText(label).width;
                                ctx.fillStyle = 'rgba(2, 6, 23, 0.7)'; // slate-950 with opacity
                                ctx.fillRect(node.x - textWidth / 2 - 2, node.y + r + 1, textWidth + 4, fontSize + 2);

                                // Draw Text
                                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                                ctx.fillText(label, node.x, node.y + r + 2);
                            }
                        }}
                        linkColor={() => 'rgba(255,255,255,0.15)'}
                        linkWidth={(link: any) => link.type === 'Lead' ? 3 : 1.5}
                        linkDirectionalArrowLength={3.5}
                        linkDirectionalArrowRelPos={1}
                        linkDirectionalParticles={0} // Disable particles for a cleaner, more structured look
                        backgroundColor="#020617" // slate-950
                        dagMode={layoutMode === "none" ? undefined : layoutMode}
                        dagLevelDistance={layoutMode !== "none" ? 80 : undefined}
                        // @ts-ignore - The types for d3Force are sometimes missing in ForceGraphProps
                        d3Force={(forceName: string, forceFn: any) => {
                            // Heavy tuning of physics to spread the graph out cleanly
                            if (forceName === "charge") {
                                // Default is usually around -30. We want a much stronger repulsion to prevent clutter
                                forceFn.strength(layoutMode === "none" ? -400 : -200);
                            }
                            if (forceName === "link") {
                                // Increase link distance so nodes connected together don't clump
                                forceFn.distance(80);
                            }
                        }}
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
