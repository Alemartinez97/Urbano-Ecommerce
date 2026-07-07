import { useState, useCallback, useEffect } from 'react';
import { useNotifications } from './hooks/useNotifications';
import type { EventNotificationPayload } from './hooks/useNotifications';
import { UberPingScreen } from './components/UberPingScreen';
import { IntegratedChat } from './components/IntegratedChat';
import { ShoppingCart, ShieldAlert, Award, Sliders, Zap, CheckCircle2, Play, Compass, Ticket, Coins, CreditCard, Calendar, Clock, Star, MessageSquare, Tag, Plus, Minus, RefreshCw, User, HelpCircle, Bell, Briefcase, LogOut, ChevronRight, Heart, MapPin, X } from 'lucide-react';
import { calculateCartTotal } from './utils/pricing';
import { LoginScreen } from './components/LoginScreen';
import type { SessionUser } from './components/LoginScreen';
import { apiService, EVENT_CATEGORIES } from './services/apiService';
import './App.css';
import './components/IntegratedChat.css';

// ── Proveedores simulados en la geocerca (ordenados por distancia) ─────────
// Esto simula lo que devolvería el LocationService con Haversine en el backend.
// Si hay 5 DJs cerca → alta oferta → precio base (1.0x).
const NEARBY_PROVIDERS = [
  { id: 'prov-001', name: 'Carlos Maidana',  categoryLabel: '🎵 DJ & Sonido',      category: 'MUSIC',       distanceKm: 0.6,  online: true  },
  { id: 'prov-002', name: 'Rodrigo Serna',   categoryLabel: '🎵 DJ & Sonido',      category: 'MUSIC',       distanceKm: 1.1,  online: true  },
  { id: 'prov-003', name: 'Lucas Díaz',      categoryLabel: '🤵 Staff & Mozos',    category: 'STAFF',       distanceKm: 1.2,  online: true  },
  { id: 'prov-004', name: 'Marta Ibáñez',    categoryLabel: '🍽️ Catering',        category: 'CATERING',    distanceKm: 0.8,  online: true  },
  { id: 'prov-005', name: 'Tomás Ferreyra',  categoryLabel: '🎵 DJ & Sonido',      category: 'MUSIC',       distanceKm: 2.3,  online: true  },
  { id: 'prov-006', name: 'Ana Bertolini',   categoryLabel: '🎵 DJ & Sonido',      category: 'MUSIC',       distanceKm: 3.1,  online: true  },
  { id: 'prov-007', name: 'Nicolás Paz',     categoryLabel: '📸 Foto & Video',     category: 'PHOTOGRAPHY', distanceKm: 2.1,  online: true  },
  { id: 'prov-008', name: 'Julia Méndez',    categoryLabel: '🎵 DJ & Sonido',      category: 'MUSIC',       distanceKm: 4.5,  online: false },
];


interface ExtraItem {
  name: string;
  price: number;
}

interface CartItem {
  id: string;
  title: string;
  basePrice: number;
  category: string;
  distanceKm: number;
  selectedExtras: ExtraItem[];
  price: number; // basePrice + extras sum
  quantity: number; // PedidosYa selector
}

// Estados del timeline de tracking
const TRACKING_STEPS = [
  { key: 'assigned', label: 'Asignado' },
  { key: 'preparing', label: 'Preparando Equipamiento' },
  { key: 'on_the_way', label: 'En Camino' },
  { key: 'arrived', label: 'En el Evento' },
  { key: 'completed', label: 'Finalizado' },
];

