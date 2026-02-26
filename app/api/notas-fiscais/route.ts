import { NextResponse } from "next/server";
import { listarNotas } from "@/lib/nota-fiscal-service";

export async function GET() {
  try {
    const notas = await listarNotas();
    return NextResponse.json(notas);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao listar notas fiscais";
    return NextResponse.json({ message }, { status: 500 });
  }
}
