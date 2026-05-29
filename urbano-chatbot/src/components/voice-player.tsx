"use client";

import { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";

interface VoicePlayerProps {
  text: string;
}

export function VoicePlayer({ text }: VoicePlayerProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [synth, setSynth] = useState<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      setSynth(window.speechSynthesis);
    }
  }, []);

  const cleanTextForSpeech = (rawText: string) => {
    // Elimina bloques de código Markdown, enlaces, asteriscos e identificadores de herramientas
    return rawText
      .replace(/```[\s\S]*?```/g, "") // Bloques de código
      .replace(/`([^`]+)`/g, "$1") // Código en línea
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // Enlaces
      .replace(/[*#_\-\[\]]/g, "") // Símbolos especiales
      .trim();
  };

  const handleSpeak = () => {
    if (!synth) return;

    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = cleanTextForSpeech(text);
    if (!textToSpeak) return;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    // Buscar una voz en español disponible
    const voices = synth.getVoices();
    const spanishVoice = voices.find(
      (v) => v.lang.startsWith("es-") || v.lang.toLowerCase().includes("spanish")
    );
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.lang = "es-ES";
    utterance.rate = 1.05; // Ritmo sutilmente rápido para simular fluidez natural
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    synth.cancel(); // Detener cualquier reproducción previa
    synth.speak(utterance);
    setIsSpeaking(true);
  };

  // Detener la síntesis de voz al desmontar el componente
  useEffect(() => {
    return () => {
      if (synth) {
        synth.cancel();
      }
    };
  }, [synth]);

  if (!synth) return null;

  return (
    <button
      onClick={handleSpeak}
      className={`p-1.5 rounded-lg border border-white/5 transition-all cursor-pointer ${
        isSpeaking
          ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30 neon-glow-primary scale-105"
          : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/10"
      }`}
      title={isSpeaking ? "Silenciar audio" : "Escuchar respuesta en voz alta"}
    >
      {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
    </button>
  );
}
