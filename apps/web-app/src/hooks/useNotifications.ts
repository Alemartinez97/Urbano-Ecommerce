import { useState, useEffect, useCallback } from 'react';

// Formato de datos de una oferta de servicio recibida por el proveedor
export interface EventNotificationPayload {
  id: string; // BookingId
  title: string; // Ej: "Almuerzo de Fin de Año"
  description: string; // Detalles del servicio
  category: string; // Ej: "STAFF" o "CATERING"
  price: number; // Tarifa a cobrar
  distanceKm: number; // Distancia calculada con Haversine
  durationHours: number; // Duración en horas
  startTime: string;
  endTime: string;
  location: string;
}

export const useNotifications = (onInAppReceived?: (payload: EventNotificationPayload) => void) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Registrar el Service Worker al montar el hook
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then((reg) => {
          console.log('Service Worker registrado exitosamente en el frontend:', reg.scope);
          setSwRegistration(reg);
        })
        .catch((err) => {
          console.error('Error al registrar Service Worker:', err);
        });
    }

    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Solicitar permisos al usuario de manera nativa
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('Las notificaciones de escritorio no están soportadas en este navegador.');
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Error al solicitar permisos de notificación:', error);
      return 'default';
    }
  }, []);

  // Disparador de notificaciones inteligente:
  // - Si el usuario está viendo la pestaña, se llama al callback in-app (pantalla de ping).
  // - Si está en otra pestaña o minimizado, dispara una notificación nativa del OS.
  const sendNotification = useCallback((payload: EventNotificationPayload) => {
    if (document.visibilityState === 'visible') {
      if (onInAppReceived) {
        onInAppReceived(payload);
      }
    } else {
      if (permission === 'granted') {
        const title = `¡Oferta de Trabajo Cerca! - ${payload.title}`;
        const options: NotificationOptions = {
          body: `Tarifa: $${payload.price} | Distancia: ${payload.distanceKm} km | Categoría: ${payload.category}`,
          icon: '/vite.svg',
          badge: '/vite.svg',
          data: {
            url: '/'
          }
        };

        if (swRegistration) {
          swRegistration.showNotification(title, options);
        } else {
          new Notification(title, options);
        }
      } else {
        // Si no hay permisos del OS, forzamos la alerta in-app por si regresa
        if (onInAppReceived) {
          onInAppReceived(payload);
        }
      }
    }
  }, [permission, swRegistration, onInAppReceived]);

  return {
    permission,
    requestPermission,
    sendNotification,
  };
};
