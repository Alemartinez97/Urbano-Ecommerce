/**
 * PRICING UTILITY TESTS (Frontend)
 * Valida el cálculo de subtotal, recargo dinámico, tasa de servicio y total.
 */
import { describe, it, expect } from 'vitest';
import { calculateCartTotal } from '../utils/pricing';

const MOZO = { id: 'p1', name: 'Mozo', basePrice: 4500, category: 'STAFF', selectedExtras: [] };
const DJ   = { id: 'p2', name: 'DJ',   basePrice: 12000, category: 'MUSIC', selectedExtras: [{ name: 'Laser', price: 2000 }] };

describe('calculateCartTotal — Cálculo de precios del carrito', () => {
  describe('Multiplicador 1.0x (demanda normal)', () => {
    it('calcula subtotal correcto sin extras', () => {
      const r = calculateCartTotal([MOZO], 1.0);
      expect(r.subtotal).toBe(4500);
    });

    it('incluye extras en el subtotal', () => {
      const r = calculateCartTotal([DJ], 1.0);
      expect(r.subtotal).toBe(14000); // 12000 + 2000 extra
    });

    it('no aplica recargo dinámico con multiplicador 1.0', () => {
      const r = calculateCartTotal([MOZO], 1.0);
      expect(r.surgeSurcharge).toBe(0);
    });

    it('calcula tasa de servicio del 5% sobre el subtotal', () => {
      const r = calculateCartTotal([MOZO], 1.0);
      expect(r.serviceFee).toBe(Math.round(4500 * 0.05)); // 225
    });

    it('total = subtotal + serviceFee cuando no hay recargo', () => {
      const r = calculateCartTotal([MOZO], 1.0);
      expect(r.total).toBe(r.subtotal + r.serviceFee);
    });
  });

  describe('Multiplicador 1.35x (Surge pricing — alta demanda)', () => {
    it('aplica recargo del 35% sobre el subtotal', () => {
      const r = calculateCartTotal([MOZO], 1.35);
      expect(r.surgeSurcharge).toBe(Math.round(4500 * 0.35));
    });

    it('el total incluye subtotal + recargo + tasa de servicio', () => {
      const r = calculateCartTotal([MOZO], 1.35);
      const esperado = r.subtotal + r.surgeSurcharge + r.serviceFee;
      expect(r.total).toBe(esperado);
    });
  });

  describe('Carrito con múltiples items', () => {
    it('acumula subtotales de todos los servicios', () => {
      const r = calculateCartTotal([MOZO, DJ], 1.0);
      expect(r.subtotal).toBe(4500 + 14000); // 18500
    });

    it('calcula tasa de servicio sobre el total acumulado', () => {
      const r = calculateCartTotal([MOZO, DJ], 1.0);
      expect(r.serviceFee).toBe(Math.round(18500 * 0.05));
    });
  });

  describe('Carrito vacío', () => {
    it('retorna ceros para carrito vacío', () => {
      const r = calculateCartTotal([], 1.0);
      expect(r.subtotal).toBe(0);
      expect(r.total).toBe(0);
      expect(r.surgeSurcharge).toBe(0);
      expect(r.serviceFee).toBe(0);
    });
  });
});
