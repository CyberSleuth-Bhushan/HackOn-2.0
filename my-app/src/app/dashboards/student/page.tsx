"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/firebase/AuthContext";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase/firebaseClient";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function StudentDashboard() {
    const { user } = useAuth();
    const [courses, setCourses] = useState<any[]>([]);

    useEffect(() => {
        if (!user) return;
        // Mock data fetch for student dashboard
        const fetchStudentData = async () => {
            // Since we don't have real dynamic "course" nodes yet, let's just 
            // query projects/papers related to them or general mock data
            setTimeout(() => {
                setCourses([
                    { id: 1, title: "Deep Learning Fundamentals", instructor: "Dr. Alok Sharma", status: "In Progress" },
                    { id: 2, title: "Bioinformatics Research Lab", instructor: "Dr. Riya Gupta", status: "Enrolled" }
                ])
            }, 500);
        };
        fetchStudentData();
    }, [user]);

    return (
        <ProtectedRoute allowedRoles={["student"]}>
            <div className="min-h-screen p-8">
                <header className="mb-12">
                    <h1 className="text-3xl font-bold text-white mb-2">Student Portal</h1>
                    <p className="text-slate-400">Welcome back, {user?.displayName}. Here is your academic overview.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Active Courses */}
                    <div className="lg:col-span-2 space-y-4">
                        <h2 className="text-xl font-semibold text-slate-200">Active Courses & Labs</h2>
                        <div className="grid gap-4">
                            {courses.map((course) => (
                                <div key={course.id} className="glass-card p-6 rounded-xl border border-white/10 hover:border-indigo-500/30 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-medium text-white text-lg">{course.title}</h3>
                                            <p className="text-slate-400 text-sm mt-1">{course.instructor}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${course.status === 'In Progress' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                            }`}>
                                            {course.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Stats/Actions */}
                    <div className="space-y-6">
                        <div className="glass-card p-6 rounded-xl border border-white/10">
                            <h3 className="font-semibold text-slate-200 mb-4">Academic Network</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">Connected Peers</span>
                                    <span className="text-white font-medium">14</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">Research Authors</span>
                                    <span className="text-white font-medium">3</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">Active Projects</span>
                                    <span className="text-white font-medium">1</span>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-6 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
                            <h3 className="font-semibold text-indigo-300 mb-2">Need a Mentor?</h3>
                            <p className="text-sm text-slate-400 mb-4">Use the AI Semantic Search to find experts in your exact field of interest.</p>
                            <a href="/search" className="block w-full text-center py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg border border-indigo-500/30 transition-colors text-sm font-medium">
                                Go to Search
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
