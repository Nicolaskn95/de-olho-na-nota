import { NextResponse } from "next/server";
import { processarUrl } from "@/lib/nota-fiscal-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { message: "A URL da nota fiscal e obrigatoria" },
        { status: 400 }
      );
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ message: "URL invalida" }, { status: 400 });
    }

    const nota = await processarUrl(url);
    return NextResponse.json(nota);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao processar nota fiscal";
    return NextResponse.json({ message }, { status: 400 });
  }
}
