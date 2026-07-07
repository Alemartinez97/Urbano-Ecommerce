import { io, Socket } from 'socket.io-client';

export type AppMode = 'demo' | 'real';

export interface Provider {
  id: string;
  name: string;
  category: string;
  subCategory: string;
  categoryLabel: string;
  price: number;
  distanceKm: number;
  rating: number;
  online: boolean;
  avatar: string;
}

// Estructura completa de Categorías y Subcategorías para Eventos (EventGo Concept)
export const EVENT_CATEGORIES = [
  {
    id: 'STAFF',
    label: 'Personal & Staff',
    emoji: '🤵',
    subcategories: [
      { id: 'waiter', label: 'Mozos & Camareros' },
      { id: 'barman', label: 'Barmans & Barras' },
      { id: 'security', label: 'Seguridad y Acceso' },
      { id: 'coordinator', label: 'Organizadores/Coordinadores' },
      { id: 'cleaning', label: 'Limpieza y Limpiadores' }
    ]
  },
  {
    id: 'MUSIC',
    label: 'Música & Show',
    emoji: '🎵',
    subcategories: [
      { id: 'dj', label: 'DJs Profesionales' },
      { id: 'band', label: 'Bandas en Vivo' },
      { id: 'show', label: 'Animadores & Shows' },
      { id: 'sound', label: 'Sonido e Iluminación Técnica' }
    ]
  },
  {
    id: 'CATERING',
    label: 'Gastronomía',
    emoji: '🍽️',
    subcategories: [
      { id: 'bbq', label: 'Asado & Parrilla' },
      { id: 'gourmet', label: 'Catering Gourmet' },
      { id: 'foodtruck', label: 'Foodtrucks & Puestos' },
      { id: 'sweet', label: 'Pastelería & Mesa Dulce' },
      { id: 'drinks', label: 'Barras de Tragos Móviles' }
    ]
  },
  {
    id: 'PHOTOGRAPHY',
    label: 'Foto & Video',
    emoji: '📸',
    subcategories: [
      { id: 'photo', label: 'Fotografía Profesional' },
      { id: 'video', label: 'Filmación & Edición' },
      { id: 'booth', label: 'Cabinas de Fotos (Photobooth)' },
      { id: 'drone', label: 'Tomas con Drones 4K' }
    ]
  },
  {
    id: 'AMBIENCE',
    label: 'Ambientación & Salón',
    emoji: '🏢',
    subcategories: [
      { id: 'venue', label: 'Salones & Quintas' },
      { id: 'decor', label: 'Decoración & Flores' },
      { id: 'furniture', label: 'Alquiler de Living/Mobiliario' },
      { id: 'lights', label: 'Ambientación Lumínica' }
    ]
  }
];