function App() {
  // ── Sesión de usuario ──────────────────────────────────────────────────────
  // null = no logueado → muestra LoginScreen
  const [session, setSession] = useState<SessionUser | null>(null);

  // El rol lo determina la sesión: 'client' o 'provider'
  const role = session?.role ?? 'client';

  // Cambio de rol sin cerrar sesión (solo desde Perfil → Configuración)
  const switchRole = (newRole: 'client' | 'provider') => {
    if (session) {
      setSession({ ...session, role: newRole });
      // Resetear estados transitorios al cambiar de rol
      setCart([]);
      setCheckoutStatus('idle');
      setActivePayload(null);
      setIsOnline(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    setShowProfileDrawer(false);
    setCart([]);
    setCheckoutStatus('idle');
    setActivePayload(null);
    setIsOnline(false);
  };

  const [activePayload, setActivePayload] = useState<EventNotificationPayload | null>(null);

  // Simulación de tarifa dinámica activa por slider/selector (Oferta/Demanda)
  const [demandState, setDemandState] = useState<'normal' | 'high' | 'surge'>('normal');
  const [multiplier, setMultiplier] = useState(1.0);

  useEffect(() => {
    if (demandState === 'normal') setMultiplier(1.0);
    else if (demandState === 'high') setMultiplier(1.15);
    else if (demandState === 'surge') setMultiplier(1.35);
  }, [demandState]);


  // Conexión y escucha de WebSocket en tiempo real (Demo o Real API)
  useEffect(() => {
    if (!session) return;

    const socket = apiService.setupWebSocket(role, session.email, (event, payload) => {
      console.log(`[WebSocket Event] Received: ${event}`, payload);

      if (event === 'provider-ping') {
        // Proveedor recibe la alerta de servicio
        setActivePayload(payload);
      } else if (event === 'booking-status-updated') {
        // Cliente recibe actualizaciones del estado del servicio
        setCurrentJobStatus(payload.status);
        if (payload.status === 'assigned') {
          setCheckoutStatus('success');
          // Agregar al listado de trabajos si no está
          const job = {
            id: payload.bookingId || `booking-${Date.now()}`,
            title: payload.title || 'Servicio de Evento',
            price: payload.price || 5000,
            location: payload.location || eventLocation,
            status: 'assigned',
          };
          setAcceptedJobs([job]);
        } else if (payload.status === 'completed') {
          setCheckoutStatus('idle');
          setCart([]);
        }
      }
    });

    return () => {
      if (socket) {
        // @ts-ignore
        socket.disconnect();
      }
    };
  }, [session, role]);

  // Proveedor State
  const [isOnline, setIsOnline] = useState(false);
  const [acceptedJobs, setAcceptedJobs] = useState<any[]>([]);
  const [declinedJobs, setDeclinedJobs] = useState<string[]>([]);
  
  // Sincronización del estado del evento para el cliente
  const [currentJobStatus, setCurrentJobStatus] = useState<string>('assigned');

  // Cliente State (E-Commerce)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [eventLocation, setEventLocation] = useState('Av. del Libertador 1250, Palermo');
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'searching' | 'success'>('idle');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [subCategoryFilter, setSubCategoryFilter] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'distance' | 'price' | 'rating'>('distance');

  // Catálogo dinámico (Demo o Real API)
  const [catalog, setCatalog] = useState<any[]>([]);

  useEffect(() => {
    if (!session) return;
    apiService.getProviders(categoryFilter, subCategoryFilter)
      .then(data => setCatalog(data))
      .catch(err => console.error("Error al cargar el catálogo:", err));
  }, [session, categoryFilter, subCategoryFilter]);

  // Estados para el registro de negocio / configuración de proveedor
  const [providerCategory, setProviderCategory] = useState('STAFF');
  const [providerSubCategory, setProviderSubCategory] = useState('waiter');
  const [providerRate, setProviderRate] = useState(5000);
  const [providerRadius, setProviderRadius] = useState(5);
  const [providerBio, setProviderBio] = useState('');
  const [providerEntityType, setProviderEntityType] = useState<'individual' | 'company'>('individual');
  const [providerServiceTitle, setProviderServiceTitle] = useState('');

  // Profile Drawer State (PedidosYa Profile View)
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showProviderSetupModal, setShowProviderSetupModal] = useState(false);

  // Uber Reserve Date/Time Picker States
  const [eventDate, setEventDate] = useState('2026-07-08');
  const [eventStartTime, setEventStartTime] = useState('21:00');
  const [eventEndTime, setEventEndTime] = useState('02:00');

  // Reasignación automática si el proveedor está ocupado (PedidosYa Substitution flow)
  const [substitutionPolicy, setSubstitutionPolicy] = useState<'auto_match' | 'cancel'>('auto_match');

  // PedidosYa Past Orders State
  const [pastOrders, setPastOrders] = useState([
    { id: 'past-1', title: 'Servicio de Mozos en Palermo', date: '23 de Jun - 21:58 hs', price: 13409, category: 'STAFF', reviewed: false },
    { id: 'past-2', title: 'DJ Fiesta Fin de Año', date: '16 de Jun - 09:02 hs', price: 11609, category: 'MUSIC', reviewed: false },
    { id: 'past-3', title: 'Catering Asado Villa Crespo', date: '14 de Jun - 22:34 hs', price: 20958, category: 'CATERING', reviewed: false },
  ]);

  // Rating Modal
  const [reviewingOrder, setReviewingOrder] = useState<any | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Estados del Panel de Simulación
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [showSimPanel, setShowSimPanel] = useState(false);

  // PedidosYa Checkout Customizations
  const [tip, setTip] = useState<number>(0);
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'eventgopay'>('card');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  // Modal de Personalización (PedidosYa Style)
  const [customizingItem, setCustomizingItem] = useState<any | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<ExtraItem[]>([]);

  // Callback para recibir notificaciones en pantalla tipo Uber
  const handleInAppNotification = useCallback((payload: EventNotificationPayload) => {
    setActivePayload(payload);
  }, []);

  const { sendNotification } = useNotifications(handleInAppNotification);

  // Simular envío de oferta (cuando el cliente realiza el Checkout)
  const triggerNotificationToProvider = (item: CartItem) => {
    if (!isOnline) {
      console.warn('El proveedor no está conectado.');
      return;
    }
    
    // Calculamos el precio total incluyendo cantidad, propinas/descuentos ponderados si corresponde
    const baseTotals = calculateCartTotal([{ ...item, name: item.title }], multiplier);
    const itemDeliveryFee = Math.round(item.distanceKm * 250);
    const finalProductPrice = (baseTotals.total * item.quantity) + itemDeliveryFee;
    
    const payload: EventNotificationPayload = {
      id: `booking-${Date.now()}-${item.id}`,
      title: `${item.title} (x${item.quantity} Personalizado)`,
      description: `Extras: ${item.selectedExtras.map(e => e.name).join(', ') || 'Ninguno'}. Fecha Reserva: ${eventDate} a las ${eventStartTime} hs.`,
      category: item.category,
      price: finalProductPrice,
      distanceKm: item.distanceKm,
      durationHours: 5,
      startTime: `${eventDate}T${eventStartTime}:00`,
      endTime: `${eventDate}T${eventEndTime}:00`,
      location: eventLocation,
    };
    sendNotification(payload);
  };

  const handleAccept = (bookingId: string) => {
    const job = {
      id: bookingId,
      title: activePayload?.title ?? 'Servicio Contratado',
      price: activePayload?.price ?? 0,
      location: activePayload?.location ?? eventLocation,
      status: 'assigned',
    };
    setAcceptedJobs((prev) => [...prev, job]);
    setCurrentJobStatus('assigned');
    setActivePayload(null);
    setCheckoutStatus('success');
  };

  const handleDecline = (bookingId: string) => {
    setDeclinedJobs((prev) => [...prev, bookingId]);
    setActivePayload(null);
    setCheckoutStatus('idle');
  };

  const openCustomizer = (product: any) => {
    setCustomizingItem(product);
    setSelectedExtras([]);
  };

  const toggleExtra = (extra: ExtraItem) => {
    setSelectedExtras((prev) =>
      prev.some((e) => e.name === extra.name)
        ? prev.filter((e) => e.name !== extra.name)
        : [...prev, extra]
    );
  };

  const confirmCustomization = () => {
    if (!customizingItem) return;

    // Calcular el precio acumulado de este item individual (basePrice + extras)
    const extrasPriceSum = selectedExtras.reduce((sum, e) => sum + e.price, 0);
    const finalItemPrice = customizingItem.price + extrasPriceSum;

    const newCartItem: CartItem = {
      id: `${customizingItem.id}-${Date.now()}`,
      title: customizingItem.title,
      basePrice: customizingItem.price,
      category: customizingItem.category,
      distanceKm: customizingItem.distanceKm,
      selectedExtras: selectedExtras,
      price: finalItemPrice,
      quantity: 1,
    };

    setCart((prev) => [...prev, newCartItem]);
    setCustomizingItem(null);
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setCheckoutStatus('searching');

    if (apiService.getMode() === 'real') {
      try {
        await apiService.createBooking({
          clientEmail: session?.email,
          items: cart.map(item => ({
            providerId: item.id,
            category: item.category,
            price: item.price,
            quantity: item.quantity,
            distanceKm: item.distanceKm
          })),
          totalPrice: finalGrandTotal,
          deliveryFee,
          tip,
          discount: appliedDiscount,
          location: eventLocation
        });
      } catch (err) {
        console.error("Error al crear reserva en backend real:", err);
      }
    } else {
      // Modo Demo: Notificar al proveedor de forma simulada
      cart.forEach((item) => {
        triggerNotificationToProvider(item);
      });

      // Simular un timeout de 15s si el proveedor ignora la alerta
      setTimeout(() => {
        setCheckoutStatus((current) => (current === 'searching' ? 'idle' : current));
      }, 15000);
    }
  };

  // El proveedor avanza los estados del tracking
  const advanceJobStatus = (jobId: string) => {
    const currentIndex = TRACKING_STEPS.findIndex((s) => s.key === currentJobStatus);
    if (currentIndex < TRACKING_STEPS.length - 1) {
      const nextStatus = TRACKING_STEPS[currentIndex + 1].key;
      setCurrentJobStatus(nextStatus);
      setAcceptedJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: nextStatus } : j))
      );
    } else if (currentJobStatus === 'completed') {
      // Completado: añadir este trabajo aceptado al historial de contrataciones en la vista del cliente
      const newPastOrder = {
        id: `past-${Date.now()}`,
        title: acceptedJobs[0]?.title || 'Servicio Finalizado',
        date: 'Hoy — Completado',
        price: finalGrandTotal,
        category: 'STAFF',
        reviewed: false,
      };
      setPastOrders((prev) => [newPastOrder, ...prev]);
      setAcceptedJobs([]);
      setCart([]);
      setCheckoutStatus('idle');
    }
  };

  const submitReview = () => {
    if (!reviewingOrder) return;
    setPastOrders((prev) =>
      prev.map((o) => (o.id === reviewingOrder.id ? { ...o, reviewed: true } : o))
    );
    setReviewingOrder(null);
    setReviewComment('');
    setRating(5);
  };

  const applyCoupon = () => {
    setCouponError('');
    setCouponSuccess('');
    const code = couponCode.trim().toUpperCase();
    if (code === 'EVENTGO20') {
      const discount = Math.round(cartTotals.subtotal * 0.20);
      setAppliedDiscount(discount);
      setCouponSuccess(`¡Cupón 20% aplicado! (-$${discount.toLocaleString()})`);
    } else if (code === 'PROMO50') {
      const discount = Math.round(cartTotals.subtotal * 0.50);
      setAppliedDiscount(discount);
      setCouponSuccess(`¡Cupón bienvenida 50% aplicado! (-$${discount.toLocaleString()})`);
    } else {
      setCouponError('Cupón inválido. Pruebe EVENTGO20 o PROMO50');
      setAppliedDiscount(0);
    }
  };

  // Simulación automatizada de un Caso de Uso Completo (Matchmaking, Chat, Estados del viaje, Reviews)
  const runSimulatedScenario = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimulationLogs([]);
    setCart([]);
    setCheckoutStatus('idle');
    setTip(0);
    setCouponCode('');
    setAppliedDiscount(0);

    const log = (msg: string) => {
      setSimulationLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    // Paso 1: Inicialización
    log("Iniciando Escenario de Simulación en Tiempo Real...");
    
    // Paso 2: Crear Proveedores en Geocerca
    setTimeout(() => {
      log("Creando 5 proveedores de servicios activos en la geocerca...");
      log("🤵 Carlos (Mozos) ONLINE a 0.6 km");
      log("🎵 Tomás Ferreyra (DJ) ONLINE a 2.3 km");
      log("🍽️ Marta Ibáñez (Catering) ONLINE a 0.8 km");
      log("📸 Nicolás Paz (Foto) ONLINE a 2.1 km");
      log("🤵 Lucas Díaz (Mozos) ONLINE a 1.2 km");
    }, 1000);

    // Paso 3: Agregar al Carrito (Cliente)
    setTimeout(() => {
      log("Cliente agrega 'DJ con Sonido Premium' al carrito.");
      const djService = catalog.find(p => p.category === 'MUSIC') || {
        id: 'p2',
        title: 'DJ con Sonido Premium',
        price: 12000,
        distanceKm: 2.3,
        category: 'MUSIC',
        availableExtras: []
      };
      
      setCart([
        {
          id: djService.id,
          title: djService.title,
          basePrice: djService.price,
          category: djService.category,
          distanceKm: djService.distanceKm,
          selectedExtras: [{ name: 'Show de luces láser 3D', price: 3500 }],
          price: djService.price + 3500,
          quantity: 1
        }
      ]);
    }, 2500);

    // Paso 4: Configurar propina y descuento
    setTimeout(() => {
      log("Cliente aplica cupón de bienvenida 'PROMO50' (50% OFF).");
      setCouponCode('PROMO50');
      // Aplicación del cupón
      const subtotal = 12000 + 3500;
      const discount = Math.round(subtotal * 0.50);
      setAppliedDiscount(discount);
      
      log("Cliente añade propina voluntaria al proveedor de $500.");
      setTip(500);
    }, 4000);

    // Paso 5: Checkout y búsqueda (Matchmaking)
    setTimeout(() => {
      log("Confirmando pedido. Iniciando algoritmo de Matching de EventGo...");
      setCheckoutStatus('searching');
    }, 5500);

    // Paso 6: Ping 1 (offline/rechaza)
    setTimeout(() => {
      log("Algoritmo: Enviando ping secuencial a Proveedor 1 (Julia Méndez - offline)...");
      log("Julia Méndez: PING expirado/rechazado.");
    }, 7000);

    // Paso 7: Ping 2 (Aceptado por Tomás Ferreyra)
    setTimeout(() => {
      log("Algoritmo: Enviando ping secuencial a Proveedor 2 (Tomás Ferreyra - 2.3km)...");
      log("Tomás Ferreyra: ¡PING ACEPTADO!");
      
      const simulatedJob = {
        id: 'booking-sim-100',
        title: 'DJ con Sonido Premium (x1 Personalizado)',
        price: 8250, // (12000+3500)/2 + 500
        location: eventLocation,
        status: 'assigned'
      };
      
      setAcceptedJobs([simulatedJob]);
      setCurrentJobStatus('assigned');
      setCheckoutStatus('success');
    }, 9000);

    // Paso 8: Avance del Tracking en tiempo real
    const steps = [
      { status: 'preparing', msg: "Tomás Ferreyra: Cambió de estado a 'Preparando Equipamiento'" },
      { status: 'on_the_way', msg: "Tomás Ferreyra: Cambió de estado a 'En Camino' (Desplazándose al evento)" },
      { status: 'arrived', msg: "Tomás Ferreyra: Cambió de estado a 'En el Evento' (Equipos listos y activos)" },
      { status: 'completed', msg: "Tomás Ferreyra: Cambió de estado a 'Finalizado'" }
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        log(step.msg);
        setCurrentJobStatus(step.status);
        setAcceptedJobs(prev => prev.map(j => ({ ...j, status: step.status })));
        
        // Al completarse
        if (step.status === 'completed') {
          setTimeout(() => {
            log("Flujo finalizado. Abriendo panel de Calificación para calificar con 5 estrellas.");
            setReviewingOrder({
              id: 'booking-sim-100',
              title: 'DJ con Sonido Premium'
            });
            setIsSimulating(false);
          }, 1500);
        }
      }, 11000 + (index * 3500));
    });
  };

  const getCategoryEmoji = (category: string) => {
    const map: Record<string, string> = {
      STAFF: '🤵',
      MUSIC: '🎵',
      CATERING: '🍽️',
      VENUE: '🏢',
      PHOTOGRAPHY: '📸',
    };
    return map[category] || '📦';
  };

  // Convertimos los CartItems a la interfaz requerida por calculateCartTotal
  const cartTotals = calculateCartTotal(
    cart.map((c) => ({
      id: c.id,
      name: c.title,
      basePrice: c.basePrice * c.quantity, // Multiply base price by quantity
      category: c.category,
      selectedExtras: c.selectedExtras,
    })),
    multiplier
  );

  // Costo de desplazamiento dinámico basado en las distancias de los proveedores (Estilo PedidosYa)
  const deliveryFee = cart.reduce((sum, item) => sum + Math.round(item.distanceKm * 250), 0);
  const finalGrandTotal = Math.max(0, cartTotals.total + deliveryFee + tip - appliedDiscount);

  // Filtrado + ordenamiento del catálogo según preferencia del cliente
  // Esto también define QUÉ proveedor se pinga primero durante el matchmaking
  const filteredCatalog = (() => {
    return [...catalog].sort((a, b) => {
      if (sortOrder === 'distance') return a.distanceKm - b.distanceKm;
      if (sortOrder === 'price')    return a.price - b.price;
      if (sortOrder === 'rating')   return b.rating - a.rating;
      return 0;
    });
  })();

  // Productos sugeridos de venta cruzada (que no estén en el carrito)
  const crossSellingSuggestions = catalog.filter(
    (p) => !cart.some((item) => item.title.includes(p.title))
  );

  return (
    <>
      {/* Guard de sesión — si no hay sesión activa, mostrar pantalla de login */}
      {!session && (
        <LoginScreen onLogin={(user) => {
          apiService.setMode(user.appMode);
          apiService.setApiUrl(user.apiUrl);
          setSession(user);
        }} />
      )}

      {session && (
      <div className="app-container">
      {/* Luces Ambientales Estilo Cine */}
      <div className="spotlight spot-blue" />
      <div className="spotlight spot-purple" />
      <div className="spotlight spot-emerald" />

      {/* Uber Ping Overlay */}
      <UberPingScreen
        payload={activePayload}
        onAccept={handleAccept}
        onDecline={handleDecline}
        countdownSeconds={15}
      />

      {/* Drawer del Perfil de Usuario (PedidosYa Style) */}
      {showProfileDrawer && (
        <div className="profile-drawer-overlay" onClick={() => setShowProfileDrawer(false)}>
          <div className="profile-drawer-card" onClick={(e) => e.stopPropagation()}>
            <div className="profile-drawer-header">
              <h2 className="profile-drawer-title">Mi Perfil</h2>
              <button className="btn-close-drawer" onClick={() => setShowProfileDrawer(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="profile-drawer-body">
              {/* Saludo y Avatar */}
              <div className="profile-welcome-box">
                <img
                  src={session?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80"}
                  alt={session?.name || "Usuario"}
                  className="profile-avatar-large"
                />
                <h3 className="profile-welcome-title">¡Hola, {session?.name || "Usuario"}!</h3>
                <span className="profile-user-email">{session?.email}</span>
              </div>

              {/* Banner de Suscripción Plus */}
              <div className="profile-plus-banner">
                <span className="plus-pill">plus</span>
                <h4 className="plus-banner-title">¡Probá Plus! 1 mes gratis</h4>
                <p className="plus-banner-text">
                  Después tenés 3 meses al 20% OFF. Disfrutá envíos gratis y mucho más.
                </p>
                <ChevronRight size={14} className="plus-chevron-right" />
              </div>

              {/* Botones de Configuración Rápida */}
              <div className="profile-quick-settings-grid">
                <button className="quick-setting-btn">
                  <User size={16} />
                  <span>Información personal</span>
                </button>
                <button className="quick-setting-btn" onClick={() => { setShowProfileDrawer(false); setCouponCode('PROMO50'); }}>
                  <Ticket size={16} />
                  <span>Cupones</span>
                </button>
                <button className="quick-setting-btn">
                  <Award size={16} />
                  <span>EventGo Plus</span>
                </button>
                <button className="quick-setting-btn">
                  <HelpCircle size={16} />
                  <span>Ayuda</span>
                </button>
              </div>

              {/* Completá tu perfil (Progress Bar) */}
              <div className="profile-completion-box">
                <div className="completion-text-row">
                  <span className="completion-title">Completá tu perfil</span>
                  <span className="completion-ratio">{role === 'provider' ? '3 de 3' : '2 de 3'}</span>
                </div>
                <div className="completion-progress-bar-bg">
                  <div className="completion-progress-bar-fill" style={{ width: role === 'provider' ? '100%' : '66%' }} />
                </div>
                <span className="completion-desc">
                  {role === 'provider' 
                    ? '¡Tu perfil de proveedor está activo!' 
                    : 'Describí cómo se compone tu hogar.'}
                </span>
              </div>

              {/* Lista de Secciones del Perfil */}
              <div className="profile-options-list">
                <div className="profile-section-group">
                  <span className="section-mini-label">Perfil</span>
                  <button className="profile-option-row">
                    <div className="flex-items gap-sm">
                      <MapPin size={14} className="option-icon" />
                      <span>Direcciones</span>
                    </div>
                    <ChevronRight size={14} className="arrow-right" />
                  </button>
                  <button className="profile-option-row">
                    <div className="flex-items gap-sm">
                      <Heart size={14} className="option-icon" />
                      <span>Favoritos</span>
                    </div>
                    <ChevronRight size={14} className="arrow-right" />
                  </button>
                </div>

                <div className="profile-section-group" style={{ marginTop: '16px' }}>
                  <span className="section-mini-label">Actividad</span>
                  <button className="profile-option-row">
                    <div className="flex-items gap-sm">
                      <CreditCard size={14} className="option-icon" />
                      <span>Medios de pago</span>
                    </div>
                    <ChevronRight size={14} className="arrow-right" />
                  </button>
                  <button className="profile-option-row">
                    <div className="flex-items gap-sm">
                      <Coins size={14} className="option-icon" />
                      <span className="flex-items">
                        Billetera EventGo Pay <span className="new-tag-badge">Nuevo</span>
                      </span>
                    </div>
                    <ChevronRight size={14} className="arrow-right" />
                  </button>
                </div>

                <div className="profile-section-group" style={{ marginTop: '16px' }}>
                  <span className="section-mini-label">Configuración y Roles</span>
                  <button className="profile-option-row">
                    <div className="flex-items gap-sm">
                      <Bell size={14} className="option-icon" />
                      <span>Notificaciones</span>
                    </div>
                    <ChevronRight size={14} className="arrow-right" />
                  </button>
                  {role === 'client' ? (
                    <button className="profile-option-row" onClick={() => { setShowProfileDrawer(false); setShowProviderSetupModal(true); }}>
                      <div className="flex-items gap-sm text-accent">
                        <Briefcase size={14} className="option-icon" />
                        <span>Ofrecer mis servicios (Registrar Negocio)</span>
                      </div>
                      <ChevronRight size={14} className="arrow-right" />
                    </button>
                  ) : (
                    <button className="profile-option-row" onClick={() => { switchRole('client'); setShowProfileDrawer(false); }}>
                      <div className="flex-items gap-sm text-accent">
                        <User size={14} className="option-icon" />
                        <span>Cambiar a modo Organizador (Cliente)</span>
                      </div>
                      <ChevronRight size={14} className="arrow-right" />
                    </button>
                  )}
                </div>
              </div>

              {/* Botón de Logout */}
              <button className="btn-profile-logout" onClick={handleLogout}>
                <LogOut size={14} />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Calificación y Opinión (PedidosYa Style) */}
      {reviewingOrder && (
        <div className="modal-backdrop">
          <div className="modal-card review-modal-card">
            <div className="modal-glow" />
            <h2 className="modal-title flex-items">
              <Star size={20} className="chat-sparkles" /> Danos tu opinión
            </h2>
            <p className="modal-subtitle" style={{ marginBottom: '16px' }}>
              ¿Qué te pareció el servicio de <strong>{reviewingOrder.title}</strong>?
            </p>

            <div className="rating-stars-row">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`star-btn ${star <= rating ? 'active' : ''}`}
                >
                  <Star size={28} />
                </button>
              ))}
            </div>

            <div className="review-comment-box" style={{ marginTop: '16px' }}>
              <span className="section-mini-label">DEJÁ TU COMENTARIO</span>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Escribe detalles del servicio..."
                className="review-textarea"
              />
            </div>

            <div className="customizer-footer" style={{ marginTop: '16px' }}>
              <button className="btn-cancel" onClick={() => setReviewingOrder(null)}>
                Cancelar
              </button>
              <button className="btn-confirm" onClick={submitReview}>
                Enviar Opinión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="app-header">
        <div className="app-header-left">
          <h1 className="app-logo">Event<span className="app-logo-accent">Go</span></h1>
          <span className="app-header-badge">
            {role === 'client' ? 'Organizador' : 'Proveedor'}
          </span>
        </div>

        <div className="app-header-right">
          {/* Rol activo badge */}
          <span className={`active-role-badge ${role === 'provider' ? 'provider-role' : 'client-role'}`}>
            {role === 'client' ? '🎉 Organizador' : '💼 Proveedor'}
          </span>

          {/* Toggle Online (solo si es proveedor) */}
          {role === 'provider' && (
            <>
              <div className={`app-status-indicator ${isOnline ? 'online' : 'offline'}`} />
              <button
                className={`app-toggle-btn ${isOnline ? 'active' : ''}`}
                onClick={() => setIsOnline(!isOnline)}
              >
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </button>
            </>
          )}

          {/* Avatar de Perfil Trigger — siempre visible */}
          <div className="user-profile-header-trigger flex-items" onClick={() => setShowProfileDrawer(true)}>
            <img
              src={session?.avatar ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'}
              alt={session?.name}
              className="user-avatar-img"
            />
            <span className="user-name-text">{session?.name?.split(' ')[0]}</span>
          </div>
        </div>
      </header>

      {/* Modal de Registro de Negocio / Configuración de Proveedor (EventGo Theme) */}
      {showProviderSetupModal && (
        <div className="modal-backdrop">
          <div className="modal-card provider-setup-card">
            <div className="modal-glow" />
            <div className="modal-header-row">
              <h2 className="modal-title">Registrar mi Negocio</h2>
              <button className="btn-close-modal" onClick={() => setShowProviderSetupModal(false)}>
                <X size={18} />
              </button>
            </div>
             <p className="modal-subtitle">Completá los detalles para empezar a recibir solicitudes de eventos cerca tuyo.</p>

            <div className="modal-setup-body">
              {/* Tipo de Proveedor (Persona vs Empresa) */}
              <div className="setup-field-group">
                <label className="field-label">¿Cómo te registrás?</label>
                <div className="login-mode-tabs">
                  <button
                    type="button"
                    className={`login-mode-tab ${providerEntityType === 'individual' ? 'active' : ''}`}
                    onClick={() => setProviderEntityType('individual')}
                  >
                    👤 Persona (Profesional)
                  </button>
                  <button
                    type="button"
                    className={`login-mode-tab ${providerEntityType === 'company' ? 'active' : ''}`}
                    onClick={() => setProviderEntityType('company')}
                  >
                    🏢 Empresa (Agencia/Catering)
                  </button>
                </div>
              </div>

              {/* Nombre del Servicio / Negocio */}
              <div className="setup-field-group">
                <label className="field-label">Nombre de tu Servicio o Negocio</label>
                <input
                  type="text"
                  value={providerServiceTitle}
                  onChange={(e) => setProviderServiceTitle(e.target.value)}
                  className="login-api-url-input"
                  placeholder={providerEntityType === 'individual' ? "Ej: Cocinero Deyvid o Fotógrafa Ana" : "Ej: Catering Los Asadores S.A. o Sonido Premium DJ"}
                />
              </div>

              {/* Categoría */}
              <div className="setup-field-group">
                <label className="field-label">¿Qué servicio ofrecés?</label>
                <div className="category-setup-grid">
                  {EVENT_CATEGORIES.map(cat => (
                    <div
                      key={cat.id}
                      className={`category-setup-option ${providerCategory === cat.id ? 'active' : ''}`}
                      onClick={() => {
                        setProviderCategory(cat.id);
                        const firstSub = cat.subcategories[0]?.id || '';
                        setProviderSubCategory(firstSub);
                      }}
                    >
                      <span className="category-option-emoji">{cat.emoji}</span>
                      <span className="category-option-label">{cat.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subcategoría del Proveedor */}
              <div className="setup-field-group">
                <label className="field-label">Seleccioná tu especialidad específica (Subcategoría)</label>
                <select
                  value={providerSubCategory}
                  onChange={(e) => setProviderSubCategory(e.target.value)}
                  className="login-api-url-input"
                  style={{ width: '100%', padding: '12px 14px', background: 'rgba(0, 0, 0, 0.35)' }}
                >
                  {EVENT_CATEGORIES.find(c => c.id === providerCategory)?.subcategories.map(sub => (
                    <option key={sub.id} value={sub.id} style={{ background: '#121218', color: '#fff' }}>
                      {sub.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tarifa por hora */}
              <div className="setup-field-group">
                <div className="field-label-row">
                  <label className="field-label">Tarifa por hora</label>
                  <span className="field-value">${providerRate.toLocaleString()} / hr</span>
                </div>
                <input
                  type="range"
                  min="2000"
                  max="30000"
                  step="500"
                  value={providerRate}
                  onChange={(e) => setProviderRate(Number(e.target.value))}
                  className="setup-range-slider"
                />
                <div className="range-limits">
                  <span>$2.000</span>
                  <span>$30.000</span>
                </div>
              </div>

              {/* Radio de cobertura */}
              <div className="setup-field-group">
                <div className="field-label-row">
                  <label className="field-label">Radio de cobertura</label>
                  <span className="field-value">{providerRadius} km a la redonda</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={providerRadius}
                  onChange={(e) => setProviderRadius(Number(e.target.value))}
                  className="setup-range-slider"
                />
                <div className="range-limits">
                  <span>1 km</span>
                  <span>30 km</span>
                </div>
              </div>

              {/* Breve descripción */}
              <div className="setup-field-group">
                <label className="field-label">Descripción de tu servicio</label>
                <textarea
                  value={providerBio}
                  onChange={(e) => setProviderBio(e.target.value)}
                  placeholder="Ej: DJ profesional con más de 5 años de trayectoria. Equipamiento de sonido de alta fidelidad, luces robóticas y máquina de humo..."
                  className="setup-textarea"
                  maxLength={180}
                />
                <span className="char-count">{providerBio.length}/180 caracteres</span>
              </div>

              <button
                className="btn-confirm-setup"
                onClick={() => {
                  if (session) {
                    setSession({
                      ...session,
                      role: 'provider',
                      // @ts-ignore
                      providerConfig: {
                        serviceCategory: providerCategory,
                        serviceSubCategory: providerSubCategory,
                        radiusKm: providerRadius,
                        hourlyRate: providerRate,
                        bio: providerBio,
                        entityType: providerEntityType,
                        serviceTitle: providerServiceTitle || `${session.name} ${providerCategory === 'CATERING' ? 'Catering' : 'Servicios'}`
                      }
                    });
                  }
                  setShowProviderSetupModal(false);
                  setIsOnline(true); // Poner online por defecto tras registrarse
                }}
              >
                Confirmar y Activar Modo Proveedor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Personalización (PedidosYa Concept) */}
      {customizingItem && (
        <div className="modal-backdrop">
          <div className="modal-card customization-card">
            <div className="modal-glow" />
            <h2 className="modal-title">Personalizá tu Servicio</h2>
            <div className="modal-item-preview">
              <span className="preview-emoji">{getCategoryEmoji(customizingItem.category)}</span>
              <div>
                <h3>{customizingItem.title}</h3>
                <p>{customizingItem.description}</p>
              </div>
            </div>

            <div className="extras-section">
              <h4 className="extras-title">Adicionales recomendados (PedidosYa):</h4>
              <div className="extras-list">
                {customizingItem.availableExtras.map((extra: ExtraItem) => {
                  const isSelected = selectedExtras.some((e) => e.name === extra.name);
                  return (
                    <div
                      key={extra.name}
                      onClick={() => toggleExtra(extra)}
                      className={`extra-item-row ${isSelected ? 'selected' : ''}`}
                    >
                      <div className="extra-checkbox">
                        {isSelected && <div className="extra-checkbox-dot" />}
                      </div>
                      <span className="extra-name">{extra.name}</span>
                      <span className="extra-price">+${extra.price.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="customizer-footer">
              <div className="live-price-summary">
                <span className="live-price-label">Precio Unitario:</span>
                <span className="live-price-value">
                  ${(
                    customizingItem.price + selectedExtras.reduce((sum, e) => sum + e.price, 0)
                  ).toLocaleString()}
                </span>
              </div>
              <div className="customizer-actions">
                <button className="btn-cancel" onClick={() => setCustomizingItem(null)}>
                  Cancelar
                </button>
                <button className="btn-confirm" onClick={confirmCustomization}>
                  Confirmar y Añadir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {role === 'client' ? (
        /* ==================== PANEL DEL CLIENTE ==================== */
        <main className="app-main client-layout">
          {/* Columna Izquierda: Marketplace */}
          <section className="panel panel-catalog">
            <h2 className="panel-title">Catálogo de Servicios</h2>
            <p className="panel-subtitle">Explorá y personalizá los mejores servicios profesionales.</p>

            {/* PedidosYa UX - Categorías Principales */}
            <div className="pedidosya-verticals-selector-container">
              <span className="section-mini-label">Categorías Recomendadas (PedidosYa)</span>
              <div className="pedidosya-verticals-grid">
                {EVENT_CATEGORIES.map((cat) => (
                  <div
                    key={cat.id}
                    className={`vertical-card ${cat.id.toLowerCase()}-v ${categoryFilter === cat.id ? 'active' : ''}`}
                    onClick={() => {
                      setCategoryFilter(categoryFilter === cat.id ? null : cat.id);
                      setSubCategoryFilter(null); // Limpiar subcategoría al cambiar categoría principal
                    }}
                  >
                    <span className="vertical-emoji">{cat.emoji}</span>
                    <span className="vertical-name">{cat.label}</span>
                  </div>
                ))}
              </div>

              {/* Subcategorías Dinámicas */}
              {categoryFilter && (
                <div className="subcategories-selector-box">
                  <span className="section-mini-label">Filtrar por Especialidad / Subcategoría:</span>
                  <div className="subcategories-tags-wrap">
                    {EVENT_CATEGORIES.find(c => c.id === categoryFilter)?.subcategories.map((sub) => (
                      <button
                        key={sub.id}
                        className={`subcategory-tag-btn ${subCategoryFilter === sub.id ? 'active' : ''}`}
                        onClick={() => setSubCategoryFilter(subCategoryFilter === sub.id ? null : sub.id)}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {categoryFilter && (
                <button 
                  className="btn-clear-filter" 
                  onClick={() => { 
                    setCategoryFilter(null); 
                    setSubCategoryFilter(null); 
                  }}
                >
                  Ver Todos los Servicios
                </button>
              )}
            </div>

            {/* Proveedores Activos en la Geocerca (Uber/PedidosYa Supply) */}
            <div className="active-providers-geofence" style={{ marginTop: '16px' }}>
              <div className="geocerca-header-row">
                <span className="section-mini-label">PROVEEDORES ONLINE EN LA GEOCERCA (10 km)</span>
                <span className={`supply-demand-pill ${NEARBY_PROVIDERS.filter(p => p.category === (categoryFilter ?? 'MUSIC')).length >= 4 ? 'supply-high' : 'demand-high'}`}>
                  {NEARBY_PROVIDERS.filter(p => p.category === (categoryFilter ?? 'MUSIC')).length >= 4
                    ? `✅ Alta oferta — precios normales`
                    : `⚡ Alta demanda — recargo activo`}
                </span>
              </div>
              <p className="geocerca-explainer">
                {checkoutStatus === 'searching'
                  ? 'Enviando pings secuencialmente del más cercano al más lejano...'
                  : 'Si hacés el pedido, el sistema pinga al más cercano primero. Si rechaza, avanza al siguiente.'}
              </p>
              <div className="active-providers-list">
                {isOnline && (
                  <div className="active-provider-row user-provider-highlight">
                    <div className="provider-status-dot online" />
                    <span className="provider-name">Tú (Proveedor Online)</span>
                    <span className="provider-dist">📍 0.0 km</span>
                    <span className="ping-queue-badge self-badge">TÚ</span>
                  </div>
                )}
                {NEARBY_PROVIDERS.map((p, idx) => {
                  const isBeingPinged = checkoutStatus === 'searching' && idx === 0;
                  const wasAccepted = checkoutStatus === 'success' && idx === 0;
                  return (
                    <div key={p.id} className={`active-provider-row ${isBeingPinged ? 'row-pinging' : ''} ${wasAccepted ? 'row-accepted' : ''}`}>
                      <div className={`provider-status-dot ${p.online ? 'online' : ''}`} />
                      <div className="provider-info-col">
                        <span className="provider-name">{p.name}</span>
                        <span className="provider-category-mini">{p.categoryLabel}</span>
                      </div>
                      <span className="provider-dist">📍 {p.distanceKm} km</span>
                      {isBeingPinged && (
                        <span className="ping-queue-badge pinging">🔔 PING...</span>
                      )}
                      {wasAccepted && (
                        <span className="ping-queue-badge accepted">✓ ACEPTÓ</span>
                      )}
                      {!isBeingPinged && !wasAccepted && checkoutStatus === 'searching' && idx > 0 && (
                        <span className="ping-queue-badge queued">#{idx + 1} en cola</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="matchmaking-explainer-box">
                <span className="mm-step">1️⃣</span>
                <span>Ping al DJ más cercano (15 seg)</span>
                <span className="mm-arrow">→</span>
                <span className="mm-step">2️⃣</span>
                <span>Si rechaza: siguiente DJ</span>
                <span className="mm-arrow">→</span>
                <span className="mm-step">3️⃣</span>
                <span>Precio baja con más oferta</span>
              </div>
            </div>

            {/* Selector de Ordenamiento — afecta catálogo Y orden de ping en matchmaking */}
            <div className="sort-order-selector-box">
              <div className="sort-order-header-row">
                <span className="section-mini-label">ORDENAR PROVEEDORES POR</span>
                <span className="sort-matchmaking-note">
                  ⚡ El proveedor #1 en la lista recibe el primer ping
                </span>
              </div>
              <div className="sort-tabs-row">
                <button
                  className={`sort-tab-btn ${sortOrder === 'distance' ? 'active distance-active' : ''}`}
                  onClick={() => setSortOrder('distance')}
                >
                  📍 Más cercano
                  {sortOrder === 'distance' && <span className="sort-active-indicator">activo</span>}
                </button>
                <button
                  className={`sort-tab-btn ${sortOrder === 'price' ? 'active price-active' : ''}`}
                  onClick={() => setSortOrder('price')}
                >
                  💰 Precio más bajo
                  {sortOrder === 'price' && <span className="sort-active-indicator">activo</span>}
                </button>
                <button
                  className={`sort-tab-btn ${sortOrder === 'rating' ? 'active rating-active' : ''}`}
                  onClick={() => setSortOrder('rating')}
                >
                  ⭐ Mejor calificado
                  {sortOrder === 'rating' && <span className="sort-active-indicator">activo</span>}
                </button>
              </div>
              <p className="sort-explainer-text">
                {sortOrder === 'distance' && '📍 Priorizás velocidad — el más cercano llega antes pero puede cobrar más.'}
                {sortOrder === 'price'    && '💰 Priorizás ahorro — puede estar más lejos, pero es el más conveniente.'}
                {sortOrder === 'rating'   && '⭐ Priorizás calidad — el mejor evaluado por la comunidad va primero.'}
              </p>
            </div>

            {/* Catalog List PedidosYa Store Cards */}
            <div className="catalog-list">
              {filteredCatalog.map((prod) => (
                <div key={prod.id} className="catalog-item-card store-card-pedidosya">
                  <div className="catalog-item-header">
                    <span className="catalog-item-emoji">{getCategoryEmoji(prod.category)}</span>
                    <span className="catalog-item-category">{prod.category}</span>
                  </div>
                  
                  {prod.badgeText && (
                    <div className="store-promo-badge">
                      <Tag size={10} />
                      <span>{prod.badgeText}</span>
                    </div>
                  )}

                  <h3 className="catalog-item-title">{prod.title}</h3>
                  <p className="catalog-item-desc">{prod.description}</p>
                  
                  <div className="store-details-row-pedidosya">
                    <div className="store-rating-box">
                      <Star size={12} className="star-filled-icon" />
                      <span className="rating-value">{prod.rating}</span>
                      <span className="reviews-count">({prod.reviewsCount}+)</span>
                    </div>
                    <span className="bullet-divider">•</span>
                    <span className="eta-badge">{prod.etaMin}</span>
                    <span className="bullet-divider">•</span>
                    <span className="shipping-badge">Envío ${prod.shippingPrice}</span>
                  </div>

                  <div className="catalog-item-meta" style={{ marginTop: '14px' }}>
                    <span className="price-tag">Mínimo: ${prod.price.toLocaleString()}</span>
                    <span>📍 {prod.distanceKm} km</span>
                  </div>
                  <button className="btn-add-cart" onClick={() => openCustomizer(prod)}>
                    Personalizar y Agregar
                  </button>
                </div>
              ))}
            </div>

            {/* PedidosYa UX - Mis Pedidos / Historial de Contrataciones */}
            <div className="past-orders-section-card" style={{ marginTop: '28px' }}>
              <h3 className="panel-title flex-items">
                <MessageSquare size={16} className="chat-sparkles" /> Mis Pedidos (Historial PedidosYa)
              </h3>
              <p className="panel-subtitle" style={{ marginBottom: '16px' }}>Califica tus contrataciones pasadas para mejorar la comunidad.</p>
              
              <div className="past-orders-list">
                {pastOrders.map((order) => (
                  <div key={order.id} className="past-order-row-card">
                    <div className="past-order-header-info">
                      <div className="flex-items">
                        <span className="past-order-emoji">{getCategoryEmoji(order.category)}</span>
                        <span className="past-order-title">{order.title}</span>
                      </div>
                      <span className="past-order-date">{order.date}</span>
                    </div>
                    <div className="past-order-footer-row">
                      <span className="past-order-price">${order.price.toLocaleString()}</span>
                      {order.reviewed ? (
                        <span className="reviewed-badge">✓ Opinión Enviada</span>
                      ) : (
                        <button
                          className="btn-opinar-feedback"
                          onClick={() => setReviewingOrder(order)}
                        >
                          ★ Opinar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Columna Central: Carrito e Invoice */}
          <section className="panel panel-cart">
            {/* Simulador de Mercado */}
            <div className="market-simulator-card">
              <div className="market-sim-header">
                <Sliders size={14} />
                <span>Simulador de Oferta / Demanda (Tarifas)</span>
              </div>
              <div className="market-tabs">
                {(['normal', 'high', 'surge'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setDemandState(st)}
                    className={`market-tab-btn ${demandState === st ? 'active' : ''}`}
                  >
                    {st === 'normal' ? 'Normal (1.0x)' : st === 'high' ? 'Alta (1.15x)' : 'Surge (1.35x)'}
                  </button>
                ))}
              </div>
              {multiplier > 1.0 && (
                <div className="surge-active-banner">
                  <Zap size={12} className="pulse-icon" />
                  <span>Alta demanda activa en tu geocerca. Multiplicador: {multiplier}x</span>
                </div>
              )}
            </div>

            {/* Uber Reserve - Programación de Evento */}
            <div className="uber-reserve-datetime-card">
              <div className="uber-reserve-header flex-items">
                <Calendar size={14} className="chat-sparkles" />
                <span>Programación del Evento (Uber Reserve)</span>
              </div>
              <p className="uber-reserve-desc">
                Selecciona la hora exacta del servicio con hasta 90 días de anticipación.
              </p>

              <div className="uber-reserve-inputs-grid">
                <div className="reserve-input-field-wrapper">
                  <label className="section-mini-label">FECHA EVENTO</label>
                  <div className="datetime-input-container">
                    <Calendar size={12} className="input-inner-icon" />
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="datetime-field"
                    />
                  </div>
                </div>

                <div className="reserve-input-field-wrapper">
                  <label className="section-mini-label">HORA INICIO</label>
                  <div className="datetime-input-container">
                    <Clock size={12} className="input-inner-icon" />
                    <input
                      type="time"
                      value={eventStartTime}
                      onChange={(e) => setEventStartTime(e.target.value)}
                      className="datetime-field"
                    />
                  </div>
                </div>

                <div className="reserve-input-field-wrapper">
                  <label className="section-mini-label">HORA FIN</label>
                  <div className="datetime-input-container">
                    <Clock size={12} className="input-inner-icon" />
                    <input
                      type="time"
                      value={eventEndTime}
                      onChange={(e) => setEventEndTime(e.target.value)}
                      className="datetime-field"
                    />
                  </div>
                </div>
              </div>
              
              <div className="uber-reserve-eta-banner">
                <Clock size={12} />
                <span>Tiempo de espera y preparación adicional incluido para cumplir con tu evento.</span>
              </div>
            </div>

            <div className="cart-card">
              <h3 className="panel-title flex-items">
                <ShoppingCart size={16} /> Carrito (Desglose PedidosYa)
              </h3>

              {cart.length === 0 ? (
                <p className="status-description-small" style={{ marginBottom: '10px' }}>
                  El carrito está vacío. Añadí y configurá servicios.
                </p>
              ) : (
                <div className="cart-items-list">
                  {cart.map((item) => (
                    <div key={item.id} className="cart-item">
                      <div className="cart-item-info">
                        <span className="cart-item-title">{item.title}</span>
                        <span className="cart-item-meta">📍 {item.distanceKm} km (Est. {Math.round(item.distanceKm * 8)} min)</span>
                        {item.selectedExtras.length > 0 && (
                          <div className="cart-item-extras-chips">
                            {item.selectedExtras.map((e) => (
                              <span key={e.name} className="extra-chip">
                                +{e.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* PedidosYa UX - Selector de Cantidad */}
                      <div className="cart-item-right-controls flex-items">
                        <div className="qty-selector-container-pedidosya">
                          <button className="qty-btn" onClick={() => updateQuantity(item.id, -1)}>
                            <Minus size={10} />
                          </button>
                          <span className="qty-number">{item.quantity}</span>
                          <button className="qty-btn" onClick={() => updateQuantity(item.id, 1)}>
                            <Plus size={10} />
                          </button>
                        </div>
                        <span className="cart-item-price" style={{ minWidth: '70px', textAlign: 'right' }}>
                          ${(item.price * item.quantity).toLocaleString()}
                        </span>
                        <button className="cart-remove-btn" onClick={() => removeFromCart(item.id)}>
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* PedidosYa UX - Carrusel de Recomendaciones Cruzadas ("Otras personas también llevaron") */}
              {cart.length > 0 && crossSellingSuggestions.length > 0 && (
                <div className="cross-selling-box-pedidosya">
                  <span className="section-mini-label">Otros organizadores también agregaron:</span>
                  <div className="cross-selling-carousel">
                    {crossSellingSuggestions.map((suggestion) => (
                      <div key={suggestion.id} className="cross-selling-card-item">
                        <div className="cross-info-top">
                          <span className="cross-emoji">{getCategoryEmoji(suggestion.category)}</span>
                          <div className="cross-text-col">
                            <span className="cross-title">{suggestion.title}</span>
                            <span className="cross-price">${suggestion.price.toLocaleString()}</span>
                          </div>
                        </div>
                        <button
                          className="btn-cross-add-instant"
                          onClick={() => {
                            const newCartItem: CartItem = {
                              id: `${suggestion.id}-${Date.now()}`,
                              title: suggestion.title,
                              basePrice: suggestion.price,
                              category: suggestion.category,
                              distanceKm: suggestion.distanceKm,
                              selectedExtras: [],
                              price: suggestion.price,
                              quantity: 1,
                            };
                            setCart((prev) => [...prev, newCartItem]);
                          }}
                        >
                          <Plus size={10} /> Agregar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

                {/* PedidosYa UX - Políticas de reasignación automática de proveedor */}
                <div className="substitution-selector-box-pedidosya">
                  <div className="substitution-header flex-items">
                    <RefreshCw size={12} className="chat-sparkles" />
                    <span className="section-mini-label" style={{ margin: 0 }}>SI EL PROVEEDOR NO CONTESTA EL PING:</span>
                  </div>
                  <div className="substitution-options">
                    <label className={`sub-option-label ${substitutionPolicy === 'auto_match' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="sub_policy"
                        value="auto_match"
                        checked={substitutionPolicy === 'auto_match'}
                        onChange={() => setSubstitutionPolicy('auto_match')}
                        className="sub-radio-input"
                      />
                      <span>Reasignar al siguiente más cercano (Recomendado)</span>
                    </label>
                    <label className={`sub-option-label ${substitutionPolicy === 'cancel' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="sub_policy"
                        value="cancel"
                        checked={substitutionPolicy === 'cancel'}
                        onChange={() => setSubstitutionPolicy('cancel')}
                        className="sub-radio-input"
                      />
                      <span>Cancelar solicitud automáticamente</span>
                    </label>
                  </div>
                </div>

                {/* PedidosYa UX - Método de Pago */}
                <div className="payment-method-selector-box">
                  <span className="section-mini-label">MÉTODO DE PAGO</span>
                  <div className="payment-tabs">
                    <button
                      className={`pay-tab ${paymentMethod === 'card' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('card')}
                    >
                      <CreditCard size={12} /> Tarjeta
                    </button>
                    <button
                      className={`pay-tab ${paymentMethod === 'cash' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('cash')}
                    >
                      💵 Efectivo
                    </button>
                    <button
                      className={`pay-tab ${paymentMethod === 'eventgopay' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('eventgopay')}
                    >
                      ⚡ EventGo Pay
                    </button>
                  </div>
                </div>

                {/* PedidosYa UX - Cupón de Descuento */}
                <div className="coupon-selector-box">
                  <span className="section-mini-label">CUPÓN DE DESCUENTO (EVENTGO20 / PROMO50)</span>
                  <div className="coupon-input-row">
                    <div className="coupon-input-wrapper">
                      <Ticket size={12} className="coupon-ticket-icon" />
                      <input
                        type="text"
                        placeholder="Ingresá código..."
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="coupon-field"
                      />
                    </div>
                    <button className="btn-coupon-apply" onClick={applyCoupon}>
                      Aplicar
                    </button>
                  </div>
                  {couponError && <p className="coupon-msg error">{couponError}</p>}
                  {couponSuccess && <p className="coupon-msg success">{couponSuccess}</p>}
                </div>

                {/* PedidosYa UX - Propina para el Proveedor */}
                <div className="tip-selector-box">
                  <span className="section-mini-label">PROPINA REPARTIDOR / PROVEEDOR</span>
                  <div className="tip-buttons-row">
                    {[0, 500, 1000, 2000].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTip(t)}
                        className={`tip-btn ${tip === t ? 'active' : ''}`}
                      >
                        {t === 0 ? 'Sin Propina' : `$${t}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Desglose PedidosYa Premium */}
                <div className="invoice-breakdown">
                  <div className="invoice-row">
                    <span>Subtotal Servicios + Adicionales:</span>
                    <span>${cartTotals.subtotal.toLocaleString()}</span>
                  </div>
                  <div className={`invoice-row ${multiplier > 1.0 ? 'surge-text' : ''}`}>
                    <span className="flex-items">
                      {multiplier > 1.0 && <Zap size={10} />} Tarifa Dinámica ({multiplier}x):
                    </span>
                    <span>+${cartTotals.surgeSurcharge.toLocaleString()}</span>
                  </div>
                  <div className="invoice-row">
                    <span>Envío / Desplazamiento (Distancia):</span>
                    <span>+${deliveryFee.toLocaleString()}</span>
                  </div>
                  <div className="invoice-row">
                    <span>Tasa de Servicio (5%):</span>
                    <span>+${cartTotals.serviceFee.toLocaleString()}</span>
                  </div>
                  {tip > 0 && (
                    <div className="invoice-row tip-text">
                      <span className="flex-items"><Coins size={10} /> Propina Proveedor:</span>
                      <span>+${tip.toLocaleString()}</span>
                    </div>
                  )}
                  
                  {/* PedidosYa UX - Yellow Savings Indicator Badge */}
                  {appliedDiscount > 0 && (
                    <div className="pedidosya-savings-badge-row flex-items">
                      <div className="savings-badge-pill">
                        <Tag size={10} />
                        <span>Ahorrás ${appliedDiscount.toLocaleString()}</span>
                      </div>
                      <span className="savings-badge-discount-value">-${appliedDiscount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="invoice-divider" />
                  <div className="invoice-row grand-total">
                    <span>Presupuesto Final:</span>
                    <span>${finalGrandTotal.toLocaleString()}</span>
                  </div>
                </div>

                {checkoutStatus === 'searching' ? (
                  <div className="matching-radar-container">
                    <div className="radar-holo">
                      <div className="radar-pulse" />
                      <div className="radar-sweep" />
                      <Compass size={24} className="radar-icon-compass" />
                    </div>
                    <span className="radar-text">LANZANDO PINGS EN GEOCERCA (10 KM)...</span>
                  </div>
                ) : checkoutStatus === 'success' ? (
                  <div className="booking-success-box">
                    <div className="success-banner">
                      <CheckCircle2 size={16} />
                      <span>¡Contratación Confirmada!</span>
                    </div>
                    
                    {/* Timeline de tracking */}
                    <div className="tracking-timeline-box">
                      <h4>Estado en tiempo real:</h4>
                      <div className="timeline-steps">
                        {TRACKING_STEPS.map((step, idx) => {
                          const activeIndex = TRACKING_STEPS.findIndex((s) => s.key === currentJobStatus);
                          const isCompleted = idx <= activeIndex;
                          const isCurrent = idx === activeIndex;
                          return (
                            <div key={step.key} className={`timeline-step ${isCompleted ? 'active' : ''} ${isCurrent ? 'current' : ''}`}>
                              <div className="timeline-dot">
                                {isCompleted ? '✓' : idx + 1}
                              </div>
                              <span className="timeline-label">{step.label}</span>
                              {idx < TRACKING_STEPS.length - 1 && <div className="timeline-line" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn-checkout"
                    onClick={handleCheckout}
                    disabled={cart.length === 0 || !isOnline}
                  >
                    {cart.length === 0
                      ? 'ORGANIZAR EVENTO (CARRITO VACÍO)'
                      : !isOnline
                      ? 'ACTIVE "ONLINE" EN LA OTRA PESTAÑA'
                      : 'ORGANIZAR EVENTO'}
                  </button>
                )}

                {!isOnline && (
                  <p className="warning-text">
                    <ShieldAlert size={12} /> Para simular, ve a "Trabajar" y activa el estado "ONLINE".
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Columna Derecha: Chatbot AI */}
          <section className="panel panel-chat">
            <h2 className="panel-title">Asistente Virtual EventGo</h2>
            <p className="panel-subtitle">Planificá tu presupuesto y agregá servicios mediante inteligencia artificial.</p>
            <IntegratedChat onAddServiceToCart={(prod) => {
              // El bot añade el producto base al carrito
              const newCartItem: CartItem = {
                id: `${prod.id}-${Date.now()}`,
                title: prod.title,
                basePrice: prod.price,
                category: prod.category,
                distanceKm: prod.distanceKm,
                selectedExtras: [],
                price: prod.price,
                quantity: 1,
              };
              setCart((prev) => [...prev, newCartItem]);
            }} />
          </section>
        </main>
      ) : (
        /* ==================== PANEL DEL PROVEEDOR ==================== */
        <main className="app-main provider-layout">
          <section className="panel panel-status">
            <h2 className="panel-title">Tu Panel de Proveedor</h2>
            <p className="panel-subtitle">Gestioná tu estado de conexión e historial de alertas.</p>

            {/* Estado de Conectividad */}
            <div className="status-card-3d">
              <span className="status-label-3d">CONECTIVIDAD EN TIEMPO REAL</span>
              <div className="status-toggle-row">
                <span className={`status-status-text ${isOnline ? 'online' : 'offline'}`}>
                  {isOnline ? 'CONECTADO & LOCALIZADO' : 'DESCONECTADO'}
                </span>
                <button
                  className={`btn-toggle-3d ${isOnline ? 'active' : ''}`}
                  onClick={() => setIsOnline(!isOnline)}
                >
                  {isOnline ? 'Desconectar' : 'Conectarse'}
                </button>
              </div>
            </div>

            {/* Historial de Pings */}
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

          {/* Eventos Activos / Agenda */}
          <section className="panel panel-simulator">
            <h2 className="panel-title">Agenda y Ofertas Aceptadas</h2>
            <p className="panel-subtitle">Gestioná el avance del servicio en tiempo real para el cliente.</p>

            {acceptedJobs.length === 0 ? (
              <div className="no-events-placeholder">
                <Award size={36} />
                <p>No tenés eventos activos actualmente. Conectate y esperá las ofertas del Organizador.</p>
              </div>
            ) : (
              <div className="event-cards-grid">
                {acceptedJobs.map((job) => (
                  <div key={job.id} className="event-card accepted-job-card-3d">
                    <div className="event-card-top">
                      <span className="event-card-category-active">EVENTO CONFIRMADO</span>
                      <span className="event-card-status-badge">{currentJobStatus.toUpperCase()}</span>
                    </div>
                    <h3 className="event-card-title">{job.title}</h3>
                    <p className="event-card-description">Ubicación: {job.location}</p>
                    <div className="event-card-meta">
                      <span className="meta-item price">${job.price.toLocaleString()}</span>
                      <span className="meta-item duration">10 km Geocerca</span>
                    </div>

                    {/* Botón para actualizar el estado del servicio */}
                    {currentJobStatus !== 'completed' ? (
                      <button
                        onClick={() => advanceJobStatus(job.id)}
                        className="btn-advance-status"
                      >
                        <Play size={12} />
                        <span>
                          AVANZAR A:{' '}
                          {currentJobStatus === 'assigned'
                            ? 'PREPARANDO'
                            : currentJobStatus === 'preparing'
                            ? 'EN CAMINO'
                            : currentJobStatus === 'on_the_way'
                            ? 'LLEGADO AL EVENTO'
                            : 'FINALIZAR'}
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() => advanceJobStatus(job.id)}
                        className="btn-advance-status"
                        style={{ background: 'linear-gradient(135deg, var(--color-neon-emerald) 0%, #059669 100%)' }}
                      >
                        <CheckCircle2 size={12} />
                        <span>ARCHIVAR TRABAJO COMPLETADO</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      {/* Botón flotante para el Panel de Simulación (solo visible en modo demo) */}
      {session && apiService.getMode() === 'demo' && (
        <button className="sim-panel-float-btn" onClick={() => setShowSimPanel(true)}>
          🧪 Simular Flujos
        </button>
      )}

      {/* Drawer / Panel de Simulación (EventGo Simulation Room) */}
      {showSimPanel && (
        <div className="sim-panel-drawer">
          <div className="sim-panel-header">
            <div className="flex-items gap-sm">
              <span className="sim-panel-indicator-dot blink" />
              <h3>Consola de Simulación</h3>
            </div>
            <button className="btn-close-sim" onClick={() => setShowSimPanel(false)}>✕</button>
          </div>
          <p className="sim-panel-desc">Generá y probá casos de uso en tiempo real sin dependencias.</p>

          <div className="sim-panel-actions">
            <button 
              className="btn-start-simulation"
              onClick={runSimulatedScenario}
              disabled={isSimulating}
            >
              {isSimulating ? '⚡ Ejecutando Simulación...' : 'Iniciar Simulación de Matchmaking'}
            </button>
          </div>

          <div className="sim-logs-container">
            <span className="sim-logs-title">Logs de ejecución:</span>
            <div className="sim-logs-list">
              {simulationLogs.length === 0 ? (
                <span className="no-logs-text">Hacé clic en Iniciar para ver el flujo en tiempo real...</span>
              ) : (
                simulationLogs.map((logStr, i) => (
                  <div key={i} className="sim-log-row">
                    {logStr}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="app-footer">
        <span>EventGo — E-Commerce exprés y matching instantáneo on-demand</span>
      </footer>
    </div>
      )}
    </>
  );
}

export default App;
