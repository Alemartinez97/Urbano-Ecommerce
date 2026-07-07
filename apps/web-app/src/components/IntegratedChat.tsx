import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatWindowProps {
  onAddServiceToCart?: (service: any) => void;
}

export const IntegratedChat: React.FC<ChatWindowProps> = ({ onAddServiceToCart }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    
    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: userText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Intentar llamar al backend del chatbot (Next.js corriendo en puerto 3000 o mediante proxy local /api/chat)
      // Como estamos en un microservicio separado (puerto 5173 para Vite y 3000 para Next.js),
      // llamamos directamente a http://localhost:3000/api/chat
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Error de comunicación con el chatbot.');
      }

      // El chatbot maneja streaming o respuesta JSON.
      // Leemos la respuesta.
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      
      const assistantMessageId = `msg-${Date.now()}-assistant`;
      
      setMessages((prev) => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          
          // El stream del AI SDK de Vercel a veces viene con tags de datos (e.g. 0:"texto").
          // Hacemos una limpieza básica para el prototipo en vivo:
          const lines = chunk.split('\n').filter(Boolean);
          for (const line of lines) {
            // Intentar detectar si viene en formato Vercel stream protocol
            if (line.startsWith('0:')) {
              // Extraer contenido entre comillas
              const textMatch = line.match(/^0:"(.*)"$/);
              if (textMatch) {
                assistantText += JSON.parse(`"${textMatch[1]}"`);
              } else {
                // Fallback para strings simples sin comillas
                assistantText += line.substring(2).replace(/"/g, '');
              }
            } else if (!line.startsWith('d:') && !line.startsWith('e:')) {
              // Si no tiene prefijo del protocolo, agregamos el texto crudo
              assistantText += line;
            }
          }

          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMessageId ? { ...m, content: assistantText } : m))
          );
        }
      }
    } catch (error) {
      console.error('Error in chat:', error);
      // Fallback local simulado en caso de que Next.js no esté disponible de inmediato
      setTimeout(() => {
        let reply = 'Disculpa, no pude conectar con mi motor principal de inteligencia artificial. ';
        if (userText.toLowerCase().includes('mozo') || userText.toLowerCase().includes('staff')) {
          reply += 'Sin embargo, encontré un Mozo disponible a 1.2km por $4,500/hr. ¿Querés agregarlo al presupuesto del evento?';
        } else if (userText.toLowerCase().includes('dj') || userText.toLowerCase().includes('musica') || userText.toLowerCase().includes('música')) {
          reply += 'Encontré un servicio de DJ con equipo de sonido premium a 3.8km por $12,000 la jornada. ¿Querés sumarlo?';
        } else {
          reply += '¿Podrías indicarme qué servicios requerís para tu evento (Mozo, DJ, Catering)? Así busco las mejores opciones por cercanía.';
        }
        
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-assistant-err`,
            role: 'assistant',
            content: reply,
          },
        ]);
      }, 800);
    } finally {
      setIsLoading(false);
    }
  };

  // Simular acción de agregar un servicio recomendado al carrito
  const handleAddSuggested = (category: string, name: string, price: number) => {
    if (onAddServiceToCart) {
      onAddServiceToCart({
        id: `suggested-${Date.now()}`,
        title: name,
        category,
        price,
        distanceKm: +(Math.random() * 4 + 0.5).toFixed(1),
        durationHours: 5,
        location: 'Ubicación recomendada',
        description: 'Servicio sugerido por el Asistente AI',
      });
    }
  };

  return (
    <div className="integrated-chat-container">
      <div className="chat-header">
        <Sparkles size={16} className="chat-sparkles" />
        <div>
          <h3 className="chat-title">Niddo Chatbot</h3>
          <p className="chat-subtitle">Asistente AI de Eventos</p>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <Bot size={28} className="chat-welcome-icon" />
            <p>¡Hola! Contame qué evento estás organizando y te ayudo a presupuestar y encontrar proveedores geocercanos al mejor precio.</p>
            <div className="suggested-prompts">
              <button onClick={() => setInput('Necesito mozos para un almuerzo ejecutivo hoy')}>🤵 Buscar Mozos</button>
              <button onClick={() => setInput('Quiero contratar un DJ para una fiesta de 50 personas')}>🎵 Contratar DJ</button>
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`chat-bubble-wrapper ${m.role}`}>
              <div className="chat-avatar">
                {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div className="chat-bubble">
                <p className="chat-text">{m.content}</p>
                {/* Renderizar atajos interactivos según el contexto de la respuesta */}
                {m.role === 'assistant' && m.content.toLowerCase().includes('mozo') && (
                  <button 
                    className="btn-chat-action" 
                    onClick={() => handleAddSuggested('STAFF', 'Servicio de Mozo Premium', 4500)}
                  >
                    + Agregar Mozo ($4,500/hr)
                  </button>
                )}
                {m.role === 'assistant' && (m.content.toLowerCase().includes('dj') || m.content.toLowerCase().includes('música')) && (
                  <button 
                    className="btn-chat-action" 
                    onClick={() => handleAddSuggested('MUSIC', 'DJ de Evento Premium', 12000)}
                  >
                    + Agregar DJ ($12,000)
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="chat-bubble-wrapper assistant">
            <div className="chat-avatar"><Bot size={14} /></div>
            <div className="chat-bubble loading">
              <Loader2 size={16} className="animate-spin" />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribile al asistente..."
          className="chat-input-field"
        />
        <button type="submit" disabled={!input.trim() || isLoading} className="chat-send-btn">
          <Send size={14} />
        </button>
      </form>
    </div>
  );
};
