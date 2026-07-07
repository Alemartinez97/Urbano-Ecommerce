import { useState, useCallback } from 'react';
import { useNotifications } from './hooks/useNotifications';
import type { EventNotificationPayload } from './hooks/useNotifications';
import { UberPingScreen } from './components/UberPingScreen';
import { IntegratedChat } from './components/IntegratedChat';
import { ShoppingCart, ShieldAlert, Award } from 'lucide-react';
import './App.css';
import './components/IntegratedChat.css';

// ── Servicios de prueba disponibles para contratar (E-Commerce) ──────────
const ECOMMERCE_CATALOG = [
  {
    id: 'prod-001',
    title: 'Mozo Profesional',
    description: 'Servicio de mozo con vestimenta formal para eventos y banquetes.',
    category: 'STAFF',
    price: 4500,
    distanceKm: 1.2,
    durationHours: 4,
    location: 'Palermo, CABA',
  },
  {
    id: 'prod-002',
    title: 'DJ con Sonido Premium',
    description: 'DJ profesional, luces led, máquina de humo y sonido de alta fidelidad.',
    category: 'MUSIC',
    price: 12000,
    distanceKm: 3.8,
    durationHours: 6,
    location: 'Recoleta, CABA',
  },
  {
    id: 'prod-003',
    title: 'Servicio de Catering Asado',
    description: 'Parrillero, cortes de carne premium, ensaladas y postres incluidos.',
    category: 'CATERING',
    price: 28000,
    distanceKm: 0.8,
    durationHours: 5,
    location: 'Villa Crespo, CABA',
  },
  {
    id: 'prod-004',
    title: 'Fotografía & Video HD',
    description: 'Cobertura completa del evento, fotos editadas y video resumen.',
    category: 'PHOTOGRAPHY',
    price: 15000,
    distanceKm: 2.1,
    durationHours: 5,
    location: 'Belgrano, CABA',
  },
];

interface ProviderProfile {
  activeServices: string[];
  hourlyRate: Record<string, number>;
}

