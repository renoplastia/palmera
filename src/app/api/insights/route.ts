import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { profile, psychProfile, reflections, validationHistory, tasks } = await request.json();

    const prompt = `Eres un asistente de desarrollo personal y productividad. Analiza los siguientes datos del usuario y genera insights accionables.

## Perfil del Usuario
- Nombre: ${profile?.name || "Usuario"}
- Rol: ${profile?.role || "N/A"}
- Dailies completadas: ${profile?.dailyScrumCount || 0}

## Perfil Psicológico
- Estilo de trabajo: ${(psychProfile?.workStyle || []).join(", ")}
- Patrón de energía: ${psychProfile?.energyPattern || "N/A"}
- Motivadores: ${(psychProfile?.motivationDrivers || []).join(", ")}
- Estilo de aprendizaje: ${psychProfile?.learningStyle || "N/A"}
- Fortalezas: ${(psychProfile?.strengths || []).join(", ")}
- Áreas de crecimiento: ${(psychProfile?.growthAreas || []).join(", ")}

## Datos de Bienestar (últimos registros)
${(reflections || []).slice(-7).map((r: any) => `
- Fecha: ${r.date}
- Ánimo: ${r.mood || 5}/10
- Energía: ${r.energy || 5}/10
- Nota: ${r.note || "Sin nota"}
`).join("\n")}

## Historial de Validación de Tareas
- Total validaciones: ${(validationHistory || []).length}
- Aprobadas: ${(validationHistory || []).filter((h: any) => h.action === "approved").length}
- Ajustadas: ${(validationHistory || []).filter((h: any) => h.action === "adjusted").length}
- Rechazadas: ${(validationHistory || []).filter((h: any) => h.action === "rejected").length}

## Tareas Actuales
${(tasks || []).map((t: any) => `- [${t.priority}] ${t.title}${t.description ? ": " + t.description : ""}`).join("\n") || "Sin tareas"}

Genera un JSON con la siguiente estructura (SOLO JSON, sin markdown ni texto adicional):
{
  "summary": "Resumen ejecutivo en 2-3 frases del estado actual del usuario",
  "strengths": ["3 fortalezas observadas en los datos"],
  "opportunities": ["2-3 oportunidades de mejora específicas"],
  "wellbeingInsight": "Insight sobre el bienestar basado en ánimo y energía",
  "productivityInsight": "Insight sobre productividad basado en validaciones y tareas",
  "growthRecommendation": "Recomendación de crecimiento personalizada basada en el perfil psicológico",
  "actionableTip": "Un consejo accionable para hoy basado en todo el análisis",
  "moodTrend": "up|stable|down",
  "energyTrend": "up|stable|down"
}`;

    const aiProvider = process.env.AI_PROVIDER || "openrouter";
    const aiModel = process.env.AI_MODEL || "minimax/minimax-m2:free";

    let apiUrl: string;
    let headers: Record<string, string>;

    if (aiProvider === "ollama") {
      apiUrl = `${process.env.OLLAMA_BASE_URL || "http://localhost:11434"}/api/generate`;
      headers = { "Content-Type": "application/json" };
    } else {
      apiUrl = "https://openrouter.ai/api/v1/chat/completions";
      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Palmera",
      };
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(
        aiProvider === "ollama"
          ? {
              model: aiModel,
              prompt,
              stream: false,
              options: { temperature: 0.7 },
            }
          : {
              model: aiModel,
              messages: [{ role: "user", content: prompt }],
              temperature: 0.7,
            }
      ),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    let content: string;

    if (aiProvider === "ollama") {
      content = data.response;
    } else {
      content = data.choices?.[0]?.message?.content;
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in AI response");
    }

    const insights = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ insights });
  } catch (error) {
    console.error("Insights API error:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}