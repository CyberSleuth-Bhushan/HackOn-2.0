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
            "Firebase Admin environment variables are missing. Firebase Admin SDK will not be initialized."
        );
        return null; // Prevent NextJS from crashing on boot
    }

    try {
        return admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
    } catch (error) {
        console.error("Firebase Admin Initialization Error", error);
        return null;
    }
};

export const adminApp = initializeAdmin();
export const adminDb = adminApp ? adminApp.firestore() : null;
export const adminAuth = adminApp ? adminApp.auth() : null;
