import { calculateCartTotal } from './pricing';
import type { CartItem } from './pricing';

describe('Frontend Pricing Utility (TDD - PedidosYa UX Cart)', () => {
  const mockItems: CartItem[] = [
    {
      id: 'item-1',
      name: 'DJ Sonido Premium',
      basePrice: 10000,
      category: 'MUSIC',
      selectedExtras: [
        { name: 'Luces láser rítmicas', price: 2000 },
        { name: 'Máquina de humo 3D', price: 1500 },
      ],
    },
    {
      id: 'item-2',
      name: 'Mozo Profesional',
      basePrice: 5000,
      category: 'STAFF',
      selectedExtras: [],
    },
  ];

  it('debe calcular el desglose correcto con tarifa base (multiplicador 1.0)', () => {
    // Subtotal esperado: (10000 + 2000 + 1500) + 5000 = 18500
    // Recargo dinámico (1.0x): 18500 * (1.0 - 1) = 0
    // Tasa de servicio (5%): 18500 * 0.05 = 925
    // Total: 18500 + 0 + 925 = 19425
    const breakdown = calculateCartTotal(mockItems, 1.0);

    expect(breakdown.subtotal).toBe(18500);
    expect(breakdown.surgeSurcharge).toBe(0);
    expect(breakdown.serviceFee).toBe(925);
    expect(breakdown.total).toBe(19425);
  });

  it('debe aplicar recargos dinámicos en base al multiplicador (ej. alta demanda 1.30x)', () => {
    // Subtotal: 18500
    // Recargo dinámico (1.30x): 18500 * (1.3 - 1) = 5550
    // Tasa de servicio (5% de subtotal + recargo): (18500 + 5550) * 0.05 = 24050 * 0.05 = 1202.5
    // Total: 18500 + 5550 + 1202.5 = 25252.5
    const breakdown = calculateCartTotal(mockItems, 1.3);

    expect(breakdown.subtotal).toBe(18500);
    expect(breakdown.surgeSurcharge).toBe(5550);
    expect(breakdown.serviceFee).toBe(1202.5);
    expect(breakdown.total).toBe(25252.5);
  });
});
