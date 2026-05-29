import fs from "fs";
import path from "path";
import { logger } from "../../lib/logger";

export interface KnowledgeItem {
  id: string;
  question: string;
  answer: string;
  embedding?: number[];
}

export class VectorDBService {
  private datasetPath = path.join(
    process.cwd(),
    "src/infrastructure/adapters/faq-dataset.json"
  );
  private items: KnowledgeItem[] = [];

  constructor() {
    this.loadDataset();
  }

  private loadDataset() {
    try {
      if (fs.existsSync(this.datasetPath)) {
        const raw = fs.readFileSync(this.datasetPath, "utf-8");
        this.items = JSON.parse(raw);
        logger.debug("Knowledge base dataset loaded successfully.", {
          count: this.items.length,
        });
      } else {
        logger.warn("FAQ dataset not found at specified path.", {
          path: this.datasetPath,
        });
      }
    } catch (e) {
      logger.error("Error loading FAQ dataset for RAG:", {
        error: String(e),
      });
    }
  }

  // Token-based keyword and Jaccard similarity fallback
  private localSearch(query: string, limit: number): KnowledgeItem[] {
    const queryTokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    
    const scored = this.items.map(item => {
      const questionTokens = item.question.toLowerCase().split(/\s+/).filter(t => t.length > 2);
      const answerTokens = item.answer.toLowerCase().split(/\s+/).filter(t => t.length > 2);
      
      const allTokens = [...questionTokens, ...answerTokens];
      let matches = 0;
      
      queryTokens.forEach(token => {
        if (allTokens.some(t => t.includes(token) || token.includes(t))) {
          matches += 1;
        }
      });

      const score = matches / (queryTokens.length + 0.1);
      return { item, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.item);
  }

  // Semantic RAG retrieval (with offline local fallback)
  async search(query: string, limit = 2): Promise<string[]> {
    logger.info("Executing RAG search query...", { query });

    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey.startsWith("your_") || apiKey.includes("tu-clave")) {
        logger.warn("Valid OPENAI_API_KEY not found. Falling back to local hybrid search.");
        const results = this.localSearch(query, limit);
        return results.map(
          r => `[Pregunta]: ${r.question}\n[Respuesta]: ${r.answer}`
        );
      }

      logger.info("Computing semantic query embedding using OpenAI...");
      
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: query,
        }),
      });

      if (!res.ok) {
        throw new Error(`OpenAI Embeddings returned status ${res.status}`);
      }

      const resData = await res.json();
      const queryEmbedding: number[] = resData.data[0].embedding;

      // Dynamically compute/cache embeddings & calculate cosine similarity
      const scoredItems = await Promise.all(
        this.items.map(async (item) => {
          let itemEmbedding = item.embedding;
          
          if (!itemEmbedding) {
            const itemRes = await fetch("https://api.openai.com/v1/embeddings", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: "text-embedding-3-small",
                input: `${item.question} ${item.answer}`,
              }),
            });
            if (itemRes.ok) {
              const itemResData = await itemRes.json();
              itemEmbedding = itemResData.data[0].embedding;
              item.embedding = itemEmbedding;
            }
          }

          let score = 0;
          if (itemEmbedding) {
            // Cosine Similarity calculation
            let dotProduct = 0;
            let normA = 0;
            let normB = 0;
            for (let i = 0; i < queryEmbedding.length; i++) {
              dotProduct += queryEmbedding[i] * itemEmbedding[i];
              normA += queryEmbedding[i] * queryEmbedding[i];
              normB += itemEmbedding[i] * itemEmbedding[i];
            }
            score = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
          }

          return { item, score };
        })
      );

      const sorted = scoredItems
        .filter(s => s.score > 0.3)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      logger.info("Semantic match results retrieved:", {
        matches: sorted.map(s => ({ q: s.item.question, score: s.score })),
      });

      return sorted.map(
        s => `[Pregunta]: ${s.item.question}\n[Respuesta]: ${s.item.answer}`
      );
    } catch (e) {
      logger.error("Semantic search failed. Invoking local fallback search:", {
        error: String(e),
      });
      const results = this.localSearch(query, limit);
      return results.map(
        r => `[Pregunta]: ${r.question}\n[Respuesta]: ${r.answer}`
      );
    }
  }
}

export const vectorDBService = new VectorDBService();
export default vectorDBService;
