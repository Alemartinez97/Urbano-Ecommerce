import React, { useState, useEffect, useRef } from 'react';
import { Send, ShieldAlert, Lock } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'client' | 'provider' | 'system';
  text: string;
  timestamp: string;
}

interface CoordinationChatProps {
  role: 'client' | 'provider';
  recipientName: string;
  recipientAvatar: string;
  isDemoMode: boolean;
  onSendMessage?: (text: string) => void;
}

export const CoordinationChat: React.FC<CoordinationChatProps> = ({
  role,
  recipientName,
  recipientAvatar,
  isDemoMode,
  onSendMessage
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mensajes iniciales de bienvenida / sistema
  useEffect(() => {
    setMessages([
      {
        id: 'system-1',
        sender: 'system',
        text: '🔒 Evento Confirmado & Pagado. Chat de coordinación abierto. Por seguridad, no compartas datos de contacto personales o enlaces de pago externos.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      {
        id: 'welcome-1',
        sender: role === 'client' ? 'provider' : 'client',
        text: role === 'client' 
          ? '¡Hola! Gracias por contratar mi servicio. Contame, ¿dónde nos encontramos o qué detalles especiales tenés para el evento?'
          : '¡Hola! Ya reservé el servicio. ¿Podríamos coordinar los horarios específicos y el equipamiento necesario?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [role, recipientName]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Detector de información de contacto externa
  const detectExternalContact = (text: string): boolean => {
    // 1. Emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
    // 2. Números telefónicos (8 o más dígitos consecutivos o separados por guiones/espacios)
    const phoneRegex = /(\b\+?\d{1,4}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{3,5}\b/;
    // 3. Palabras clave de canales externos
    const keywordRegex = /\b(whatsapp|wsp|wp|celular|cel|telefono|tel|instagram|ig|facebook|fb|mail|gmail|correo|link|enlace)\b/i;

    // Ignorar si el número es demasiado corto (ej: un precio o cantidad como 100)
    const matchesPhone = phoneRegex.test(text);
    const numbersOnly = text.replace(/\D/g, '');
    const isActualPhoneNumber = matchesPhone && numbersOnly.length >= 8;

    return emailRegex.test(text) || isActualPhoneNumber || keywordRegex.test(text);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const rawText = input.trim();
    
    // Verificar regla de seguridad de canales externos
    if (detectExternalContact(rawText)) {
      setSecurityWarning('⚠️ Para garantizar tu seguridad y mantener la cobertura de EventGo Pay, no compartas datos de contacto externos (teléfonos, emails o redes sociales) en el chat.');
      
      // Auto-eliminar la advertencia después de 5 segundos
      setTimeout(() => setSecurityWarning(null), 5000);
      return;
    }

    setSecurityWarning(null);
    setInput('');

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: role,
      text: rawText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, newMsg]);

    if (onSendMessage) {
      onSendMessage(rawText);
    }

    // Respuesta automática simulada en modo Demo
    if (isDemoMode) {
      setTimeout(() => {
        const replies = [
          '¡Perfecto! Anotado. Ya me pongo a preparar todo.',
          'Entendido. Llego unos 30 minutos antes para armar los equipos correspondientes.',
          'Excelente, contá con eso. Nos vemos en la fecha acordada.',
          '¡Buenísimo! Cualquier otro cambio me avisás por acá.'
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];
        
        setMessages((prev) => [
          ...prev,
          {
            id: `reply-${Date.now()}`,
            sender: role === 'client' ? 'provider' : 'client',
            text: randomReply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }, 1500);
    }
  };

  return (
    <div className="coordination-chat-wrap">
      {/* Cabecera del Chat */}
      <div className="coordination-chat-header">
        <div className="flex-items gap-sm">
          <div className="avatar-chat-status-wrap">
            <img src={recipientAvatar} alt={recipientName} className="chat-recipient-avatar" />
            <span className="recipient-status-dot online" />
          </div>
          <div>
            <h4 className="chat-recipient-name">{recipientName}</h4>
            <span className="chat-recipient-role">
              {role === 'client' ? '💼 Proveedor del Evento' : '🎉 Organizador / Cliente'}
            </span>
          </div>
        </div>
        <div className="chat-secure-badge">
          <Lock size={12} />
          <span>Seguro</span>
        </div>
      </div>

      {/* Caja de mensajes */}
      <div className="coordination-chat-body">
        {messages.map((msg) => (
          <div key={msg.id} className={`coordination-bubble-row ${msg.sender}`}>
            {msg.sender === 'system' ? (
              <div className="system-message-card">
                <ShieldAlert size={14} className="system-icon" />
                <p>{msg.text}</p>
              </div>
            ) : (
              <div className="bubble-contents">
                <div className="bubble-bubble">
                  <p>{msg.text}</p>
                </div>
                <span className="bubble-time">{msg.timestamp}</span>
              </div>
            )}
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Advertencia de Seguridad */}
      {securityWarning && (
        <div className="chat-security-alert-box animate-slide-up">
          <ShieldAlert size={16} className="alert-icon" />
          <p className="alert-text">{securityWarning}</p>
        </div>
      )}

      {/* Input de envío */}
      <form onSubmit={handleSend} className="coordination-chat-footer">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribí un mensaje..."
          className="coordination-chat-input"
        />
        <button type="submit" disabled={!input.trim()} className="coordination-chat-send-btn">
          <Send size={14} />
        </button>
      </form>
    </div>
  );
};
