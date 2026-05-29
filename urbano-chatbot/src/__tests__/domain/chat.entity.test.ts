import {
  ChatMessage,
  ChatSession,
  ToolCallInfo,
  MessageRole,
} from "../../domain/entities/chat.entity";

describe("ChatMessage entity", () => {
  it("should have the correct shape for a user message", () => {
    const msg: ChatMessage = {
      id: "msg-1",
      role: "user",
      content: "Hola, ¿qué productos tienen?",
      createdAt: new Date("2026-01-01T10:00:00Z"),
    };

    expect(msg.id).toBe("msg-1");
    expect(msg.role).toBe("user");
    expect(msg.content).toBe("Hola, ¿qué productos tienen?");
    expect(msg.createdAt).toBeInstanceOf(Date);
    expect(msg.toolCalls).toBeUndefined();
    expect(msg.isHumanHandover).toBeUndefined();
  });

  it("should accept assistant role with toolCalls", () => {
    const toolCall: ToolCallInfo = {
      id: "call-1",
      name: "getProducts",
      args: { limit: 5 },
      result: { products: [] },
      status: "success",
    };

    const msg: ChatMessage = {
      id: "msg-2",
      role: "assistant",
      content: "Aquí tienes el catálogo:",
      createdAt: new Date(),
      toolCalls: [toolCall],
    };

    expect(msg.role).toBe("assistant");
    expect(msg.toolCalls).toHaveLength(1);
    expect(msg.toolCalls![0].name).toBe("getProducts");
    expect(msg.toolCalls![0].status).toBe("success");
  });

  it("should accept isHumanHandover and humanAgentName flags", () => {
    const msg: ChatMessage = {
      id: "msg-3",
      role: "assistant",
      content: "Hola, soy Mateo del soporte.",
      createdAt: new Date(),
      isHumanHandover: true,
      humanAgentName: "Mateo (Soporte)",
    };

    expect(msg.isHumanHandover).toBe(true);
    expect(msg.humanAgentName).toBe("Mateo (Soporte)");
  });

  it("should accept all valid MessageRole values", () => {
    const roles: MessageRole[] = ["user", "assistant", "system"];
    roles.forEach((role) => {
      const msg: ChatMessage = { id: "x", role, content: "", createdAt: new Date() };
      expect(msg.role).toBe(role);
    });
  });

  it("should accept ToolCallInfo with executing or failed status", () => {
    const executing: ToolCallInfo = { id: "t1", name: "checkInventory", args: {}, status: "executing" };
    const failed: ToolCallInfo = { id: "t2", name: "trackOrder", args: {}, status: "failed" };

    expect(executing.status).toBe("executing");
    expect(failed.status).toBe("failed");
    expect(failed.result).toBeUndefined();
  });
});

describe("ChatSession entity", () => {
  it("should have the correct shape", () => {
    const session: ChatSession = {
      id: "session-001",
      title: "Consulta de zapatillas",
      messages: [],
      createdAt: new Date("2026-01-01T09:00:00Z"),
      updatedAt: new Date("2026-01-01T09:05:00Z"),
    };

    expect(session.id).toBe("session-001");
    expect(session.title).toBe("Consulta de zapatillas");
    expect(session.messages).toHaveLength(0);
    expect(session.createdAt).toBeInstanceOf(Date);
    expect(session.updatedAt).toBeInstanceOf(Date);
  });

  it("should hold multiple messages", () => {
    const session: ChatSession = {
      id: "session-002",
      title: "Rastreo de pedido",
      messages: [
        { id: "m1", role: "user", content: "¿Dónde está mi pedido?", createdAt: new Date() },
        { id: "m2", role: "assistant", content: "Tu pedido está en camino.", createdAt: new Date() },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(session.messages).toHaveLength(2);
    expect(session.messages[0].role).toBe("user");
    expect(session.messages[1].role).toBe("assistant");
  });
});
