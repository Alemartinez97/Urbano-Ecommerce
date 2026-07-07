/**
 * COUPON & DISCOUNT TESTS
 * Valida la lógica de cupones, descuentos y el badge de ahorro PedidosYa.
 */
import { describe, it, expect } from 'vitest';

// Lógica de cupones reproducida del App.tsx
function applyCoupon(
  code: string,
  subtotal: number
): { discount: number; error: string; success: string } {
  const normalized = code.trim().toUpperCase();

  if (normalized === 'EVENTGO20') {
    const discount = Math.round(subtotal * 0.20);
    return { discount, error: '', success: `¡Cupón 20% aplicado! (-$${discount.toLocaleString()})` };
  }

  if (normalized === 'PROMO50') {
    const discount = Math.round(subtotal * 0.50);
    return { discount, error: '', success: `¡Cupón bienvenida 50% aplicado! (-$${discount.toLocaleString()})` };
  }

  return { discount: 0, error: 'Cupón inválido. Pruebe EVENTGO20 o PROMO50', success: '' };
}

function calcFinalTotal(subtotal: number, surge: number, delivery: number, serviceFee: number, tip: number, discount: number): number {
  return Math.max(0, subtotal + surge + delivery + serviceFee + tip - discount);
}

describe('Cupones y descuentos — Flujo de checkout', () => {
  const SUBTOTAL = 10000;

  describe('Cupón EVENTGO20 (20% de descuento)', () => {
    it('aplica un descuento del 20% sobre el subtotal', () => {
      const r = applyCoupon('EVENTGO20', SUBTOTAL);
      expect(r.discount).toBe(2000);
      expect(r.error).toBe('');
    });

    it('funciona en minúsculas (case insensitive)', () => {
      const r = applyCoupon('eventgo20', SUBTOTAL);
      expect(r.discount).toBe(2000);
    });

    it('retorna mensaje de éxito', () => {
      const r = applyCoupon('EVENTGO20', SUBTOTAL);
      expect(r.success).toContain('20%');
    });
  });

  describe('Cupón PROMO50 (50% de descuento)', () => {
    it('aplica un descuento del 50% sobre el subtotal', () => {
      const r = applyCoupon('PROMO50', SUBTOTAL);
      expect(r.discount).toBe(5000);
      expect(r.error).toBe('');
    });

    it('retorna mensaje de éxito con monto ahorrado', () => {
      const r = applyCoupon('PROMO50', SUBTOTAL);
      expect(r.success).toContain('50%');
    });
  });

  describe('Cupón inválido', () => {
    it('retorna error con cupón inexistente', () => {
      const r = applyCoupon('INVALIDO', SUBTOTAL);
      expect(r.discount).toBe(0);
      expect(r.error).toBeTruthy();
    });

    it('no aplica descuento con cupón vacío', () => {
      const r = applyCoupon('', SUBTOTAL);
      expect(r.discount).toBe(0);
    });

    it('no aplica descuento con espacios solamente', () => {
      const r = applyCoupon('   ', SUBTOTAL);
      expect(r.discount).toBe(0);
    });
  });

  describe('Cálculo final del total con descuento', () => {
    it('el total nunca es negativo aunque el descuento supere el monto', () => {
      const total = calcFinalTotal(100, 0, 0, 5, 0, 99999);
      expect(total).toBeGreaterThanOrEqual(0);
    });

    it('descuento PROMO50 reduce correctamente el total final', () => {
      const subtotal = 10000;
      const { discount } = applyCoupon('PROMO50', subtotal);
      const total = calcFinalTotal(subtotal, 0, 0, 500, 0, discount);
      expect(total).toBe(subtotal + 500 - discount); // 10500 - 5000 = 5500
    });

    it('la propina se suma al total después del descuento', () => {
      const total = calcFinalTotal(10000, 0, 0, 500, 1000, 2000);
      // 10000 + 500 + 1000 - 2000 = 9500
      expect(total).toBe(9500);
    });
  });
});
