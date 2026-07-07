"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Send, Sparkles, User, Bot, Loader2,
  AlertCircle, ArrowLeft, HelpCircle, PhoneCall,
  Mic, MicOff, Activity, X, Trash2, ChevronRight, Menu
} from "lucide-react";
import { VoicePlayer } from "./voice-player";
import { cn } from "@/lib/utils";

// --- Types ---
type LogLevel = "system" | "ai" | "tool" | "infra" | "voice";
interface AgentLog {
  id: string;
  level: LogLevel;
  title: string;
  detail?: string;
  timestamp: Date;
}

interface ChatWindowProps {
  messages: any[];
  input: string;
  isLoading: boolean;
  handleInputChange: (e: any) => void;
  handleSubmit: (e: any) => void;
  append: (message: any) => Promise<any>;
  setMessages: (messages: any[] | ((prev: any[]) => any[])) => void;
  setInput: (value: string) => void;
  onNewSession: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export function ChatWindow({
  messages,
  input,
  isLoading,
  handleInputChange,
  handleSubmit,
  append,
  setMessages,
  setInput,
  onNewSession,
  onToggleSidebar,
  isSidebarOpen = false
}: ChatWindowProps) {
  const [isHumanMode, setIsHumanMode] = useState(false);
  const [isHumanTyping, setIsHumanTyping] = useState(false);
  const [localInput, setLocalInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Observability Panel ---
  const [showLogs, setShowLogs] = useState(false);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const logScrollRef = useRef<HTMLDivElement>(null);

  // --- Speech-to-Text ---
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const addLog = useCallback((level: LogLevel, title: string, detail?: string) => {
    const entry: AgentLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      level,
      title,
      detail,
      timestamp: new Date()
    };
    setAgentLogs(prev => [...prev.slice(-199), entry]);
  }, []);

  // Scroll logs to bottom on new entry
  useEffect(() => {
    if (logScrollRef.current) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
    }
  }, [agentLogs]);

  // --- STT Setup ---
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "es-ES";

      rec.onstart = () => {
        setIsListening(true);
        addLog("voice", "🎤 Micrófono Activo", "Comenzando captura de voz nativa...");
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        addLog("voice", "📝 Voz Transcrita", `"${transcript}"`);
        setLocalInput(prev => {
          const next = prev.trim() ? `${prev} ${transcript}` : transcript;
          return next;
        });
      };

