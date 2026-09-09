import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider");
  const apiKey = searchParams.get("apiKey");
  const baseUrl = searchParams.get("baseUrl") || "http://localhost:11434";

  try {
    if (provider === "openrouter") {
      if (!apiKey) {
        return NextResponse.json({ error: "API key required for OpenRouter" }, { status: 400 });
      }

      const response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        next: { revalidate: 3600 },
      });

      if (!response.ok) {
        return NextResponse.json({ error: "Failed to fetch OpenRouter models" }, { status: response.status });
      }

      const data = await response.json();
      const models = data.data
        .filter((m: any) => m.id.includes(":free") || parseFloat(m.pricing?.prompt || "1") === 0)
        .map((m: any) => ({
          id: m.id,
          name: m.name,
          description: m.description || "",
          contextLength: m.context_length,
          isFree: true,
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      return NextResponse.json({ success: true, models });
    }

    if (provider === "ollama") {
      const response = await fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return NextResponse.json({ error: "Failed to connect to Ollama" }, { status: 503 });
      }

      const data = await response.json();
      const models = (data.models || []).map((m: any) => ({
        id: m.name,
        name: m.name,
        description: "",
        contextLength: null,
        isFree: true,
      }));

      return NextResponse.json({ success: true, models });
    }

    if (provider === "anthropic") {
      const models = [
        { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", description: "El modelo más inteligente y rápido de Anthropic", contextLength: 200000, isFree: false },
        { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", description: "Ultra rápido para respuestas concisas", contextLength: 200000, isFree: false },
        { id: "claude-3-opus-20240229", name: "Claude 3 Opus", description: "Razonamiento profundo e instrucciones complejas", contextLength: 200000, isFree: false },
      ];
      return NextResponse.json({ success: true, models });
    }

    if (provider === "openai") {
      const models = [
        { id: "gpt-4o", name: "GPT-4o", description: "Flagship omni model de OpenAI", contextLength: 128000, isFree: false },
        { id: "gpt-4o-mini", name: "GPT-4o mini", description: "Rápido y económico para tareas frecuentes", contextLength: 128000, isFree: false },
        { id: "o3-mini", name: "o3-mini", description: "Razonamiento científico y técnico rápido", contextLength: 200000, isFree: false },
      ];
      return NextResponse.json({ success: true, models });
    }

    if (provider === "nvidia") {
      const models = [
        { id: "meta/llama-3.1-70b-instruct", name: "Llama 3.1 70B Instruct (Nvidia NIM)", description: "Procesamiento de lenguaje acelerado", contextLength: 128000, isFree: false },
        { id: "meta/llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct (Nvidia NIM)", description: "Modelo insignia Llama 3.3", contextLength: 128000, isFree: false },
        { id: "nvidia/llama-3.1-nemotron-70b-instruct", name: "Nemotron 70B Instruct", description: "Optimizado por Nvidia", contextLength: 128000, isFree: false },
      ];
      return NextResponse.json({ success: true, models });
    }

    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch models" },
      { status: 500 }
    );
  }
}