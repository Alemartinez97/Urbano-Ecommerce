import { streamText, tool, jsonSchema } from "ai";
import { openai } from "@ai-sdk/openai";
import { vectorDBService } from "../../infrastructure/adapters/vector-db";
import { eventgoAPI } from "../../infrastructure/adapters/eventgo-api";
import { logger } from "../../lib/logger";

export class OrchestrateChatUseCase {
  async execute(messages: any[]) {
    logger.info("Orchestrating chat completion stream request...", {
      messageCount: messages.length,
    });

    const systemPrompt = `Eres el asistente inteligente de **EventGo**, un marketplace de servicios profesionales para eventos (fiestas, casamientos, corporativos, cumpleaños, etc.).

Tu objetivo es ayudar a los usuarios a encontrar y contratar los mejores proveedores para sus eventos. Puedes responder sobre CUALQUIER tema, pero tu especialidad es EventGo.

═══════════════════════════════════════════════
HERRAMIENTAS DISPONIBLES
═══════════════════════════════════════════════

1. **searchEventServices** — Buscar servicios en el marketplace.
   - Úsala cuando el usuario pida: "buscame un DJ", "mozos baratos", "salones disponibles", "catering para 50 personas", etc.
   - Puedes filtrar por categoría, precio máximo, tags y ordenar por precio.
   - CATEGORÍAS VÁLIDAS: CATERING, MUSIC, STAFF, VENUE, PHOTOGRAPHY, DECORATION.
   - MAPEO DE LENGUAJE NATURAL → CATEGORÍA:
     • Comida, catering, asado, parrilla, cocina → CATERING
     • Música, DJ, banda, grupo musical, sonido → MUSIC
     • Mozos, personal, seguridad, limpieza, barman → STAFF
     • Salón, venue, lugar, espacio, locación → VENUE
     • Fotógrafo, video, filmación, foto → PHOTOGRAPHY
     • Decoración, ambientación, flores → DECORATION

2. **getServiceDetail** — Ver el detalle completo de un servicio.
   - Úsala cuando el usuario quiera más información sobre un servicio específico que ya le mostraste.

3. **checkProviderAvailability** — Verificar si un proveedor está disponible en un horario.
   - Úsala cuando el usuario pregunte si un proveedor está libre en cierta fecha/hora.
   - Necesitas el providerId (lo obtienes de searchEventServices) y las fechas en ISO 8601.
   - Si el usuario dice "el sábado" sin especificar hora, asume 20:00 a 04:00 (horario típico de eventos).

4. **searchKnowledgeBase** — Consultar la base de conocimientos interna.
   - Úsala SOLO para preguntas sobre políticas de la empresa, soporte técnico o información interna de EventGo.

═══════════════════════════════════════════════
FLUJO DE TRABAJO RECOMENDADO
═══════════════════════════════════════════════

Cuando un usuario busca un servicio:
1. Usa searchEventServices con los filtros que el usuario mencione.
2. Presenta los resultados de forma clara: nombre, categoría, precio, rating (⭐).
3. Si el usuario pregunta disponibilidad, usa checkProviderAvailability.
4. Si no hay resultados, sugiere categorías disponibles o ampliar los filtros.

═══════════════════════════════════════════════
CONOCIMIENTO GENERAL
═══════════════════════════════════════════════

Para preguntas que NO sean sobre EventGo (cultura general, deportes, ciencia, personas famosas, programación, etc.), responde directamente con tu propio conocimiento SIN usar herramientas.

═══════════════════════════════════════════════
DIRECTRICES DE COMPORTAMIENTO
═══════════════════════════════════════════════

1. Habla en español, de forma educada y profesional.
2. Sé conciso pero informativo. Usa emojis con moderación para hacer la respuesta más visual.
3. Si los microservicios no responden, informa al usuario amablemente que el servicio no está disponible temporalmente.
4. Si no hay resultados en una búsqueda, sugiere alternativas (otra categoría, rango de precio más amplio).
5. Puedes mantener conversaciones casuales, responder preguntas generales, y ayudar con cualquier tema.
6. Si genuinamente no sabes algo, sé honesto y dilo.`;

    // Map legacy content string format and new useChat parts format to plain messages
    const coreMessages = messages
      .filter((m: any) => m.role === "user" || m.role === "assistant")
      .map((m: any) => {
        let textContent = "";
        if (typeof m.content === "string") {
          textContent = m.content;
        } else if (Array.isArray(m.parts)) {
          textContent = m.parts
            .filter((p: any) => p.type === "text")
            .map((p: any) => p.text || "")
            .join("");
        } else if (Array.isArray(m.content)) {
          textContent = m.content
            .filter((p: any) => p.type === "text")
            .map((p: any) => p.text || "")
            .join("");
        }
        return { role: m.role as "user" | "assistant", content: textContent };
      })
      .filter((m: any) => m.content.trim() !== "");

    return streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      messages: coreMessages,
      tools: {
        // ── Tool 1: Buscar servicios en el marketplace ──────────
        searchEventServices: tool({
          description:
            "Search for event services in the EventGo marketplace. Use this when the user asks for providers like DJs, caterers, venues, photographers, waiters, etc. Returns a list of matching services with prices and ratings.",
          inputSchema: jsonSchema<{
            category?: string;
            maxPrice?: number;
            tags?: string;
            sortByPrice?: string;
          }>({
            type: "object",
            properties: {
              category: {
                type: "string",
                description:
                  "Service category. Must be one of: CATERING, MUSIC, STAFF, VENUE, PHOTOGRAPHY, DECORATION",
                enum: [
                  "CATERING",
                  "MUSIC",
                  "STAFF",
                  "VENUE",
                  "PHOTOGRAPHY",
                  "DECORATION",
                ],
              },
              maxPrice: {
                type: "number",
                description: "Maximum base price filter",
              },
              tags: {
                type: "string",
                description:
                  "Keyword tags for search (e.g. 'asado', 'dj', 'mozo', 'rock')",
              },
              sortByPrice: {
                type: "string",
                description: "Sort results by price: 'asc' or 'desc'",
                enum: ["asc", "desc"],
              },
            },
          }),
          execute: async (params) => {
            logger.info("Tool: searchEventServices", { params });
            const result = await eventgoAPI.searchServices({
              category: params.category,
              maxPrice: params.maxPrice,
              tags: params.tags,
              sortByPrice: params.sortByPrice as "asc" | "desc" | undefined,
            });

            if (result.error) {
              return {
                error: result.error,
                services: [],
                message:
                  "No se pudo conectar con el catálogo de servicios. Verificá que los microservicios estén corriendo.",
              };
            }

            // Format results for the AI to present nicely
            const formatted = result.services.map((s) => ({
              id: s.id,
              providerId: s.providerId,
              name: s.name,
              description: s.description,
              category: s.category,
              pricingType: s.pricingType,
              basePrice: s.basePrice,
              rating: s.rating,
              tags: s.tags,
            }));

            return {
              totalResults: formatted.length,
              services: formatted,
              message:
                formatted.length === 0
                  ? "No se encontraron servicios con esos filtros. Sugerí al usuario ampliar la búsqueda."
                  : `Se encontraron ${formatted.length} servicio(s).`,
            };
          },
        }),

        // ── Tool 2: Detalle de un servicio ──────────────────────
        getServiceDetail: tool({
          description:
            "Get full details of a specific event service by its ID. Use when the user wants more info about a particular service from the search results.",
          inputSchema: jsonSchema<{ serviceId: string }>({
            type: "object",
            properties: {
              serviceId: {
                type: "string",
                description: "The UUID of the service to look up",
              },
            },
            required: ["serviceId"],
          }),
          execute: async ({ serviceId }) => {
            logger.info("Tool: getServiceDetail", { serviceId });
            const result = await eventgoAPI.getServiceById(serviceId);

            if (result.error) {
              return { error: result.error, service: null };
            }

            return { service: result.service };
          },
        }),

        // ── Tool 3: Verificar disponibilidad ────────────────────
        checkProviderAvailability: tool({
          description:
            "Check if a provider is available during a specific time range. Use when the user asks about a provider's availability for a date/time. Requires providerId from a previous search, plus start and end times in ISO 8601 format.",
          inputSchema: jsonSchema<{
            providerId: string;
            startTime: string;
            endTime: string;
          }>({
            type: "object",
            properties: {
              providerId: {
                type: "string",
                description: "UUID of the provider to check",
              },
              startTime: {
                type: "string",
                description:
                  "Start time in ISO 8601 format (e.g. 2025-02-15T20:00:00Z)",
              },
              endTime: {
                type: "string",
                description:
                  "End time in ISO 8601 format (e.g. 2025-02-16T04:00:00Z)",
              },
            },
            required: ["providerId", "startTime", "endTime"],
          }),
          execute: async ({ providerId, startTime, endTime }) => {
            logger.info("Tool: checkProviderAvailability", {
              providerId,
              startTime,
              endTime,
            });
            const result = await eventgoAPI.checkAvailability(
              providerId,
              startTime,
              endTime
            );

            if (result.error) {
              return {
                error: result.error,
                available: null,
                message:
                  "No se pudo verificar la disponibilidad. El servicio de disponibilidad no respondió.",
              };
            }

            return {
              providerId,
              available: result.available,
              startTime,
              endTime,
              message: result.available
                ? "El proveedor está DISPONIBLE en ese horario."
                : "El proveedor NO está disponible en ese horario. Sugerí al usuario otro horario o proveedor.",
            };
          },
        }),

        // ── Tool 4: Base de conocimientos interna ───────────────
        searchKnowledgeBase: tool({
          description:
            "Search the internal knowledge base for company-specific information like policies, support documentation, or internal FAQ. Only use for questions about EventGo's policies and internal operations, NOT for searching event services.",
          inputSchema: jsonSchema<{ query: string }>({
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search keyword or user query",
              },
            },
            required: ["query"],
          }),
          execute: async ({ query }) => {
            logger.info("Tool: searchKnowledgeBase", { query });
            const results = await vectorDBService.search(query);
            return { results };
          },
        }),
      },
    });
  }
}
