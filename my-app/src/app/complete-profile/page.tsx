"use client";

import { useState } from "react";
import { useAuth } from "@/lib/firebase/AuthContext";
import { db } from "@/lib/firebase/firebaseClient";
import { doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function CompleteProfilePage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [file, setFile] = useState<File | null>(null);
    const [organization, setOrganization] = useState("");
    const [dob, setDob] = useState("");
    const [mobile, setMobile] = useState("");
    const [github, setGithub] = useState("");
    const [linkedin, setLinkedin] = useState("");

    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState("");

    if (loading) return null;

    if (!user) {
        if (typeof window !== "undefined") router.push("/login");
        return null;
    }

    if (user.profileCompleted) {
        if (typeof window !== "undefined") router.push("/");
        return null;
    }

    const getProofLabel = () => {
        switch (user.role) {
            case "student": return "Student ID with Date";
            case "institute": return "Valid Institution Proof";
            case "expert": return "Resume / Certificate";
            case "researcher": return "Research ID / Proof of Work";
            default: return "Proof of Identity";
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError("Please upload the required proof.");
            return;
        }

        setIsUploading(true);
        setError("");

        try {
            // Read file as Base64 Data URL
            const reader = new FileReader();
            reader.readAsDataURL(file);

            reader.onload = async () => {
                const base64String = reader.result as string;

                // Firestore has a 1MB limit for documents, so large files might fail here.
                // We're saving the full base64 string directly to the DB as requested.
                const userRef = doc(db, "users", user.uid);
                await updateDoc(userRef, {
                    organization,
                    dob,
                    mobile,
                    github,
                    linkedin,
                    proofUrl: base64String,
                    profileCompleted: true,
                    verificationStatus: 'pending',
                    updatedAt: new Date()
                });

                // Reload the page to trigger the updated context auth state
                window.location.href = "/";
            };

            reader.onerror = (error) => {
                console.error("FileReader error:", error);
                setError("Failed to process the requested file. Please try another file.");
                setIsUploading(false);
            };

        } catch (err: any) {
            console.error(err);
            setError(err.message || "An error occurred while uploading. Please try again.");
            setIsUploading(false);
        }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen flex text-white relative flex-col">
                {/* Background Video */}
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover z-0 opacity-20"
                >
                    <source src="/Cyber.mp4" type="video/mp4" />
                </video>

                {/* Dark Overlay */}
                <div className="absolute inset-0 bg-slate-950/80 z-10" />

                <div className="flex-1 flex items-center justify-center p-4 relative z-20">
                    <div className="max-w-md w-full glass-card p-8 rounded-2xl border border-white/10 relative overflow-hidden bg-slate-900/50 backdrop-blur-md">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl" />

                        <div className="text-center mb-8 relative z-10">
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 mb-2">
                                Complete Profile
                            </h1>
                            <p className="text-slate-400 text-sm">
                                As a <strong className="text-white capitalize">{user.role}</strong>, please provide your {getProofLabel()}.
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-6 relative z-10">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4 relative z-10 w-full max-w-sm mx-auto">

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Organization / Institution</label>
                                <input
                                    type="text" required value={organization} onChange={e => setOrganization(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Date of Birth</label>
                                    <input
                                        type="date" required value={dob} onChange={e => setDob(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 [color-scheme:dark]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Mobile Number</label>
                                    <input
                                        type="tel" required value={mobile} onChange={e => setMobile(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">LinkedIn Profile (Mandatory)</label>
                                <input
                                    type="url" required value={linkedin} onChange={e => setLinkedin(e.target.value)}
                                    placeholder="https://linkedin.com/in/..."
                                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">GitHub Profile (Optional)</label>
                                <input
                                    type="url" value={github} onChange={e => setGithub(e.target.value)}
                                    placeholder="https://github.com/..."
                                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                            </div>

                            <div className="pt-2">
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Upload {getProofLabel()}
                                </label>
                                <div className="flex items-center justify-center w-full">
                                    <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-40 border-2 border-slate-700/50 border-dashed rounded-lg cursor-pointer bg-slate-900/50 hover:bg-slate-800/50 transition-colors">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <svg className="w-8 h-8 mb-4 text-slate-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                                            </svg>
                                            <p className="mb-2 text-sm text-slate-400">
                                                <span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop
                                            </p>
                                            <p className="text-xs text-slate-500">PDF, PNG, JPG or JPEG</p>
                                        </div>
                                        <input id="dropzone-file" type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileChange} />
                                    </label>
                                </div>
                                {file && (
                                    <p className="mt-2 text-sm text-indigo-400 truncate">
                                        Selected file: {file.name}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isUploading || !file}
                                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isUploading ? "Uploading..." : "Submit Proof & Continue"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
