/**
 * CATALOG SORT & FILTER TESTS
 * Valida que el ordenamiento del catálogo funcione correctamente
 * y que afecte el orden de ping en el matchmaking.
 */
import { describe, it, expect } from 'vitest';

// Reproducimos la lógica de filtrado+sort que existe en App.tsx
// para poder testearla independientemente del componente completo.
interface CatalogItem {
  id: string;
  title: string;
  category: string;
  price: number;
  distanceKm: number;
  rating: number;
}

const CATALOG: CatalogItem[] = [
  { id: '1', title: 'Mozo Profesional',       category: 'STAFF',       price: 4500,  distanceKm: 1.2, rating: 4.9 },
  { id: '2', title: 'DJ con Sonido Premium',  category: 'MUSIC',       price: 12000, distanceKm: 3.8, rating: 4.8 },
  { id: '3', title: 'Catering Asado',         category: 'CATERING',    price: 28000, distanceKm: 0.8, rating: 4.9 },
  { id: '4', title: 'Fotografía & Video HD',  category: 'PHOTOGRAPHY', price: 15000, distanceKm: 2.1, rating: 4.7 },
];

function applySortAndFilter(
  items: CatalogItem[],
  categoryFilter: string | null,
  sortOrder: 'distance' | 'price' | 'rating'
): CatalogItem[] {
  const base = categoryFilter ? items.filter(p => p.category === categoryFilter) : items;
  return [...base].sort((a, b) => {
    if (sortOrder === 'distance') return a.distanceKm - b.distanceKm;
    if (sortOrder === 'price')    return a.price - b.price;
    if (sortOrder === 'rating')   return b.rating - a.rating;
    return 0;
  });
}

describe('Catálogo — Filtrado y Ordenamiento (afecta orden de ping)', () => {
  describe('Filtrado por categoría', () => {
    it('sin filtro devuelve todos los ítems', () => {
      const r = applySortAndFilter(CATALOG, null, 'distance');
      expect(r).toHaveLength(4);
    });

    it('filtra correctamente por categoría MUSIC', () => {
      const r = applySortAndFilter(CATALOG, 'MUSIC', 'distance');
      expect(r).toHaveLength(1);
      expect(r[0].title).toBe('DJ con Sonido Premium');
    });

    it('filtra correctamente por categoría CATERING', () => {
      const r = applySortAndFilter(CATALOG, 'CATERING', 'distance');
      expect(r).toHaveLength(1);
      expect(r[0].category).toBe('CATERING');
    });

    it('devuelve array vacío si no hay ítems en la categoría', () => {
      const r = applySortAndFilter(CATALOG, 'VENUE', 'distance');
      expect(r).toHaveLength(0);
    });
  });

  describe('Ordenamiento por distancia (proveedor más cercano pinga primero)', () => {
    it('el primer ítem es el más cercano', () => {
      const r = applySortAndFilter(CATALOG, null, 'distance');
      expect(r[0].distanceKm).toBe(0.8); // Catering 0.8km
      expect(r[0].title).toBe('Catering Asado');
    });

    it('los ítems están ordenados de menor a mayor distancia', () => {
      const r = applySortAndFilter(CATALOG, null, 'distance');
      for (let i = 0; i < r.length - 1; i++) {
        expect(r[i].distanceKm).toBeLessThanOrEqual(r[i + 1].distanceKm);
      }
    });
  });

  describe('Ordenamiento por precio (proveedor más barato primero)', () => {
    it('el primer ítem es el más barato', () => {
      const r = applySortAndFilter(CATALOG, null, 'price');
      expect(r[0].price).toBe(4500); // Mozo
    });

    it('los ítems están ordenados de menor a mayor precio', () => {
      const r = applySortAndFilter(CATALOG, null, 'price');
      for (let i = 0; i < r.length - 1; i++) {
        expect(r[i].price).toBeLessThanOrEqual(r[i + 1].price);
      }
    });
  });

  describe('Ordenamiento por calificación (mejor calificado primero)', () => {
    it('el primer ítem tiene la calificación más alta', () => {
      const r = applySortAndFilter(CATALOG, null, 'rating');
      expect(r[0].rating).toBeGreaterThanOrEqual(r[1].rating);
    });

    it('los ítems están ordenados de mayor a menor rating', () => {
      const r = applySortAndFilter(CATALOG, null, 'rating');
      for (let i = 0; i < r.length - 1; i++) {
        expect(r[i].rating).toBeGreaterThanOrEqual(r[i + 1].rating);
      }
    });
  });

  describe('Combinación filtro + orden', () => {
    it('filtra por STAFF y ordena por precio (aunque solo haya 1 ítem)', () => {
      const r = applySortAndFilter(CATALOG, 'STAFF', 'price');
      expect(r).toHaveLength(1);
      expect(r[0].category).toBe('STAFF');
    });
  });
});