// Datos Mock del catálogo local rico y estructurado por categorías y subcategorías
export const MOCK_CATALOG = [
  // ── PERSONAL & STAFF ──
  {
    id: 'p1',
    title: 'Mozo Profesional',
    category: 'STAFF',
    subCategory: 'waiter',
    price: 4500,
    distanceKm: 1.2,
    rating: 4.9,
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=80&q=80',
    description: 'Servicio de mesa de alta etiqueta para bodas y recepciones formales.',
    availableExtras: [
      { name: 'Uniforme de gala completo', price: 1000 },
      { name: 'Hora adicional de servicio', price: 2000 }
    ]
  },
  {
    id: 'p5',
    title: 'Seguridad y Control de Accesos',
    category: 'STAFF',
    subCategory: 'security',
    price: 6000,
    distanceKm: 4.5,
    rating: 4.6,
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=80&q=80',
    description: 'Personal calificado para control de entradas y seguridad perimetral.',
    availableExtras: [
      { name: 'Radiotransmisores integrados', price: 800 },
      { name: 'Patrullaje perimetral nocturno', price: 1500 }
    ]
  },
  {
    id: 'p10',
    title: 'Barman & Mixología Exclusiva',
    category: 'STAFF',
    subCategory: 'barman',
    price: 5500,
    distanceKm: 1.8,
    rating: 4.9,
    avatar: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=80&q=80',
    description: 'Preparación de cócteles clásicos y de autor en barras móviles.',
    availableExtras: [
      { name: 'Vasos y cristalería premium', price: 1500 },
      { name: 'Tragos ahumados de especialidad', price: 2500 }
    ]
  },

  // ── MÚSICA & SHOW ──
  {
    id: 'p2',
    title: 'DJ con Sonido Premium',
    category: 'MUSIC',
    subCategory: 'dj',
    price: 12000,
    distanceKm: 3.8,
    rating: 4.8,
    avatar: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=80&q=80',
    description: 'Sonido line array, luces robóticas y set personalizado para fiestas.',
    availableExtras: [
      { name: 'Máquina de humo neón', price: 2000 },
      { name: 'Show de luces láser 3D', price: 3500 }
    ]
  },
  {
    id: 'p6',
    title: 'Banda de Covers Pop & Rock',
    category: 'MUSIC',
    subCategory: 'band',
    price: 35000,
    distanceKm: 2.7,
    rating: 4.9,
    avatar: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=80&q=80',
    description: 'Show interactivo de 90 minutos con hits de todas las décadas en vivo.',
    availableExtras: [
      { name: 'Set acústico de recepción', price: 5000 },
      { name: 'Sonido ampliado para exteriores', price: 4000 }
    ]
  },

  // ── GASTRONOMÍA ──
  {
    id: 'p3',
    title: 'Catering Asado y Parrilla',
    category: 'CATERING',
    subCategory: 'bbq',
    price: 28000,
    distanceKm: 0.8,
    rating: 4.9,
    avatar: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=80&q=80',
    description: 'Cortes premium madurados, achuras completas y ensaladas gourmet.',
    availableExtras: [
      { name: 'Barra libre de postres rústicos', price: 4000 },
      { name: 'Mesa de picada de fiambres artesanales', price: 3000 }
    ]
  },
  {
    id: 'p7',
    title: 'Mesa Dulce & Pastelería Fina',
    category: 'CATERING',
    subCategory: 'sweet',
    price: 18000,
    distanceKm: 1.5,
    rating: 4.7,
    avatar: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=80&q=80',
    description: 'Cascada de chocolate, macarons franceses, tartas frutales y cupcakes.',
    availableExtras: [
      { name: 'Torta de bodas personalizada de 3 pisos', price: 7000 },
      { name: 'Mesa dulce apto celíacos/vegano', price: 3000 }
    ]
  },

  // ── FOTO & VIDEO ──
  {
    id: 'p4',
    title: 'Fotografía & Video HD',
    category: 'PHOTOGRAPHY',
    subCategory: 'photo',
    price: 15000,
    distanceKm: 2.1,
    rating: 4.7,
    avatar: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=80&q=80',
    description: 'Álbum digital completo, cobertura en vivo y edición cinemática rápida.',
    availableExtras: [
      { name: 'Filmación con drone 4K', price: 5000 },
      { name: 'Sesión pre-boda en locación externa', price: 4000 }
    ]
  },
  {
    id: 'p8',
    title: 'Cabina de Fotos (Photobooth)',
    category: 'PHOTOGRAPHY',
    subCategory: 'booth',
    price: 9000,
    distanceKm: 3.2,
    rating: 4.8,
    avatar: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=80&q=80',
    description: 'Cabina inflable con luces led, impresión de tiras al instante y cotillón gracioso.',
    availableExtras: [
      { name: 'Libro de firmas de invitados con fotos', price: 2000 },
      { name: 'Impresión de fotos magnéticas', price: 1500 }
    ]
  },

  // ── AMBIENTACIÓN & SALÓN ──
  {
    id: 'p9',
    title: 'Salón Multiespacio Palermo',
    category: 'AMBIENCE',
    subCategory: 'venue',
    price: 60000,
    distanceKm: 0.5,
    rating: 5.0,
    avatar: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=80&q=80',
    description: 'Capacidad para 150 personas. Incluye climatización central, escenario y terraza.',
    availableExtras: [
      { name: 'Coordinador del Salón por 6 horas', price: 5000 },
      { name: 'Limpieza previa y posterior al evento', price: 3000 }
    ]
  },
  {
    id: 'p11',
    title: 'Decoración Floral & Flores de Estación',
    category: 'AMBIENCE',
    subCategory: 'decor',
    price: 13000,
    distanceKm: 1.4,
    rating: 4.7,
    avatar: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=80&q=80',
    description: 'Centros de mesa florales, arreglos florales en altar y guirnaldas verdes de eucalipto.',
    availableExtras: [
      { name: 'Arco floral para bodas', price: 4000 },
      { name: 'Ramos para la novia y madrinas', price: 2500 }
    ]
  }
];

class ApiService {
  private mode: AppMode = 'demo';
  private apiUrl: string = 'http://localhost:3000'; // Default API Host
  private socket: Socket | null = null;

  setMode(newMode: AppMode) {
    this.mode = newMode;
  }

  getMode(): AppMode {
    return this.mode;
  }

