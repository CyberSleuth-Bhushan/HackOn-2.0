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

    // 2. Initialize Pinecone (Optional for seed, required for search)
    if (process.env.PINECONE_API_KEY) {
        console.log("Pinecone detected. Note: Embeddings must be generated via OpenAI API in production before upserting. Skipping Pinecone vector generation for mock data to save OpenAI credits. Real data should hit /api/search to auto-index.");
    }

    console.log("✅ Seeding Complete!");
}

seed().catch(console.error);
