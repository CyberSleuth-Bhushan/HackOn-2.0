import { NextResponse } from "next/server";
import { OpenAI } from "openai";
import { getPineconeIndex } from "@/lib/pinecone/pineconeClient";
import { adminDb } from "@/lib/firebase/firebaseAdmin";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
    try {
        const { query } = await req.json();

        if (!query) {
            return NextResponse.json({ error: "Missing query" }, { status: 400 });
        }

        if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY) {
            return NextResponse.json(
                { error: "AI Services not configured yet. Add API keys to .env.local" },
                { status: 500 }
            );
        }

        // 1. Generate text embedding for the search query
        const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: query,
        });
        const embedding = embeddingResponse.data[0].embedding;

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
        const snapshot = await nodesRef.where(adminDb.constructor.FieldPath.documentId(), "in", nodeIds).get();

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
