"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/firebase/AuthContext";
import { db } from "@/lib/firebase/firebaseClient";
import {
    collection, query, where, orderBy, onSnapshot, addDoc,
    serverTimestamp, doc, setDoc, getDocs
} from "firebase/firestore";
import ProtectedRoute from "@/components/ProtectedRoute";
import { motion } from "framer-motion";

interface ChatPartner {
    id: string;
    name: string;
    role: string;
    org?: string;
    skills?: string;
}

interface ChatSession {
    id: string; // The chat document ID
    participants: string[]; // array of UIDs
    updatedAt: any;
    status: 'pending' | 'accepted' | 'rejected';
    initiatorId: string;
    // We augment this locally with partner details for the sidebar
    partner?: ChatPartner;
}

interface Message {
    id: string;
    senderId: string;
    text: string;
    createdAt: any;
}

export default function ChatDashboard() {
    const { user } = useAuth();

    // State
    const [chats, setChats] = useState<ChatSession[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");

    // For initiating new chats
    const [availableUsers, setAvailableUsers] = useState<ChatPartner[]>([]);
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch user's active chats and map partner details
    useEffect(() => {
        if (!user) return;

        const chatsQuery = query(
            collection(db, "chats"),
            where("participants", "array-contains", user.uid),
        );

        const unsubscribeChats = onSnapshot(chatsQuery, async (snapshot) => {
            const fetchedChats: ChatSession[] = [];

            for (const chatDoc of snapshot.docs) {
                const data = chatDoc.data();
                const partnerId = data.participants.find((p: string) => p !== user.uid);

                let partnerData: ChatPartner = { id: partnerId, name: "Unknown User", role: "user" };

                // Fetch partner details if we don't have them cached (simple approach)
                if (partnerId) {
                    try {
                        const userDoc = await getDocs(query(collection(db, "users"), where("__name__", "==", partnerId)));
                        if (!userDoc.empty) {
                            const u = userDoc.docs[0].data();
                            partnerData = { id: partnerId, name: u.name || "Unknown", role: u.role || "student" };
                        }
                    } catch (e) { console.error("Error fetching partner", e); }
                }

                fetchedChats.push({
                    id: chatDoc.id,
                    participants: data.participants,
                    updatedAt: data.updatedAt,
                    status: data.status || 'accepted',
                    initiatorId: data.initiatorId || '',
                    partner: partnerData
                });
            }

            // Sort by recent activity
            fetchedChats.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
            setChats(fetchedChats);
        });

        // Also fetch all available users for the "New Chat" directory
        const fetchDirectory = async () => {
            try {
                const q = query(collection(db, "users"));
                const snapshot = await getDocs(q);
                let usersList: ChatPartner[] = [];
                snapshot.forEach(doc => {
                    if (doc.id !== user.uid) {
                        const d = doc.data();
                        usersList.push({
                            id: doc.id,
                            name: d.name || "Unknown",
                            role: d.role || "student",
                            org: d.org || "",
                            skills: d.skills || d.designation || d.github || ""
                        });
                    }
                });
                setAvailableUsers(usersList);
            } catch (error) {
                console.error("Error fetching directory:", error);
            }
        };
        fetchDirectory();

        return () => unsubscribeChats();
    }, [user]);

    // Listen for messages in the active chat
    useEffect(() => {
        if (!activeChatId) {
            setMessages([]);
            return;
        }

        const msgsQuery = query(
            collection(db, "chats", activeChatId, "messages"),
            orderBy("createdAt", "asc")
        );

        const unsubscribeMessages = onSnapshot(msgsQuery, (snapshot) => {
            const fetchedMsgs: Message[] = [];
            snapshot.forEach((doc) => fetchedMsgs.push({ id: doc.id, ...doc.data() } as Message));
            setMessages(fetchedMsgs);

            // Auto-scroll to bottom
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        });

        return () => unsubscribeMessages();
    }, [activeChatId]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !activeChatId || !newMessage.trim()) return;

        try {
            const msgText = newMessage.trim();
            setNewMessage(""); // Optimistic clear

            await addDoc(collection(db, "chats", activeChatId, "messages"), {
                senderId: user.uid,
                text: msgText,
                createdAt: serverTimestamp()
            });

            // Update chat's updatedAt field
            await setDoc(doc(db, "chats", activeChatId), {
                updatedAt: serverTimestamp()
            }, { merge: true });

        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const startNewChat = async (partnerId: string) => {
        if (!user) return;

        // 1. Check if chat already exists
        const existingChat = chats.find(c => c.participants.includes(partnerId));
        if (existingChat) {
            setActiveChatId(existingChat.id);
            setIsNewChatOpen(false);
            return;
        }

        // 2. Create new chat room
        try {
            // Predictable ID generation to prevent duplicates: sort UIDs
            const ids = [user.uid, partnerId].sort();
            const chatId = `${ids[0]}_${ids[1]}`;

            await setDoc(doc(db, "chats", chatId), {
                participants: ids,
                updatedAt: serverTimestamp(),
                status: 'pending',
                initiatorId: user.uid
            }, { merge: true });

            setActiveChatId(chatId);
            setIsNewChatOpen(false);
            setSearchQuery("");
        } catch (e) {
            console.error("Error creating chat:", e);
        }
    };

    const updateChatStatus = async (status: 'accepted' | 'rejected') => {
        if (!activeChatId) return;
        try {
            await setDoc(doc(db, "chats", activeChatId), {
                status: status,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error("Error updating chat status:", error);
        }
    };

    const filteredUsers = availableUsers.filter(u => {
        const term = searchQuery.toLowerCase();
        return (
            u.name.toLowerCase().includes(term) ||
            u.role.toLowerCase().includes(term) ||
            (u.org && u.org.toLowerCase().includes(term)) ||
            (u.skills && u.skills.toLowerCase().includes(term))
        );
    });

    const activeChat = chats.find(c => c.id === activeChatId);
    const activePartner = activeChat?.partner;

    return (
        <ProtectedRoute>
            <div className="flex h-[calc(100vh-80px)] bg-slate-950 text-slate-200 overflow-hidden relative">
                {/* Sidebar */}
                <div className="w-80 border-r border-white/10 flex flex-col bg-slate-900/50 z-10">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900">
                        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">Conversations</h2>
                        <button
                            onClick={() => setIsNewChatOpen(!isNewChatOpen)}
                            className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center hover:bg-indigo-500/40 transition-colors"
                        >
                            +
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {isNewChatOpen ? (
                            <div className="p-4 space-y-2">
                                <div className="text-xs font-semibold uppercase text-slate-500 mb-2 tracking-wider">Start a connection</div>
                                <input
                                    type="text"
                                    placeholder="Search by name, role, org, skills..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 mb-3"
                                />
                                {filteredUsers.length === 0 ? (
                                    <div className="text-center p-4 text-xs text-slate-500">No users found matching "{searchQuery}"</div>
                                ) : (
                                    filteredUsers.map(u => (
                                        <button
                                            key={u.id}
                                            onClick={() => startNewChat(u.id)}
                                            className="w-full text-left p-3 rounded-xl hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700 flex items-center gap-3"
                                        >
                                            <div className="w-10 h-10 flex-shrink-0 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                                                {u.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-slate-200 truncate">{u.name}</div>
                                                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1 truncate">
                                                    <span>{u.role}</span>
                                                    {u.org && <><span className="text-slate-700">•</span><span>{u.org}</span></>}
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="p-2 space-y-1">
                                {chats.length === 0 ? (
                                    <div className="text-center p-6 text-sm text-slate-500">
                                        No active chats. Click the + to connect with someone.
                                    </div>
                                ) : (
                                    chats.map(chat => (
                                        <button
                                            key={chat.id}
                                            onClick={() => setActiveChatId(chat.id)}
                                            className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${activeChatId === chat.id ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-slate-800 border border-transparent'}`}
                                        >
                                            <div className="w-12 h-12 flex-shrink-0 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold relative">
                                                {chat.partner?.name.charAt(0).toUpperCase()}
                                                {chat.status === 'pending' && chat.initiatorId !== user?.uid && (
                                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-900"></span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-slate-200 truncate">{chat.partner?.name}</div>
                                                <div className="text-xs flex items-center justify-between text-slate-500">
                                                    <span className="capitalize">{chat.partner?.role}</span>
                                                    {chat.status === 'pending' && <span className="text-[9px] text-yellow-500 font-bold uppercase bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">Pending</span>}
                                                    {chat.status === 'rejected' && <span className="text-[9px] text-red-500 font-bold uppercase bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">Declined</span>}
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>

                    {activeChatId && activeChat && activePartner ? (
                        <>
                            {/* Chat Header */}
                            <div className="h-16 border-b border-white/10 px-6 flex items-center bg-slate-900/80 backdrop-blur-md z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold">
                                        {activePartner?.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-slate-100">{activePartner?.name}</div>
                                        <div className="text-xs text-slate-400 capitalize flex items-center gap-1">
                                            <span>{activePartner?.role}</span>
                                            {activePartner?.org && <><span className="text-slate-600">•</span><span>{activePartner.org}</span></>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {activeChat.status === 'pending' ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 z-10">
                                    <div className="w-20 h-20 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center mb-6">
                                        <span className="text-3xl">⏳</span>
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2 text-white">Chat Request Pending</h3>

                                    {activeChat.initiatorId === user?.uid ? (
                                        <p className="text-slate-400 text-center">Waiting for {activePartner?.name} to accept your chat request.</p>
                                    ) : (
                                        <div className="text-center">
                                            <p className="text-slate-400 mb-6">{activePartner?.name} wants to start a remote chat with you.</p>
                                            <div className="flex gap-4 justify-center">
                                                <button onClick={() => updateChatStatus('accepted')} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-green-600/20">Accept</button>
                                                <button onClick={() => updateChatStatus('rejected')} className="px-6 py-2 bg-red-600/20 text-red-500 hover:bg-red-600/30 rounded-lg font-medium transition-colors border border-red-500/30">Decline</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : activeChat.status === 'rejected' ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 z-10">
                                    <div className="w-20 h-20 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center mb-6">
                                        <span className="text-3xl">🚫</span>
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2 text-white">Chat Declined</h3>
                                    <p className="text-slate-400 text-center max-w-sm">This conversation request was declined. You cannot send further messages.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Chat Messages */}
                                    <div className="flex-1 overflow-y-auto p-6 space-y-6 z-10">
                                        {messages.map((msg, idx) => {
                                            const isMe = msg.senderId === user?.uid;
                                            const showAvatar = idx === 0 || messages[idx - 1].senderId !== msg.senderId;

                                            return (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    key={msg.id}
                                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${!showAvatar ? 'mt-2' : ''}`}
                                                >
                                                    <div className={`flex max-w-[70%] gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                        {/* Partner Avatar Placeholder ensures messages align perfectly even if avatar is hidden */}
                                                        <div className="w-8 flex-shrink-0 flex justify-center">
                                                            {!isMe && showAvatar && (
                                                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 mt-1">
                                                                    {activePartner?.name.charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className={`p-3.5 rounded-2xl ${isMe ? 'bg-indigo-600/90 text-white rounded-tr-sm' : 'bg-slate-800 border border-white/5 text-slate-200 rounded-tl-sm'}`}>
                                                            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{msg.text}</p>
                                                            <span className={`text-[10px] mt-1.5 block ${isMe ? 'text-indigo-200/70 text-right' : 'text-slate-500'}`}>
                                                                {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Sending...'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Input Area */}
                                    <div className="p-4 bg-slate-900 border-t border-white/10 z-10">
                                        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-3 relative">
                                            <input
                                                type="text"
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                placeholder="Type your message..."
                                                className="flex-1 bg-slate-950 border border-slate-700/50 rounded-full px-6 py-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                            />
                                            <button
                                                type="submit"
                                                disabled={!newMessage.trim()}
                                                className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-lg"
                                            >
                                                <span className="ml-1 -mt-0.5">🚀</span>
                                            </button>
                                        </form>
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 z-10">
                            <div className="w-20 h-20 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center mb-6 shadow-2xl">
                                <span className="text-3xl">💬</span>
                            </div>
                            <h3 className="text-xl font-semibold text-slate-300 mb-2">HackOn Collaborative Chat</h3>
                            <p className="max-w-xs text-center text-sm">Select a conversation from the sidebar or click + to start messaging connections securely.</p>
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