  setApiUrl(url: string) {
    this.apiUrl = url;
  }

  getApiUrl(): string {
    return this.apiUrl;
  }

  /**
   * Obtiene los proveedores (catálogo).
   * En modo REAL, llama a la API NestJS expuesta por users-service/catalog-service.
   * En modo DEMO, retorna los datos mock locales filtrados por categoría y subcategoría.
   */
  async getProviders(categoryFilter?: string | null, subCategoryFilter?: string | null): Promise<any[]> {
    if (this.mode === 'demo') {
      let result = MOCK_CATALOG;
      if (categoryFilter) {
        result = result.filter(p => p.category === categoryFilter);
      }
      if (subCategoryFilter) {
        result = result.filter(p => p.subCategory === subCategoryFilter);
      }
      return result;
    }

    try {
      // Endpoint real del backend (users-service o api-gateway)
      let url = `${this.apiUrl}/api/v1/providers`;
      const queryParams = [];
      if (categoryFilter) queryParams.push(`category=${categoryFilter}`);
      if (subCategoryFilter) queryParams.push(`subCategory=${subCategoryFilter}`);
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      
      // Adaptar el formato del backend al formato del frontend
      return data.map((p: any) => ({
        id: p.id || p.userId,
        title: p.name || 'Proveedor Profesional',
        category: p.serviceCategory || 'STAFF',
        subCategory: p.serviceSubCategory || 'waiter',
        price: p.hourlyRate || 5000,
        distanceKm: p.distanceKm || parseFloat((Math.random() * 4 + 0.5).toFixed(1)),
        rating: p.rating || parseFloat((Math.random() * 0.5 + 4.5).toFixed(1)),
        avatar: p.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80',
        description: p.bio || 'Proveedor verificado por EventGo.',
        availableExtras: [
          { name: 'Servicio premium ampliado', price: Math.round(p.hourlyRate * 0.2) }
        ]
      }));

    } catch (err) {
      console.warn('Fallo de conexión con API Real. Usando Fallback local (Mocks).', err);
      let result = MOCK_CATALOG;
      if (categoryFilter) {
        result = result.filter(p => p.category === categoryFilter);
      }
      if (subCategoryFilter) {
        result = result.filter(p => p.subCategory === subCategoryFilter);
      }
      return result;
    }
  }

  /**
   * Crea una orden de reserva / matchmaking.
   */
  async createBooking(bookingData: any): Promise<any> {
    if (this.mode === 'demo') {
      return { success: true, bookingId: 'mock-booking-' + Math.random().toString(36).substr(2, 9) };
    }

    const res = await fetch(`${this.apiUrl}/api/v1/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });
    
    if (!res.ok) throw new Error('Error al crear reserva en el servidor');
    return await res.json();
  }

  /**
   * Establece conexión WebSocket para eventos de matchmaking, pings y tracking en tiempo real.
   */
  setupWebSocket(
    role: 'client' | 'provider',
    userId: string,
    onMessage: (event: string, payload: any) => void
  ) {
    if (this.mode === 'demo') {
      return this.createMockSocket(role, onMessage);
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(this.apiUrl, {
      query: { role, userId },
      transports: ['websocket']
    });

    this.socket.on('provider-ping', (payload) => onMessage('provider-ping', payload));
    this.socket.on('booking-status-updated', (payload) => onMessage('booking-status-updated', payload));
    this.socket.on('chat-message', (payload) => onMessage('chat-message', payload));

    return this.socket;
  }

  private createMockSocket(role: 'client' | 'provider', onMessage: (event: string, payload: any) => void) {
    const intervals: any[] = [];

    const mockSocket = {
      emit: (event: string, payload: any) => {
        console.log(`[Mock Socket Emit] Evento: ${event}`, payload);

        if (event === 'accept-job') {
          setTimeout(() => {
            onMessage('booking-status-updated', { status: 'preparing' });
          }, 1000);
        } else if (event === 'update-tracking-status') {
          setTimeout(() => {
            onMessage('booking-status-updated', { status: payload.status });
          }, 500);
        } else if (event === 'send-chat-msg') {
          setTimeout(() => {
            onMessage('chat-message', {
              sender: role === 'client' ? 'provider' : 'client',
              text: '¡Entendido! Ya me pongo a trabajar en eso.',
              timestamp: new Date().toLocaleTimeString()
            });
          }, 1500);
        }
      },
      disconnect: () => {
        intervals.forEach(clearInterval);
        console.log('[Mock Socket] Desconectado');
      }
    };

    return mockSocket;
  }
}

export const apiService = new ApiService();
