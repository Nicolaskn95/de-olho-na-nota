import { NextResponse } from "next/server";
import { buscarPorId } from "@/lib/nota-fiscal-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const nota = await buscarPorId(id);

    if (!nota) {
      return NextResponse.json(
        { message: "Nota fiscal nao encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(nota);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao buscar nota fiscal";
    return NextResponse.json({ message }, { status: 500 });
  }
}
