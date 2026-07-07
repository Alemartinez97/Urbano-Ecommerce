"use client";

import { useState, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ChatWindow } from "@/components/chat-window";
import { ChatSession } from "@/domain/entities/chat.entity";
import { firebaseSyncService } from "@/infrastructure/adapters/firebase-sync.service";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [isClient, setIsClient] = useState(false);
  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { 
    messages, 
    status, 
    setMessages, 
    sendMessage
  } = (useChat as any)({
    api: "/api/chat",
    onError: (err: any) => {
      console.error("[useChat error]:", err);
    }
  });

  const isLoading = status === "submitted" || status === "streaming";

  const handleInputChange = (e: any) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    const trimmedInput = input.trim();
    if (!trimmedInput) return;
    sendMessage({ text: trimmedInput });
    setInput("");
  };

  const append = async (message: any) => {
    if (message && message.content) {
      await sendMessage({ text: message.content });
    }
  };

  // Client-side hydration and dual-layer session loading (Firebase cloud + local storage fallback)
  useEffect(() => {
    const loadInitialSessions = async () => {
      setIsClient(true);

      // 1. Attempt hydration from Firebase cloud real-time DB
      const remoteSessions = await firebaseSyncService.fetchSessions();
      if (remoteSessions) {
        setSessions(remoteSessions);
        if (remoteSessions.length > 0) {
          setActiveSessionId(remoteSessions[0].id);
          setMessages(remoteSessions[0].messages || []);
        } else {
          createNewSession([]);
        }
        return;
      }

      // 2. Fall back to secure local storage if cloud db is unconfigured/offline
      const saved = localStorage.getItem("premium_chat_sessions");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSessions(parsed);
          if (parsed.length > 0) {
            setActiveSessionId(parsed[0].id);
            setMessages(parsed[0].messages || []);
          } else {
            createNewSession([]);
          }
        } catch (e) {
          console.error("Error parsing local sessions:", e);
          createNewSession([]);
        }
      } else {
        createNewSession([]);
      }
    };

    loadInitialSessions();
  }, []);

  const createNewSession = (initialMsgs: any[] = []) => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: "Conversación Nueva",
      messages: initialMsgs,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setSessions(prev => {
      const updated = [newSession, ...prev];
      localStorage.setItem("premium_chat_sessions", JSON.stringify(updated));
      return updated;
    });
    setActiveSessionId(newId);
    setMessages(initialMsgs);

    // Non-blocking background sync to Firebase
    firebaseSyncService.syncSession(newSession);
  };

  const handleNewSession = () => {
    saveCurrentSessionMessages();
    createNewSession([]);
  };

  const handleSelectSession = (id: string) => {
    saveCurrentSessionMessages();

    const target = sessions.find(s => s.id === id);
    if (target) {
      setActiveSessionId(id);
      setMessages(target.messages || []);
    }
  };

  const handleDeleteSession = (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    localStorage.setItem("premium_chat_sessions", JSON.stringify(updated));
    
    if (activeSessionId === id) {
      if (updated.length > 0) {
        setActiveSessionId(updated[0].id);
        setMessages(updated[0].messages || []);
      } else {
        createNewSession([]);
      }
    }

    // Non-blocking deletion from Firebase
    firebaseSyncService.deleteSession(id);
  };

  const getMessageContent = (msg: any): string => {
    if (!msg) return "";
    if (typeof msg.content === "string") return msg.content;
    if (Array.isArray(msg.parts)) {
      return msg.parts
        .filter((part: any) => part.type === "text")
        .map((part: any) => part.text || "")
        .join("");
    }
    return "";
  };

  const mappedMessages = messages.map((msg: any) => {
    if (msg && typeof msg.content === "string") return msg;
    return {
      ...msg,
      content: getMessageContent(msg)
    };
  });

  const saveCurrentSessionMessages = () => {
    if (!activeSessionId) return;
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === activeSessionId) {
          let title = s.title;
          
          if ((!title || title === "Conversación Nueva") && messages.length > 0) {
            const firstUserMsg = messages.find((m: any) => m.role === "user");
            if (firstUserMsg) {
              const content = getMessageContent(firstUserMsg);
              title = content.length > 26 ? content.slice(0, 26) + "..." : content;
            }
          }

          const updatedSession = {
            ...s,
            title,
            messages: mappedMessages,
            updatedAt: new Date()
          };

          // Trigger background sync for this session
          firebaseSyncService.syncSession(updatedSession);

          return updatedSession;
        }
        return s;
      });
      localStorage.setItem("premium_chat_sessions", JSON.stringify(updated));
      return updated;
    });
  };

  // Debounced session auto-saving
  useEffect(() => {
    if (isClient && activeSessionId && messages.length > 0) {
      const delaySave = setTimeout(() => {
        saveCurrentSessionMessages();
      }, 600);
      return () => clearTimeout(delaySave);
    }
  }, [messages, activeSessionId, isClient]);

  if (!isClient) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-gray-950 text-indigo-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-xs text-gray-500 font-medium">Iniciando interfaz premium...</span>
      </div>
    );
  }

  return (
    <main className="w-screen h-screen flex overflow-hidden bg-gray-950 text-gray-200 relative">
      {/* Sidebar backdrop for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-35 md:hidden transition-opacity duration-300 animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <ChatSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          handleSelectSession(id);
          setIsSidebarOpen(false);
        }}
        onNewSession={() => {
          handleNewSession();
          setIsSidebarOpen(false);
        }}
        onDeleteSession={handleDeleteSession}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <ChatWindow
        messages={mappedMessages}
        input={input}
        isLoading={isLoading}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        append={append}
        setMessages={setMessages}
        setInput={setInput}
        onNewSession={handleNewSession}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />
    </main>
  );
}
