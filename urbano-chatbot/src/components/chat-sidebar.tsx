import { useState, useEffect } from "react";
import { Plus, MessageSquare, Trash2, ShieldAlert, Sparkles, X } from "lucide-react";
import { ChatSession } from "@/domain/entities/chat.entity";
import { cn } from "@/lib/utils";

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  isOpen = false,
  onClose
}: ChatSidebarProps) {
  return (
    <div className={cn(
      "fixed inset-y-0 left-0 w-72 md:relative md:w-80 h-full border-r border-white/10 glass-panel flex flex-col z-40 md:z-20 transition-transform duration-300 md:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
    )}>
      {/* Cabecera / Identidad */}
      <div className="p-5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center neon-glow-primary">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white tracking-wide leading-none">Smart AI</h1>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Soporte Inteligente
            </span>
          </div>
        </div>

        {/* Botón Cerrar (Solo en Mobile) */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 md:hidden transition-all cursor-pointer"
            title="Cerrar menú"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Botón de Nueva Conversación */}
      <div className="p-4">
        <button
          onClick={onNewSession}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md neon-glow-primary hover:scale-[1.02] active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nueva Conversación
        </button>
      </div>

      {/* Listado de Sesiones / Historial */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1.5">
        <div className="text-[10px] font-bold text-gray-500 tracking-wider uppercase px-2 mb-2">
          Conversaciones
        </div>

        {sessions.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-10 px-4">
            No tienes chats iniciados aún. Empieza saludando al asistente.
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                activeSessionId === session.id
                  ? "bg-white/10 text-white border-white/10"
                  : "text-gray-400 hover:text-white hover:bg-white/5 border-transparent"
              }`}
              onClick={() => onSelectSession(session.id)}
            >
              <div className="flex items-center gap-3 truncate flex-1 mr-2">
                <MessageSquare className={`w-4 h-4 shrink-0 ${activeSessionId === session.id ? 'text-indigo-400' : 'text-gray-500'}`} />
                <span className="text-sm truncate font-medium">
                  {session.title || "Chat de Soporte"}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-gray-500 hover:text-rose-400 transition-all cursor-pointer"
                title="Eliminar conversación"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Panel Informativo / Footer */}
      <div className="p-4 border-t border-white/5 bg-black/20 flex flex-col gap-2">
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="text-[10px] leading-tight font-medium">
            <strong>Modo Standalone:</strong> Almacenamiento local persistente e integraciones de microservicios con fallbacks dinámicos.
          </span>
        </div>
      </div>
    </div>
  );
}
