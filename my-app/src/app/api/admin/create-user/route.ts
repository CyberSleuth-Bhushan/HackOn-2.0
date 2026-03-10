import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/firebaseAdmin";

export async function POST(req: NextRequest) {
    if (!adminAuth || !adminDb) {
        return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 500 });
    }

    try {
        // Basic Authorization check (Ideally, verify a Firebase Auth ID token here to ensure caller is Admin)
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Check if caller is admin (assuming we have their role in firestore)
        const callerDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
            return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
        }

        const body = await req.json();
        const { email, password, displayName, role } = body;

        if (!email || !password || !role) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Create the user in Firebase Auth
        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName,
        });

        // Create their profile in Firestore
        await adminDb.collection("users").doc(userRecord.uid).set({
            email: userRecord.email,
            displayName: userRecord.displayName,
            role: role,
            profileCompleted: true, // Verification team/Admins don't need to do the standard proof flow
            createdAt: new Date(),
        });

        return NextResponse.json({ message: "User created successfully", uid: userRecord.uid }, { status: 201 });

    } catch (error: any) {
        console.error("Error creating user:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
