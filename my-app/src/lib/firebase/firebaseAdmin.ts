import admin from "firebase-admin";

const initializeAdmin = () => {
    if (admin.apps.length > 0) {
        return admin.app();
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    // Handle new lines in the private key string from env variable
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
        console.warn(
            "Firebase Admin environment variables are missing. Some backend features may fail."
        );
    }

    return admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });
};

export const adminApp = initializeAdmin();
export const adminDb = adminApp.firestore();
export const adminAuth = adminApp.auth();
