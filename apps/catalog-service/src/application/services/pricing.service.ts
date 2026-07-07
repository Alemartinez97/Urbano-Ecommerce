import { Injectable } from '@nestjs/common';

@Injectable()
export class PricingService {
  private readonly sensitivityFactor = 0.15; // Factor K de sensibilidad

  /**
   * Calcula la tarifa dinámica (Surge Pricing) según la oferta y la demanda.
   * 
   * @param basePrice Tarifa base original del servicio
   * @param demandCount Cantidad de solicitudes / eventos activos en la zona (Demanda)
   * @param activeProviders Cantidad de proveedores conectados en la zona (Oferta)
   */
  calculatePrice(
    basePrice: number,
    demandCount: number,
    activeProviders: number,
  ): { finalPrice: number; multiplier: number } {
    // Si la oferta de proveedores supera o iguala la demanda, no hay recargo
    if (demandCount <= activeProviders) {
      return { finalPrice: basePrice, multiplier: 1.0 };
    }

    // M = 1.0 + ((D - S) / (S + 1)) * K
    const divisor = activeProviders + 1;
    const difference = demandCount - activeProviders;
    const surge = (difference / divisor) * this.sensitivityFactor;
    const multiplier = Math.max(1.0, 1.0 + surge);

    const finalPrice = basePrice * multiplier;

    // Redondear para evitar problemas de flotantes y mantener coherencia monetaria
    return {
      finalPrice: Math.round(finalPrice * 100) / 100,
      multiplier: Math.round(multiplier * 100) / 100,
    };
  }
}
