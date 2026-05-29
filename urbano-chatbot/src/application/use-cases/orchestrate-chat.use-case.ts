import { streamText, tool, jsonSchema } from "ai";
import { openai } from "@ai-sdk/openai";
import { vectorDBService } from "../../infrastructure/adapters/vector-db";
import { logger } from "../../lib/logger";

export class OrchestrateChatUseCase {
  async execute(messages: any[]) {
    logger.info("Orchestrating chat completion stream request...", {
      messageCount: messages.length,
    });

    const systemPrompt = `Eres un asistente virtual inteligente, moderno y resolutivo.
Tu objetivo es ayudar a los usuarios de manera proactiva y resolver sus dudas.

INSTRUCCIÓN CRÍTICA: Tienes una herramienta llamada "searchKnowledgeBase" para consultar la base de conocimientos. Si el usuario te hace preguntas técnicas, informativas o de políticas (por ejemplo: "qué es este bot", "cómo funciona el micrófono", "tienen política de soporte", "cloudflare", etc.), usa SIEMPRE la herramienta searchKnowledgeBase para buscar la respuesta más exacta y precisa antes de dar tu contestación. NUNCA inventes información que no esté sustentada por los documentos recuperados.

Directrices de comportamiento:
1. Sé extremadamente educado, moderno y profesional. Habla en español.
2. Responde de forma clara, concisa y útil.
3. Si la búsqueda no arroja ningún resultado y no sabes algo, sé honesto y dilo.`;

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
        searchKnowledgeBase: tool({
          description: "Queries the local knowledge base or FAQ dataset to answer technical, policy, or support questions.",
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
            logger.info("Executing tool: searchKnowledgeBase...", {
              query,
            });
            const results = await vectorDBService.search(query);
            return { results };
          },
        }),
      },
    });
  }
}
