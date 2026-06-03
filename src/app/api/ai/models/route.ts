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

    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch models" },
      { status: 500 }
    );
  }
}