import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/firebaseAdmin";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
        }

        if (!adminDb) {
            return NextResponse.json(
                { error: "Firebase Admin is not configured. Add API keys." },
                { status: 500 }
            );
        }

        // 1. Find all edges connected to the user
        // In a real scenario, this would be a deep Graph Traversal algorithm (like Neo4j Cypher: 
        // MATCH (u:Person {id:$userId})-[:WORKS_ON]->(p:Project)<-[:WORKS_ON]-(c:Person) RETURN c)
        // Here we simulate it with two-hops in Firestore.
        const userEdgesRef = adminDb.collection("edges").where("source", "==", userId);
        const userEdgesSnapshot = await userEdgesRef.get();

        if (userEdgesSnapshot.empty) {
            return NextResponse.json({ recommendations: [] });
        }

        // Example logic: Find projects/papers the user worked on.
        const connectedEntities = new Set<string>();
        userEdgesSnapshot.forEach((doc) => {
            const data = doc.data();
            connectedEntities.add(data.target);
        });

        if (connectedEntities.size === 0) {
            return NextResponse.json({ recommendations: [] });
        }

        // 2. Find WHO ELSE is connected to those entities
        // To find collaborators via shared papers/projects
        const candidates = new Set<string>();
        const entityBatches = Array.from(connectedEntities); // assuming small for mock

        // Firestore `in` query limit is 10
        const chunks = [];
        for (let i = 0; i < entityBatches.length; i += 10) {
            chunks.push(entityBatches.slice(i, i + 10));
        }

        for (const chunk of chunks) {
            const otherEdgesRef = adminDb.collection("edges").where("target", "in", chunk);
            const snapshot = await otherEdgesRef.get();
            snapshot.forEach((doc) => {
                const data = doc.data();
                // Don't recommend themselves
                if (data.source !== userId) {
                    candidates.add(data.source);
                }
            });
        }

        if (candidates.size === 0) {
            return NextResponse.json({ recommendations: [] });
        }

        // 3. Hydrate Candidate Data
        const candidateArray = Array.from(candidates);
        const candidateChunks = [];
        for (let i = 0; i < candidateArray.length; i += 10) {
            candidateChunks.push(candidateArray.slice(i, i + 10));
        }

        let hydratedRecommendations: any[] = [];
        for (const chunk of candidateChunks) {
            const nodesRef = adminDb.collection("nodes").where(admin.firestore.FieldPath.documentId(), "in", chunk);
            const snapshot = await nodesRef.get();
            snapshot.forEach(doc => {
                hydratedRecommendations.push({ id: doc.id, ...doc.data() });
            });
        }

        return NextResponse.json({ recommendations: hydratedRecommendations });

    } catch (error: any) {
        console.error("Recommendation API Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: error.message },
            { status: 500 }
        );
    }
}
