// ==========================================
// EventGo - Background Service Worker
// Maneja las notificaciones Push nativas del OS
// ==========================================

self.addEventListener('push', (event) => {
  let data = {
    title: 'Nuevo Evento Disponbile',
    body: 'Hay una contratación disponible cerca de tu ubicación.',
    icon: '/vite.svg',
    badge: '/vite.svg'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/vite.svg',
    badge: data.badge || '/vite.svg',
    vibrate: [200, 100, 200], // Patrón de vibración móvil
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Ver Detalles' },
      { action: 'close', title: 'Cerrar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Al hacer click en la notificación nativa
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Abre la aplicación o la enfoca si ya está abierta
  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    let matchingClient = null;

    for (let i = 0; i < windowClients.length; i++) {
      const windowClient = windowClients[i];
      if (windowClient.url === urlToOpen) {
        matchingClient = windowClient;
        break;
      }
    }

    if (matchingClient) {
      return matchingClient.focus();
    } else {
      return clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});
