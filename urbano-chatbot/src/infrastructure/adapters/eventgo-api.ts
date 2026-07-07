import { logger } from "../../lib/logger";

// ────────────────────────────────────────────────────────────
// EventGo API Client
// Cliente HTTP que abstrae las llamadas a los microservicios
// del backend EventGo (catalog, inventory, users).
// ────────────────────────────────────────────────────────────

const CATALOG_URL =
  process.env.CATALOG_SERVICE_URL || "http://localhost:3001";
const INVENTORY_URL =
  process.env.INVENTORY_SERVICE_URL || "http://localhost:3004";
const USERS_URL =
  process.env.USERS_SERVICE_URL || "http://localhost:3002";

// ── Tipos ───────────────────────────────────────────────────

export interface EventService {
  id: string;
  providerId: string;
  name: string;
  description: string;
  category: string;
  pricingType: string;
  basePrice: number;
  tags: string[];
  rating: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SearchParams {
  category?: string;
  maxPrice?: number;
  tags?: string;
  sortByPrice?: "asc" | "desc";
}

export interface AvailabilityResult {
  providerId: string;
  available: boolean;
}

// ── Helper para fetch seguro ────────────────────────────────

async function safeFetch<T>(
  url: string,
  label: string
): Promise<{ data: T | null; error: string | null }> {
  try {
    logger.info(`[EventGo API] ${label}`, { url });
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000), // 8s timeout
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.error(`[EventGo API] ${label} failed: HTTP ${res.status}`, {
        body,
      });
      return {
        data: null,
        error: `El servicio respondió con error HTTP ${res.status}`,
      };
    }

    const data = (await res.json()) as T;
    return { data, error: null };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error de conexión desconocido";
    logger.error(`[EventGo API] ${label} error: ${message}`);
    return {
      data: null,
      error: `No se pudo conectar con el microservicio (${label}). ¿Está corriendo? Error: ${message}`,
    };
  }
}

// ── Catalog Service ─────────────────────────────────────────

/** Busca servicios del marketplace con filtros opcionales */
export async function searchServices(
  params: SearchParams
): Promise<{ services: EventService[]; error: string | null }> {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.maxPrice) query.set("maxPrice", String(params.maxPrice));
  if (params.tags) query.set("tags", params.tags);
  if (params.sortByPrice) query.set("sortByPrice", params.sortByPrice);

  const url = `${CATALOG_URL}/api/v1/services/search?${query.toString()}`;
  const result = await safeFetch<EventService[]>(url, "searchServices");

  return {
    services: result.data ?? [],
    error: result.error,
  };
}

/** Obtiene el detalle de un servicio específico por su ID */
export async function getServiceById(
  serviceId: string
): Promise<{ service: EventService | null; error: string | null }> {
  const url = `${CATALOG_URL}/api/v1/services/${serviceId}`;
  const result = await safeFetch<EventService>(url, "getServiceById");

  return {
    service: result.data,
    error: result.error,
  };
}

/** Lista todos los servicios activos del marketplace */
export async function listAllServices(): Promise<{
  services: EventService[];
  error: string | null;
}> {
  const url = `${CATALOG_URL}/api/v1/services`;
  const result = await safeFetch<EventService[]>(url, "listAllServices");

  return {
    services: result.data ?? [],
    error: result.error,
  };
}

// ── Inventory / Availability Service ────────────────────────

/** Verifica si un proveedor está disponible en un rango horario */
export async function checkAvailability(
  providerId: string,
  startTime: string,
  endTime: string
): Promise<{ available: boolean | null; error: string | null }> {
  const query = new URLSearchParams({
    providerId,
    startTime,
    endTime,
  });

  const url = `${INVENTORY_URL}/api/v1/availability/check?${query.toString()}`;
  const result = await safeFetch<AvailabilityResult>(
    url,
    "checkAvailability"
  );

  return {
    available: result.data?.available ?? null,
    error: result.error,
  };
}

// ── Exportación del cliente ─────────────────────────────────

export const eventgoAPI = {
  searchServices,
  getServiceById,
  listAllServices,
  checkAvailability,
};

export default eventgoAPI;
