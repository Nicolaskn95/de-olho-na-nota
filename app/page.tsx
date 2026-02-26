import { EscanearCupom } from "@/components/escanear-cupom";

export default function Home() {
  return (
    <main className="flex min-h-screen items-start justify-center bg-[var(--background)] pt-8">
      <EscanearCupom />
    </main>
  );
}
