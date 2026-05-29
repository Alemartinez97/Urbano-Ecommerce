import { OrchestrateChatUseCase } from "../../application/use-cases/orchestrate-chat.use-case";

// Mock the AI SDK and OpenAI provider
jest.mock("ai", () => ({
  streamText: jest.fn().mockReturnValue({ toUIMessageStreamResponse: jest.fn() }),
  tool: jest.fn((def: any) => def),
  jsonSchema: jest.fn((schema: any) => schema),
}));

jest.mock("@ai-sdk/openai", () => ({
  openai: jest.fn(() => "mocked-model"),
}));

jest.mock("../../infrastructure/adapters/vector-db", () => ({
  vectorDBService: {
    search: jest.fn().mockResolvedValue(["[Pregunta]: Test\n[Respuesta]: Test Answer"]),
  },
}));

describe("OrchestrateChatUseCase Standalone", () => {
  let useCase: OrchestrateChatUseCase;
  const { streamText } = require("ai");

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new OrchestrateChatUseCase();
  });

  describe("execute()", () => {
    it("calls streamText with the correct model and system prompt", async () => {
      await useCase.execute([]);

      expect(streamText).toHaveBeenCalledTimes(1);
      const callArgs = streamText.mock.calls[0][0];
      expect(callArgs.model).toBe("mocked-model");
      expect(callArgs.system).toContain("Eres un asistente virtual inteligente");
    });

    it("passes mapped messages to streamText", async () => {
      const messages = [{ role: "user", content: "Hola bot" }];
      await useCase.execute(messages);

      const callArgs = streamText.mock.calls[0][0];
      expect(callArgs.messages).toEqual(messages);
    });

    it("registers the searchKnowledgeBase RAG tool", async () => {
      await useCase.execute([]);
      const tools = streamText.mock.calls[0][0].tools;
      expect(tools).toHaveProperty("searchKnowledgeBase");
    });
  });
});
