import { NextResponse } from "next/server";
import { OrchestrateChatUseCase } from "@/application/use-cases/orchestrate-chat.use-case";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Faltan los mensajes o el formato no es válido." },
        { status: 400 }
      );
    }

    const orchestrateChatUseCase = new OrchestrateChatUseCase();
    const streamResult = await orchestrateChatUseCase.execute(messages);

    return streamResult.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error("[Chat API Error]:", error);
    return NextResponse.json(
      {
        error: "Ocurrió un error al procesar el mensaje en el agente.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
