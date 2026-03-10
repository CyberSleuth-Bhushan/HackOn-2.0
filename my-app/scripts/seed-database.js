const admin = require("firebase-admin");
const { Pinecone } = require("@pinecone-database/pinecone");
const fs = require("fs");
const path = require("path");

// Load Environment Variables (Assuming run from Next.js root)
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

// Mock Data
const MOCK_NODES = [
    { id: "prof_1", type: "Professor", name: "Dr. Alok Sharma", department: "Computer Science", expertise: ["Machine Learning", "Computer Vision"] },
    { id: "prof_2", type: "Professor", name: "Dr. Riya Gupta", department: "Healthcare", expertise: ["Medical Imaging", "Public Health"] },
    { id: "prof_3", type: "Professor", name: "Dr. Amit Rao", department: "Robotics", expertise: ["Agricultural Robotics", "Automation"] },
    { id: "student_1", type: "Student", name: "Rahul Verma", degree: "PhD", major: "AI", interests: ["Deep Learning"] },
    { id: "student_2", type: "Student", name: "Priya Singh", degree: "MSc", major: "Bioinformatics", interests: ["Healthcare AI"] },
    { id: "paper_1", type: "Paper", title: "Deep Learning for Medical Imaging", year: 2024, keywords: ["Computer Vision", "Healthcare"] },
    { id: "paper_2", type: "Paper", title: "Robotics in Precision Agriculture", year: 2023, keywords: ["Robotics", "Agriculture"] },
    { id: "project_1", type: "Project", title: "Smart Crop Monitoring", status: "Active", funding: "NSF" },
    { id: "skill_1", type: "Skill", name: "Computer Vision" },
    { id: "skill_2", type: "Skill", name: "Medical Imaging" }
];

const MOCK_EDGES = [
    { source: "prof_1", target: "paper_1", type: "authored_by" },
    { source: "prof_2", target: "paper_1", type: "co_authored_by" },
    { source: "student_2", target: "paper_1", type: "worked_on" },
    { source: "prof_3", target: "paper_2", type: "authored_by" },
    { source: "prof_3", target: "project_1", type: "leads" },
    { source: "prof_1", target: "skill_1", type: "expert_in" },
    { source: "prof_2", target: "skill_2", type: "expert_in" }
];

async function seed() {
    console.log("Starting Seed Process...");

    // 1. Initialize Firebase Admin
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
        console.warn("Skipping Firebase Upload: Missing .env.local keys.");
        return;
    }

    const app = admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
    });
    const db = app.firestore();

    console.log("Uploading Nodes to Firestore...");
    for (const node of MOCK_NODES) {
        await db.collection("nodes").doc(node.id).set(node);
    }

    console.log("Uploading Edges to Firestore...");
    for (let i = 0; i < MOCK_EDGES.length; i++) {
        await db.collection("edges").doc(`edge_${i}`).set(MOCK_EDGES[i]);
    }

    // 2. Initialize Pinecone & Gemini to generate mock vectors
    if (process.env.PINECONE_API_KEY && process.env.GEMINI_API_KEY) {
        console.log("Generating Gemini Embeddings & Uploading to Pinecone...");
        const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        const index = pc.index(process.env.PINECONE_INDEX_NAME || "knowledge-graph-index");

        const { GoogleGenAI } = require("@google/genai");
        const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const vectors = [];
        for (const node of MOCK_NODES) {
            // Create a text representation of the node for embedding
            const textToEmbed = `${node.name || node.title} ${node.type} ${node.department || ""} ${(node.expertise || node.keywords || node.interests || []).join(" ")}`;

            const result = await genAI.models.embedContent({
                model: "gemini-embedding-001",
                contents: textToEmbed,
            });
            const embedding = Array.from(result.embeddings[0].values).slice(0, 768);

            vectors.push({
                id: node.id,
                values: Array.from(embedding),
                metadata: { type: node.type, name: node.name || node.title }
            });
        }

        // Upsert in batches of 100 max (we only have 10 here)
        console.log('Total constructed vectors ready for Pinecone:', vectors.length);
        if (vectors.length > 0) {
            console.log('Sample vector:', JSON.stringify(vectors[0]).substring(0, 100) + '...');
            await index.upsert({ records: vectors });
            console.log("Pinecone vectors uploaded successfully!");
        } else {
            console.warn("Vectors array is empty! Skipping Pinecone upsert.");
        }
        console.log("Pinecone vectors uploaded successfully!");
    } else {
        console.log("Skipping Pinecone: Missing PINECONE_API_KEY or GEMINI_API_KEY.");
    }

    console.log("✅ Seeding Complete!");
}

seed().catch(console.error);
