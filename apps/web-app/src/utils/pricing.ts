export interface CartExtra {
  name: string;
  price: number;
}

export interface CartItem {
  id: string;
  name: string;
  basePrice: number;
  category: string;
  selectedExtras: CartExtra[];
}

export interface CartBreakdown {
  subtotal: number;
  surgeSurcharge: number;
  serviceFee: number;
  total: number;
}

export function calculateCartTotal(items: CartItem[], multiplier: number = 1.0): CartBreakdown {
  // 1. Calcular subtotal (precio base + adicionales de cada servicio)
  let subtotal = 0;
  for (const item of items) {
    let itemTotal = Number(item.basePrice);
    if (item.selectedExtras) {
      for (const extra of item.selectedExtras) {
        itemTotal += Number(extra.price);
      }
    }
    subtotal += itemTotal;
  }

  // 2. Calcular recargo por tarifa dinámica (surge pricing)
  // ej: 1.3x multiplica el subtotal. El recargo es subtotal * 0.3
  const activeMultiplier = Math.max(1.0, multiplier);
  const surgeSurcharge = Math.round(subtotal * (activeMultiplier - 1.0) * 100) / 100;

  // 3. Tasa de servicio fija de plataforma (5% del subtotal + recargo dinámico)
  const serviceFee = Math.round((subtotal + surgeSurcharge) * 0.05 * 100) / 100;

  // 4. Monto total final
  const total = subtotal + surgeSurcharge + serviceFee;

  return {
    subtotal,
    surgeSurcharge,
    serviceFee,
    total,
  };
}