function App() {
  const [role, setRole] = useState<'client' | 'provider'>('client');
  const [activePayload, setActivePayload] = useState<EventNotificationPayload | null>(null);
  
  // Proveedor State
  const [isOnline, setIsOnline] = useState(false);
  const [acceptedJobs, setAcceptedJobs] = useState<string[]>([]);
  const [declinedJobs, setDeclinedJobs] = useState<string[]>([]);
  const [providerProfile, setProviderProfile] = useState<ProviderProfile>({
    activeServices: ['STAFF'],
    hourlyRate: { STAFF: 4500, MUSIC: 12000, CATERING: 25000 },
  });

  // Cliente State (E-Commerce)
  const [cart, setCart] = useState<any[]>([]);
  const [eventLocation, setEventLocation] = useState('Av. del Libertador 1250, Palermo');
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'searching' | 'success'>('idle');

  // Callback para recibir notificaciones en pantalla tipo Uber
  const handleInAppNotification = useCallback((payload: EventNotificationPayload) => {
    setActivePayload(payload);
  }, []);

  const { permission, requestPermission, sendNotification } = useNotifications(handleInAppNotification);

  // Simular envío de oferta (cuando el cliente realiza el Checkout)
  const triggerNotificationToProvider = (item: any) => {
    if (!isOnline) {
      console.warn('El proveedor no está conectado. Active "Conectado" en el panel del proveedor.');
      return;
    }
    const payload: EventNotificationPayload = {
      id: `booking-${Date.now()}-${item.id}`,
      title: `${item.title} - Solicitud de Evento`,
      description: item.description || 'Contratación instantánea mediante el carrito.',
      category: item.category,
      price: item.price,
      distanceKm: item.distanceKm,
      durationHours: item.durationHours,
      startTime: new Date(Date.now() + 3600000 * 3).toISOString(),
      endTime: new Date(Date.now() + 3600000 * 7).toISOString(),
      location: eventLocation,
    };
    sendNotification(payload);
  };

  const handleAccept = (bookingId: string) => {
    setAcceptedJobs((prev) => [...prev, bookingId]);
    setActivePayload(null);
    setCheckoutStatus('success');
  };

  const handleDecline = (bookingId: string) => {
    setDeclinedJobs((prev) => [...prev, bookingId]);
    setActivePayload(null);
    setCheckoutStatus('idle');
  };

  const handleToggleService = (service: string) => {
    setProviderProfile((prev) => {
      const active = prev.activeServices.includes(service)
        ? prev.activeServices.filter((s) => s !== service)
        : [...prev.activeServices, service];
      return { ...prev, activeServices: active };
    });
  };

  const handleRateChange = (service: string, val: number) => {
    setProviderProfile((prev) => ({
      ...prev,
      hourlyRate: { ...prev.hourlyRate, [service]: val },
    }));
  };

  const addToCart = (product: any) => {
    if (cart.find((item) => item.id === product.id)) return;
    setCart((prev) => [...prev, product]);
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setCheckoutStatus('searching');
    
    // Disparar las notificaciones para cada ítem en el carrito que corresponda a los roles del proveedor
    cart.forEach((item) => {
      // Solo notificar si el proveedor ofrece este servicio
      if (providerProfile.activeServices.includes(item.category)) {
        triggerNotificationToProvider(item);
      }
    });

    // Simular un timeout por si el proveedor no responde
    setTimeout(() => {
      setCheckoutStatus((current) => (current === 'searching' ? 'idle' : current));
    }, 15000);
  };

  const getCategoryEmoji = (category: string) => {
    const map: Record<string, string> = {
      STAFF: '🤵',
      MUSIC: '🎵',
      CATERING: '🍽️',
      VENUE: '🏢',
      PHOTOGRAPHY: '📸',
      DECORATION: '🎨',
    };
    return map[category] || '📦';
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.price, 0);
  };

  return (
    <div className="app-container">
      {/* Uber Ping Overlay */}
      <UberPingScreen
        payload={activePayload}
        onAccept={handleAccept}
        onDecline={handleDecline}
        countdownSeconds={15}
      />

      {/* Header */}
      <header className="app-header">
        <div className="app-header-left">
          <h1 className="app-logo">Event<span className="app-logo-accent">Go</span></h1>
          <span className="app-header-badge">
            {role === 'client' ? 'Panel Organizador' : 'Panel Proveedor'}
          </span>
        </div>
        
        {/* Switcher de Roles */}
        <div className="app-header-right">
          <div className="role-selector-tabs">
            <button
              className={`role-tab ${role === 'client' ? 'active' : ''}`}
              onClick={() => setRole('client')}
            >
              Organizar Evento
            </button>
            <button
              className={`role-tab ${role === 'provider' ? 'active' : ''}`}
              onClick={() => setRole('provider')}
            >
              Trabajar (Proveedor)
            </button>
          </div>

          {role === 'provider' && (
            <>
              <div className={`app-status-indicator ${isOnline ? 'online' : 'offline'}`} />
              <button
                className={`app-toggle-btn ${isOnline ? 'active' : ''}`}
                onClick={() => setIsOnline(!isOnline)}
              >
                {isOnline ? 'Conectado' : 'Desconectado'}
              </button>
            </>
          )}
        </div>
      </header>

      {role === 'client' ? (
        /* ==================== PANEL DEL CLIENTE ==================== */
        <main className="app-main client-layout">
          {/* Columna Izquierda: E-Commerce Catalog & Carrito */}
          <section className="panel panel-status">
            <h2 className="panel-title">E-Commerce de Servicios</h2>
            <p className="panel-subtitle">Agregá servicios y cotizá instantáneamente.</p>

            <div className="catalog-list">
              {ECOMMERCE_CATALOG.map((prod) => (
                <div key={prod.id} className="catalog-item-card">
                  <div className="catalog-item-header">
                    <span className="catalog-item-emoji">{getCategoryEmoji(prod.category)}</span>
                    <span className="catalog-item-category">{prod.category}</span>
                  </div>
                  <h3 className="catalog-item-title">{prod.title}</h3>
                  <p className="catalog-item-desc">{prod.description}</p>
                  <div className="catalog-item-meta">
                    <span className="price-tag">${prod.price.toLocaleString()}</span>
                    <span>📍 {prod.distanceKm} km</span>
                  </div>
                  <button 
                    className="btn-add-cart" 
                    onClick={() => addToCart(prod)}
                    disabled={cart.some((item) => item.id === prod.id)}
                  >
                    {cart.some((item) => item.id === prod.id) ? 'Agregado' : 'Añadir al Evento'}
                  </button>
                </div>
              ))}
            </div>

            {/* Carrito del Evento */}
            <div className="cart-card">
              <h3 className="panel-title flex-items">
                <ShoppingCart size={16} /> Carrito de Contratación
              </h3>
              
              {cart.length === 0 ? (
                <p className="status-description-small">El carrito está vacío. Agregá servicios desde el catálogo o solicitáselos al Chatbot.</p>
              ) : (
                <>
                  <div className="cart-items-list">
                    {cart.map((item) => (
                      <div key={item.id} className="cart-item">
                        <div className="cart-item-info">
                          <span className="cart-item-title">{item.title}</span>
                          <span className="cart-item-meta">📍 {item.distanceKm} km | {item.durationHours} hs</span>
                        </div>
                        <div className="flex-items">
                          <span className="cart-item-price">${item.price.toLocaleString()}</span>
                          <button className="cart-remove-btn" onClick={() => removeFromCart(item.id)}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="cart-summary">
                    <div className="cart-summary-row">
                      <span>Ubicación del Evento:</span>
                      <input 
                        type="text" 
                        value={eventLocation} 
                        onChange={(e) => setEventLocation(e.target.value)} 
                        className="event-location-input" 
                      />
                    </div>
                    <div className="cart-summary-row total">
                      <span>Presupuesto Total:</span>
                      <span>${calculateTotal().toLocaleString()}</span>
                    </div>

                    {checkoutStatus === 'searching' ? (
                      <div className="matching-radar-container">
                        <div className="radar-circle" />
                        <span className="radar-text">Buscando proveedores geocercanos activos...</span>
                      </div>
                    ) : checkoutStatus === 'success' ? (
                      <div className="success-banner">
                        ¡Reserva Confirmada y Proveedores Asignados!
                      </div>
                    ) : (
                      <button 
                        className="btn-checkout" 
                        onClick={handleCheckout}
                        disabled={!isOnline}
                      >
                        {isOnline ? 'Confirmar y Enviar Pings' : 'Active "Conectado" en la otra pestaña'}
                      </button>
                    )}
                    
                    {!isOnline && (
                      <p className="warning-text">
                        <ShieldAlert size={12} /> Para probar el simulador local, cambiate a "Trabajar" y activá el estado "Conectado".
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Columna Derecha: Chatbot AI */}
          <section className="panel panel-simulator">
            <h2 className="panel-title">Asistente Virtual Niddo</h2>
            <p className="panel-subtitle">Planificá tu presupuesto y requerimientos con Inteligencia Artificial.</p>
            <IntegratedChat onAddServiceToCart={addToCart} />
          </section>
        </main>
      ) : (
        /* ==================== PANEL DEL PROVEEDOR ==================== */
        <main className="app-main provider-layout">
          {/* Columna Izquierda: Configuración de Servicios / Perfil */}
          <section className="panel panel-status">
            <h2 className="panel-title">Tu Perfil de Proveedor</h2>
            <p className="panel-subtitle">Habilitá múltiples roles y gestioná tus tarifas por hora.</p>

            <div className="status-card">
              <span className="status-label">Servicios Habilitados</span>
              <div className="services-checkbox-list">
                {['STAFF', 'MUSIC', 'CATERING', 'PHOTOGRAPHY'].map((srv) => (
                  <div key={srv} className="service-checkbox-row">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={providerProfile.activeServices.includes(srv)}
                        onChange={() => handleToggleService(srv)}
                      />
                      <span>{getCategoryEmoji(srv)} {srv === 'STAFF' ? 'Mozo / Ayudante' : srv === 'MUSIC' ? 'DJ' : srv === 'CATERING' ? 'Catering' : 'Fotógrafo'}</span>
                    </label>
                    {providerProfile.activeServices.includes(srv) && (
                      <input
                        type="number"
                        value={providerProfile.hourlyRate[srv] || ''}
                        onChange={(e) => handleRateChange(srv, +e.target.value)}
                        className="rate-input"
                        placeholder="Tarifa/hr"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Permisos de Notificación */}
            <div className="status-card">
              <div className="status-card-header">
                <span className="status-label">Notificaciones del OS</span>
                <span className={`permission-badge ${permission === 'granted' ? 'granted' : 'pending'}`}>
                  {permission === 'granted' ? '✓ Activas' : 'Pendiente'}
                </span>
              </div>
              {permission !== 'granted' && (
                <button className="btn-enable-notifications" onClick={requestPermission}>
                  Activar Notificaciones Nativas
                </button>
              )}
            </div>

            {/* Resumen de Actividad */}
            <div className="activity-summary">
              <div className="activity-item accepted">
                <span className="activity-count">{acceptedJobs.length}</span>
                <span className="activity-label">Aceptados</span>
              </div>
              <div className="activity-divider" />
              <div className="activity-item declined">
                <span className="activity-count">{declinedJobs.length}</span>
                <span className="activity-label">Rechazados</span>
              </div>
            </div>
          </section>

          {/* Columna Derecha: Trabajos Asignados */}
          <section className="panel panel-simulator">
            <h2 className="panel-title">Tus Eventos y Ofertas Recibidas</h2>
            <p className="panel-subtitle">Aquí verás los eventos en los que estás contratado para trabajar.</p>

            {acceptedJobs.length === 0 ? (
              <div className="no-events-placeholder">
                <Award size={36} />
                <p>No tenés eventos contratados actualmente. Conectate y esperá las ofertas del Organizador.</p>
              </div>
            ) : (
              <div className="event-cards-grid">
                {acceptedJobs.map((jobId) => (
                  <div key={jobId} className="event-card accepted-job-card">
                    <div className="event-card-top">
                      <span className="event-card-category">CONTRATADO</span>
                    </div>
                    <h3 className="event-card-title">Servicio Aceptado</h3>
                    <p className="event-card-description">Estás asignado para prestar este servicio en la ubicación y fecha del evento.</p>
                    <div className="event-card-meta">
                      <span className="meta-item price">Confirmado</span>
                      <span className="meta-item distance">📍 Activo</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      {/* Footer */}
      <footer className="app-footer">
        <span>EventGo — E-Commerce exprés y matching instantáneo on-demand</span>
      </footer>
    </div>
  );
}

export default App;
