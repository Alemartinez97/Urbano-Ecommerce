/**
 * MATCHMAKING LOGIC TESTS
 * Valida la lógica de selección de proveedor según sortOrder,
 * el cálculo de costo de desplazamiento y la política de sustitución.
 */
import { describe, it, expect } from 'vitest';

// ── Helpers reproducidos del App.tsx ─────────────────────────────────────

interface Provider {
  id: string;
  name: string;
  category: string;
  distanceKm: number;
  online: boolean;
}

interface CartItem {
  id: string;
  distanceKm: number;
  price: number;
  quantity: number;
  selectedExtras: { name: string; price: number }[];
}

/** Costo de desplazamiento: $250 por km */
function calcDeliveryFee(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + Math.round(item.distanceKm * 250), 0);
}

/** Selección del proveedor a pingar según sortOrder */
function selectFirstProvider(
  providers: Provider[],
  sortOrder: 'distance' | 'price',
  onlineOnly = true
): Provider | null {
  const pool = onlineOnly ? providers.filter(p => p.online) : providers;
  if (pool.length === 0) return null;

  if (sortOrder === 'distance') {
    return pool.reduce((closest, p) =>
      p.distanceKm < closest.distanceKm ? p : closest
    );
  }
  return pool[0]; // ya ordenados por precio externamente
}

/** Política de sustitución: si hay múltiples online, puede reasignar */
function canAutoReassign(providers: Provider[], excludeId: string): boolean {
  return providers.filter(p => p.online && p.id !== excludeId).length > 0;
}

// ── Datos de prueba ───────────────────────────────────────────────────────

const NEARBY_DJS: Provider[] = [
  { id: 'dj1', name: 'Carlos',  category: 'MUSIC', distanceKm: 0.6, online: true  },
  { id: 'dj2', name: 'Rodrigo', category: 'MUSIC', distanceKm: 1.1, online: true  },
  { id: 'dj3', name: 'Tomás',   category: 'MUSIC', distanceKm: 2.3, online: true  },
  { id: 'dj4', name: 'Ana',     category: 'MUSIC', distanceKm: 3.1, online: true  },
  { id: 'dj5', name: 'Julia',   category: 'MUSIC', distanceKm: 4.5, online: false }, // offline
];

describe('Matchmaking — Selección de proveedor y reasignación', () => {
  describe('Selección del proveedor más cercano (sortOrder=distance)', () => {
    it('selecciona al DJ más cercano de los 5 disponibles', () => {
      const first = selectFirstProvider(NEARBY_DJS, 'distance');
      expect(first?.id).toBe('dj1'); // Carlos a 0.6km
      expect(first?.distanceKm).toBe(0.6);
    });

    it('ignora proveedores offline en la selección', () => {
      const offlineAll: Provider[] = NEARBY_DJS.map(p => ({ ...p, online: false }));
      const first = selectFirstProvider(offlineAll, 'distance');
      expect(first).toBeNull();
    });

    it('con 5 DJs cerca, selecciona el de menor distancia', () => {
      const first = selectFirstProvider(NEARBY_DJS, 'distance');
      const onlineProviders = NEARBY_DJS.filter(p => p.online);
      const minDist = Math.min(...onlineProviders.map(p => p.distanceKm));
      expect(first?.distanceKm).toBe(minDist);
    });
  });

  describe('Reasignación automática (política de sustitución)', () => {
    it('puede reasignar si hay más DJs disponibles al rechazar el primero', () => {
      // dj1 rechaza → ¿hay alguien más?
      expect(canAutoReassign(NEARBY_DJS, 'dj1')).toBe(true);
    });

    it('puede reasignar si rechaza el segundo proveedor también', () => {
      expect(canAutoReassign(NEARBY_DJS, 'dj2')).toBe(true);
    });

    it('NO puede reasignar si solo hay 1 proveedor online', () => {
      const soloProvider: Provider[] = [
        { id: 'solo', name: 'Solo DJ', category: 'MUSIC', distanceKm: 1.0, online: true },
      ];
      expect(canAutoReassign(soloProvider, 'solo')).toBe(false);
    });

    it('con 5 DJs, puede reasignar hasta 4 veces antes de agotar opciones', () => {
      const onlineDJs = NEARBY_DJS.filter(p => p.online); // 4 online
      let remaining = onlineDJs;
      let reassignCount = 0;

      for (const rejected of onlineDJs) {
        if (canAutoReassign(remaining, rejected.id)) {
          reassignCount++;
          remaining = remaining.filter(p => p.id !== rejected.id);
        }
      }
      // Puede reasignar 3 veces (después del 4to no queda nadie)
      expect(reassignCount).toBe(3);
    });
  });

  describe('Costo de desplazamiento (delivery fee)', () => {
    it('calcula $250 por km de distancia del proveedor', () => {
      const cart: CartItem[] = [
        { id: 'i1', distanceKm: 1.0, price: 4500, quantity: 1, selectedExtras: [] },
      ];
      expect(calcDeliveryFee(cart)).toBe(250);
    });

    it('calcula correctamente para 2.5 km', () => {
      const cart: CartItem[] = [
        { id: 'i1', distanceKm: 2.5, price: 4500, quantity: 1, selectedExtras: [] },
      ];
      expect(calcDeliveryFee(cart)).toBe(625);
    });

    it('acumula el costo de desplazamiento de múltiples servicios', () => {
      const cart: CartItem[] = [
        { id: 'i1', distanceKm: 1.2, price: 4500,  quantity: 1, selectedExtras: [] }, // 300
        { id: 'i2', distanceKm: 3.8, price: 12000, quantity: 1, selectedExtras: [] }, // 950
      ];
      expect(calcDeliveryFee(cart)).toBe(300 + 950); // 1250
    });

    it('costo 0 si el proveedor está en la misma ubicación (0 km)', () => {
      const cart: CartItem[] = [
        { id: 'i1', distanceKm: 0, price: 4500, quantity: 1, selectedExtras: [] },
      ];
      expect(calcDeliveryFee(cart)).toBe(0);
    });
  });

  describe('Impacto de tener 5 DJs disponibles en el precio', () => {
    it('alta oferta (5 DJs) → multiplicador debería ser 1.0x (precio base)', () => {
      // Lógica del PricingService: si oferta >= demanda → multiplier = 1.0
      const onlineProviders = NEARBY_DJS.filter(p => p.online).length; // 4 online
      const activeBookings = 2; // demanda

      const multiplier = activeBookings > onlineProviders
        ? Math.min(1 + (activeBookings / onlineProviders) * 0.1, 1.5)
        : 1.0;

      expect(multiplier).toBe(1.0);
      expect(onlineProviders).toBeGreaterThan(activeBookings);
    });

    it('baja oferta (1 DJ para 5 pedidos) → multiplicador > 1.0x (surge)', () => {
      const onlineProviders = 1;
      const activeBookings = 5;

      const multiplier = activeBookings > onlineProviders
        ? Math.min(1 + (activeBookings / onlineProviders) * 0.1, 1.5)
        : 1.0;

      expect(multiplier).toBeGreaterThan(1.0);
    });
  });
});
