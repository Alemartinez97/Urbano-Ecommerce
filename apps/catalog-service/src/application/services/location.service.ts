import { Injectable } from '@nestjs/common';

export interface GeolocatedEntity {
  latitude: number;
  longitude: number;
  [key: string]: any;
}

@Injectable()
export class LocationService {
  private readonly EARTH_RADIUS_KM = 6371; // Radio medio de la Tierra

  /**
   * Calcula la distancia en kilómetros entre dos coordenadas usando la fórmula de Haversine.
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    if (lat1 === lat2 && lon1 === lon2) {
      return 0;
    }

    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = this.EARTH_RADIUS_KM * c;

    // Redondear a 2 decimales para evitar problemas de precisión en flotantes
    return Math.round(distance * 100) / 100;
  }

  /**
   * Comprueba si una coordenada está dentro del radio (geocerca) de un punto central.
   */
  isWithinRadius(
    centerLat: number,
    centerLon: number,
    targetLat: number,
    targetLon: number,
    radiusKm: number,
  ): boolean {
    const distance = this.calculateDistance(centerLat, centerLon, targetLat, targetLon);
    return distance <= radiusKm;
  }

  /**
   * Filtra una lista de entidades (ej: proveedores) para conservar solo las que estén
   * dentro del radio de geocerca del evento, y las ordena de la más cercana a la más lejana.
   */
  filterAndSortByDistance<T extends GeolocatedEntity>(
    centerLat: number,
    centerLon: number,
    radiusKm: number,
    entities: T[],
  ): (T & { distanceKm: number })[] {
    return entities
      .map((entity) => {
        const distanceKm = this.calculateDistance(
          centerLat,
          centerLon,
          entity.latitude,
          entity.longitude,
        );
        return { ...entity, distanceKm };
      })
      .filter((entity) => entity.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