      rec.onerror = (event: any) => {
        addLog("voice", "⚠️ Error SpeechRecognition", event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
        addLog("voice", "🔇 Micrófono Inactivo", "Concluida la captura de audio.");
      };

      recognitionRef.current = rec;
    } else {
      addLog("voice", "❌ No Compatible", "SpeechRecognition no soportado por este navegador.");
    }
  }, [addLog]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err: any) {
        console.error("Error starting SpeechRecognition:", err);
      }
    }
  };

  // Scroll messages to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isHumanTyping, isLoading]);

  // Simulated technical support agent operator responses
  const getMateoResponse = (userText: string): string => {
    const text = userText.toLowerCase();
    if (text.includes("cloudflare") || text.includes("edge") || text.includes("deploy") || text.includes("wrangler")) {
      return "¡Hola! Sí, claro. Estoy revisando el despliegue del chatbot en Cloudflare. Nuestro archivo wrangler.toml está completamente listo para compilar con edge compatibility. ¿Tuviste alguna duda con el comando de deploy?";
    }
    if (text.includes("voice") || text.includes("stt") || text.includes("micrófono") || text.includes("audio")) {
      return "¡Qué tal! La entrada por voz (Speech-to-Text) utiliza la API nativa del navegador. Si no te funciona, revisá que le hayas otorgado permisos de micrófono a la página en la barra de direcciones. ¿Querés que hagamos una prueba de dictado?";
    }
    if (text.includes("rag") || text.includes("vector") || text.includes("embedding") || text.includes("dataset")) {
      return "Hola. El sistema RAG utiliza la base vectorial local en memoria para buscar similitudes híbridas en faq-dataset.json. Funciona de maravilla tanto localmente como en el edge. ¿Querías consultar la estructura de embeddings?";
    }
    if (text.includes("gracias") || text.includes("buenisimo") || text.includes("perfecto")) {
      return "¡De nada! Es un placer darte una mano. Cualquier otra duda que te surja sobre el ejercicio técnico, escribime que sigo acá conectado. ¡Que tengas un excelente día!";
    }
    return "Hola, muy buenas. Soy Mateo del soporte de asistencia técnica del Chatbot. Disculpa la espera, me acaban de derivar tu caso. Contame un poco más sobre lo que necesitás consultar del ejercicio y lo resolvemos.";
  };

  // Trigger quick prompt suggestion button
  const handleQuickPrompt = (promptText: string) => {
    setLocalInput(promptText);
  };

  // Unified submission handling (AI and Human Modes)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localInput.trim() || isHumanTyping) return;

    const text = localInput.trim();
    setLocalInput("");

    if (isHumanMode) {
      const userMsg = {
        id: `user-msg-${Date.now()}`,
        role: "user",
        content: text,
        createdAt: new Date()
      };
      setMessages(prev => [...prev, userMsg]);
      addLog("system", "👤 Usuario → Soporte", text.slice(0, 120));

      setIsHumanTyping(true);

      setTimeout(() => {
        setIsHumanTyping(false);
        const reply = getMateoResponse(text);
        const mateoMsg = {
          id: `mateo-msg-${Date.now()}`,
          role: "assistant",
          content: reply,
          createdAt: new Date(),
          isHumanHandover: true,
          humanAgentName: "Mateo (Soporte)"
        };
        setMessages(prev => [...prev, mateoMsg]);
        addLog("system", "🟢 Operador respondió", reply.slice(0, 120));
      }, 2000);
    } else {
      addLog("ai", "💬 Message sent to AI agent", text.slice(0, 120));
      append({
        role: "user",
        content: text
      });
    }
  };

  // Return from simulated human mode back to AI Assistant
  const handleReturnToAI = () => {
    setIsHumanMode(false);
    addLog("system", "🔄 Returned session to AI Agent", "User finalized human operator support.");
    const notificationMsg = {
      id: `system-msg-${Date.now()}`,
      role: "system",
      content: "Has regresado al Asistente Inteligente Autónomo.",
      createdAt: new Date()
    };
    const botMsg = {
      id: `bot-msg-${Date.now()}`,
      role: "assistant",
      content: "¡Hola de nuevo! Ya estoy de vuelta. ¿En qué te puedo ayudar con nuestro sistema o consultas técnicas?",
      createdAt: new Date()
    };
    setMessages(prev => [...prev, notificationMsg, botMsg]);
  };

  // Render RAG vector search tool call results
  const renderToolInvocation = (tool: any) => {
    const { toolName, state, result, toolCallId } = tool;

    if (state === "calling") {
      addLog("tool", `⚙️ Tool: ${toolName}`, `Calling agent tool... ID: ${toolCallId}`);
      return (
        <div key={toolCallId} className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-2 rounded-xl mt-2 w-fit animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>El agente está llamando a la herramienta: <strong>{toolName}</strong>...</span>
        </div>
      );
    }

    if (state === "result" && result) {
      addLog("infra", `✅ Response: ${toolName}`, JSON.stringify(result).slice(0, 200));
      switch (toolName) {
        case "searchKnowledgeBase":
          const results = result.results || [];
          return (
            <div key={toolCallId} className="mt-2 p-3 rounded-xl border border-white/5 bg-white/5 max-w-md">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                Artículos Recuperados (RAG Vector DB)
              </div>
              {results.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic">No se encontraron artículos en la base de conocimientos local.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                  {results.map((r: string, i: number) => (
                    <div key={i} className="p-2 rounded-lg bg-black/25 border border-white/5 text-[11px] text-gray-300 whitespace-pre-line leading-relaxed font-sans">
                      {r}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );

        case "humanHandover":
          // Enable human mode dynamically if returned by agent tool
          setTimeout(() => {
            if (!isHumanMode) {
              setIsHumanMode(true);
            }
          }, 100);
          return (
            <div key={toolCallId} className="mt-2 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2.5 max-w-md neon-glow-success">
              <PhoneCall className="w-4 h-4 animate-bounce shrink-0" />
              <div>
                <strong>Derivación Autorizada:</strong> Conectando con {result.agentName}. Esperando respuesta del operador...
              </div>
            </div>
          );

        default:
          return null;
      }
    }

    return null;
  };

  // Simple Markdown inline bold and bullet parser for React 19 compatibility
  const renderMessageContent = (content: string) => {
    if (!content) return null;
    
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      const boldRegex = /\*\*([^*]+)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="font-bold text-white">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        return (
          <li key={idx} className="list-disc list-inside ml-2 text-xs text-gray-300 mt-1 leading-relaxed">
            {parts.length > 0 ? parts : line.trim().substring(2)}
          </li>
        );
      }

      return (
        <p key={idx} className={cn("text-xs text-gray-300 leading-relaxed", idx > 0 && "mt-1.5")}>
          {parts.length > 0 ? parts : line}
        </p>
      );
    });
  };

  return (
    <div className="flex-1 h-full flex overflow-hidden bg-gray-950 relative">
      {/* Dynamic Voice STT Animation Layer */}
      {isListening && (
        <div className="absolute inset-0 bg-indigo-950/20 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-6 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <span className="text-sm font-semibold text-rose-300 uppercase tracking-widest font-mono">Grabando entrada de voz</span>
          </div>
          {/* Animated sound frequency sound wave */}
          <div className="flex items-end gap-1.5 h-16">
            {[1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1].map((bar, i) => (
              <span 
                key={i} 
                className="w-1.5 bg-gradient-to-t from-rose-600 to-rose-400 rounded-full animate-pulse"
                style={{ 
                  height: `${30 + bar * 8}%`,
                  animationDuration: `${0.4 + (i % 3) * 0.2}s`
                }}
              />
            ))}
          </div>
          <button 
            type="button"
            onClick={toggleListening}
            className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full text-xs font-bold transition-all shadow-lg shadow-rose-600/30 cursor-pointer"
          >
            Detener y Transcribir
          </button>
        </div>
      )}

      {/* Main Chat Flow Section */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Chat Window Sub-header */}
        <div className="px-4 sm:px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0 glass-panel z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Hamburger menu button for mobile */}
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="p-1.5 -ml-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 md:hidden transition-all cursor-pointer"
                title="Abrir menú"
              >
                <Menu className="w-4.5 h-4.5" />
              </button>
            )}

            {isHumanMode ? (
              <>
                <button
                  onClick={handleReturnToAI}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer mr-1"
                  title="Volver al Asistente Inteligente"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="font-bold text-xs sm:text-sm text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Soporte Técnico (Simulación)
                  </h2>
                  <span className="text-[9px] sm:text-[10px] text-gray-500">Operador: Mateo Conectado</span>
                </div>
              </>
            ) : (
              <div>
                <h2 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                  <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-indigo-500 animate-pulse" />
                  Asistente AI Autónomo
                </h2>
                <span className="text-[9px] sm:text-[10px] text-gray-500">Buscador semántico RAG & Vector DB</span>
              </div>
            )}
          </div>
          
          <button
            onClick={() => setShowLogs(!showLogs)}
            className={cn(
              "px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
              showLogs
                ? "bg-violet-600 border-violet-400 text-white shadow-md shadow-violet-500/20"
                : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
            )}
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{showLogs ? "Cerrar Consola" : "Ver Consola"}</span>
            <span className="sm:hidden">{showLogs ? "Consola" : "Ver"}</span>
          </button>
        </div>

        {/* Bubble Messages list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto gap-5 py-10 select-none animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                <Sparkles className="w-7 h-7 animate-pulse" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white tracking-wide">¡Hola! Soy tu Asistente AI Autónomo</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Tu asistente inteligente e independiente para consultas técnicas, configuración y preguntas frecuentes. Puedo responder tus dudas buscando en la base de conocimientos RAG.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full pt-4">
                <button 
                  onClick={() => handleQuickPrompt("¿Qué es este chatbot y qué características tiene?")}
                  className="p-3 text-left rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/15 transition-all text-xs text-gray-300 font-medium flex items-center justify-between group cursor-pointer"
                >
                  <span>🔍 Características del chatbot</span>
                  <HelpCircle className="w-4 h-4 text-gray-500 group-hover:text-indigo-400 transition-colors" />
                </button>
                
                <button 
                  onClick={() => handleQuickPrompt("¿Cómo funciona la entrada por voz y Speech-to-Text?")}
                  className="p-3 text-left rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/15 transition-all text-xs text-gray-300 font-medium flex items-center justify-between group cursor-pointer"
                >
                  <span>🎤 Entrada y salida de voz</span>
                  <HelpCircle className="w-4 h-4 text-gray-500 group-hover:text-indigo-400 transition-colors" />
                </button>

                <button 
                  onClick={() => handleQuickPrompt("¿Cómo se configura el despliegue en Cloudflare y wrangler.toml?")}
                  className="p-3 text-left rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/15 transition-all text-xs text-gray-300 font-medium flex items-center justify-between group cursor-pointer"
                >
                  <span>⚡ Despliegue en Cloudflare Edge</span>
                  <HelpCircle className="w-4 h-4 text-gray-500 group-hover:text-indigo-400 transition-colors" />
                </button>

                <button 
                  onClick={() => handleQuickPrompt("¿Cómo funciona el buscador semántico local RAG?")}
                  className="p-3 text-left rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/15 transition-all text-xs text-gray-300 font-medium flex items-center justify-between group cursor-pointer"
                >
                  <span>🧠 Arquitectura RAG & Vector DB</span>
                  <HelpCircle className="w-4 h-4 text-gray-500 group-hover:text-indigo-400 transition-colors" />
                </button>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const isUser = message.role === "user";
              const isSystem = message.role === "system";

              if (isSystem) {
                return (
                  <div key={message.id} className="flex justify-center my-3">
                    <span className="text-[10px] font-bold tracking-wide uppercase px-3 py-1 bg-white/5 border border-white/5 text-gray-500 rounded-full">
                      {message.content}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-start gap-3.5 max-w-[85%] sm:max-w-[75%]",
                    isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border text-white font-bold text-xs select-none",
                      isUser
                        ? "bg-zinc-800 border-white/15 text-zinc-300"
                        : message.isHumanHandover
                        ? "bg-emerald-600 border-emerald-400 text-white"
                        : "bg-indigo-600 border-indigo-400 text-white neon-glow-primary"
                    )}
                  >
                    {isUser ? (
                      <User className="w-4.5 h-4.5" />
                    ) : message.isHumanHandover ? (
                      <User className="w-4.5 h-4.5" />
                    ) : (
                      <Bot className="w-4.5 h-4.5" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 font-semibold uppercase">
                        {isUser ? "Tú" : message.humanAgentName || "Asistente AI"}
                      </span>
                      {!isUser && message.content && (
                        <VoicePlayer text={message.content} />
                      )}
                    </div>
                    <div
                      className={cn(
                        "p-3 rounded-2xl border text-xs shadow-md space-y-2",
                        isUser
                          ? "bg-indigo-600/10 border-indigo-500/20 text-indigo-100 rounded-tr-none"
                          : message.isHumanHandover
                          ? "bg-emerald-950/30 border-emerald-500/25 text-gray-200 rounded-tl-none"
                          : "bg-white/5 border-white/5 text-gray-200 rounded-tl-none"
                      )}
                    >
                      {message.content ? (
                        renderMessageContent(message.content)
                      ) : (
                        <p className="text-[10px] text-gray-500 italic">Ejecutando acción agéntica...</p>
                      )}

                      {message.toolInvocations && message.toolInvocations.map(renderToolInvocation)}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Matteo typing indicator */}
          {isHumanTyping && (
            <div className="flex items-start gap-3.5 max-w-[75%] mr-auto">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 border border-emerald-400 text-white flex items-center justify-center shrink-0">
                <User className="w-4.5 h-4.5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 font-semibold uppercase">Mateo (Soporte)</span>
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/25 rounded-2xl rounded-tl-none text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full dot-blink" />
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full dot-blink" />
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full dot-blink" />
                </div>
              </div>
            </div>
          )}

          {/* AI typing indicator */}
          {isLoading && !isHumanMode && (
            <div className="flex items-start gap-3.5 max-w-[75%] mr-auto">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 border border-indigo-400 text-white flex items-center justify-center shrink-0 neon-glow-primary">
                <Bot className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 font-semibold uppercase">Asistente AI</span>
                <div className="p-3 bg-white/5 border border-white/5 rounded-2xl rounded-tl-none text-indigo-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full dot-blink" />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full dot-blink" />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full dot-blink" />
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-gray-950/60 border-t border-white/5 backdrop-blur-md z-10">
          <form
            onSubmit={handleFormSubmit}
            className="relative flex items-center gap-2"
          >
            {!isHumanMode && (
              <button
                type="button"
                onClick={toggleListening}
                title={isListening ? "Detener dictado" : "Dictar por voz"}
                className={cn(
                  "shrink-0 p-2.5 rounded-xl border transition-all cursor-pointer",
                  isListening
                    ? "bg-rose-600 border-rose-400 text-white animate-pulse shadow-lg shadow-rose-500/30"
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                )}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}

            <div className="relative flex-1">
              <input
                value={localInput}
                onChange={(e) => setLocalInput(e.target.value)}
                disabled={isHumanTyping}
                placeholder={
                  isListening
                    ? "Escuchando... habla ahora 🎤"
                    : isHumanMode
                    ? "Escribe un mensaje para Mateo (Soporte Técnico)..."
                    : "Pregunta sobre configuración, arquitectura RAG o despliegues..."
                }
                className={cn(
                  "w-full py-3.5 pl-4 pr-12 rounded-xl bg-white/5 border text-xs text-white placeholder-gray-500 focus:outline-none transition-all",
                  isListening
                    ? "border-rose-500/40 focus:border-rose-500/60 bg-rose-500/5"
                    : isHumanMode
                    ? "border-emerald-500/20 focus:border-emerald-500/40 focus:bg-emerald-500/5 focus:ring-1 focus:ring-emerald-500/30"
                    : "border-white/5 focus:border-indigo-500/30 focus:bg-indigo-500/5 focus:ring-1 focus:ring-indigo-500/35"
                )}
              />
              <button
                type="submit"
                disabled={isLoading || isHumanTyping || !localInput.trim()}
                className={cn(
                  "absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed",
                  isHumanMode
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md neon-glow-primary"
                )}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Observability Panel Backdrop for mobile */}
      {showLogs && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-35 md:hidden transition-opacity duration-300 animate-fade-in"
          onClick={() => setShowLogs(false)}
        />
      )}

      {/* Observability Panel Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 w-72 md:relative md:w-80 h-full flex flex-col border-l border-white/5 bg-gray-950/80 backdrop-blur-xl transition-all duration-300 overflow-hidden z-40 md:z-20",
          showLogs ? "translate-x-0 md:w-80 opacity-100" : "translate-x-full md:w-0 md:translate-x-0 opacity-0 pointer-events-none md:pointer-events-auto"
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-bold text-violet-300 tracking-wide">Consola Agéntica</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setAgentLogs([])}
              title="Limpiar logs"
              className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-white/5 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowLogs(false)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div ref={logScrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
          {agentLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-600 gap-3 py-10">
              <ChevronRight className="w-8 h-8 opacity-20" />
              <p className="text-[11px] leading-relaxed">
                Los eventos del agente<br />aparecen aquí en tiempo real.
              </p>
            </div>
          ) : (
            agentLogs.map((log) => {
              const colors: Record<LogLevel, string> = {
                system: "text-gray-300 border-gray-700 bg-gray-800/40",
                ai:     "text-indigo-300 border-indigo-700/50 bg-indigo-900/20",
                tool:   "text-amber-300 border-amber-700/50 bg-amber-900/20",
                infra:  "text-emerald-300 border-emerald-700/50 bg-emerald-900/20",
                voice:  "text-rose-300 border-rose-700/50 bg-rose-900/20",
              };
              return (
                <div
                  key={log.id}
                  className={cn(
                    "rounded-lg border p-2 text-[10px] leading-tight",
                    colors[log.level]
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold truncate">{log.title}</span>
                    <span className="text-gray-500 ml-1 shrink-0">
                      {log.timestamp.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>
                  {log.detail && (
                    <p className="text-gray-400 font-mono break-all leading-tight">{log.detail}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
