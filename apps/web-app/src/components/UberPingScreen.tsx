import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, DollarSign, Award } from 'lucide-react';
import type { EventNotificationPayload } from '../hooks/useNotifications';
import './UberPingScreen.css';

interface UberPingScreenProps {
  payload: EventNotificationPayload | null;
  onAccept: (bookingId: string) => void;
  onDecline: (bookingId: string) => void;
  countdownSeconds?: number;
}

export const UberPingScreen: React.FC<UberPingScreenProps> = ({
  payload,
  onAccept,
  onDecline,
  countdownSeconds = 15,
}) => {
  const [timeLeft, setTimeLeft] = useState(countdownSeconds);
  const audioIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Sintetizador de Sonido Nativo (Web Audio API) ──────────
  const playNativeChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioCtx = new AudioContextClass();

      const playNote = (frequency: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, startTime);

        gainNode.gain.setValueAtTime(0.2, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = audioCtx.currentTime;
      playNote(523.25, now, 0.3);       // C5
      playNote(659.25, now + 0.12, 0.45); // E5
    } catch {
      console.warn('El navegador bloqueó el inicio automático de audio.');
    }
  };

  useEffect(() => {
    if (!payload) return;

    setTimeLeft(countdownSeconds);
    playNativeChime();

    audioIntervalRef.current = setInterval(() => {
      playNativeChime();
    }, 1800);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
          onDecline(payload.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, [payload, countdownSeconds]);

  if (!payload) return null;

  const radius = 50;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / countdownSeconds) * circumference;

  return (
    <AnimatePresence>
      <motion.div
        className="uber-ping-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="uber-ping-card"
          initial={{ scale: 0.9, y: 50, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 200 } }}
          exit={{ scale: 0.9, y: 50, opacity: 0 }}
        >
          {/* Luces decorativas */}
          <div className="uber-ping-glow-top" />
          <div className="uber-ping-glow-bottom" />

          {/* Cabecera */}
          <div className="uber-ping-header">
            <span className="uber-ping-pill">
              <Award size={14} />
              Oferta Geocercana
            </span>
            <h2 className="uber-ping-title">{payload.title}</h2>
          </div>

          {/* Temporizador Circular */}
          <div className="uber-ping-timer-container">
            <svg className="uber-ping-timer-svg" viewBox="0 0 128 128">
              <circle
                cx="64" cy="64" r={radius}
                className="uber-ping-timer-circle-bg"
                strokeWidth={strokeWidth}
              />
              <motion.circle
                cx="64" cy="64" r={radius}
                className="uber-ping-timer-circle-active"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </svg>
            <div className="uber-ping-timer-text-container">
              <span className="uber-ping-timer-number">{timeLeft}</span>
              <span className="uber-ping-timer-label">Segundos</span>
            </div>
          </div>

          {/* Grilla de Datos */}
          <div className="uber-ping-grid">
            <div className="uber-ping-grid-item">
              <DollarSign size={20} className="uber-ping-grid-icon-price" />
              <span className="uber-ping-grid-label">Pago</span>
              <span className="uber-ping-grid-value">${payload.price}</span>
            </div>
            <div className="uber-ping-grid-item uber-ping-grid-border">
              <MapPin size={20} className="uber-ping-grid-icon-distance" />
              <span className="uber-ping-grid-label">Distancia</span>
              <span className="uber-ping-grid-value">{payload.distanceKm} km</span>
            </div>
            <div className="uber-ping-grid-item">
              <Clock size={20} className="uber-ping-grid-icon-duration" />
              <span className="uber-ping-grid-label">Duración</span>
              <span className="uber-ping-grid-value">{payload.durationHours} hs</span>
            </div>
          </div>

          {/* Ubicación */}
          <div className="uber-ping-location-box">
            <div className="uber-ping-location-icon-wrapper">
              <MapPin size={16} />
            </div>
            <div className="uber-ping-location-details">
              <p className="uber-ping-location-text">{payload.location}</p>
              <p className="uber-ping-description-text">{payload.description}</p>
            </div>
          </div>

          {/* Acciones */}
          <div className="uber-ping-actions">
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.01 }}
              onClick={() => onAccept(payload.id)}
              className="uber-ping-btn-accept"
            >
              Aceptar Contratación
            </motion.button>
            <button
              onClick={() => onDecline(payload.id)}
              className="uber-ping-btn-decline"
            >
              Rechazar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
