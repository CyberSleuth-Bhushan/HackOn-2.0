import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getPineconeIndex } from "@/lib/pinecone/pineconeClient";
import { adminDb } from "@/lib/firebase/firebaseAdmin";
import admin from "firebase-admin";

// Delay initialization so module doesn't crash on boot if key is missing
const getGenAI = () => new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy");

export async function POST(req: Request) {
    try {
        const { query } = await req.json();

        if (!query) {
            return NextResponse.json({ error: "Missing query" }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY || !process.env.PINECONE_API_KEY || !adminDb) {
            return NextResponse.json(
                { error: "AI Services or Firebase not configured yet. Add API keys to .env.local" },
                { status: 500 }
            );
        }

        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

        // 1. Generate text embedding for the search query using Gemini
        const result = await model.embedContent(query);
        const embedding = result.embedding.values;

        // 2. Query Pinecone Vector Database
        const index = getPineconeIndex();
        const searchResults = await index.query({
            vector: embedding,
            topK: 10,
            includeMetadata: true,
        });

        // Extract Firestore document IDs from Pinecone results
        const nodeIds = searchResults.matches.map((match) => match.id);

        if (nodeIds.length === 0) {
            return NextResponse.json({ results: [] });
        }

        // 3. Hydrate data by fetching nodes from Firestore
        // Note: 'in' queries are limited to 10 items in Firestore
        const nodesRef = adminDb.collection("nodes");
        const snapshot = await nodesRef.where(admin.firestore.FieldPath.documentId(), "in", nodeIds).get();

        const hydratedResults = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        // Sort hydrated results to match the original semantic ranking order from Pinecone
        const sortedResults = hydratedResults.sort((a, b) => {
            return nodeIds.indexOf(a.id) - nodeIds.indexOf(b.id);
        });

        return NextResponse.json({ results: sortedResults });
    } catch (error: any) {
        console.error("Search API Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: error.message },
            { status: 500 }
        );
    }
}
