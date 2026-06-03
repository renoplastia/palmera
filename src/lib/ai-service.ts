import { AIConfig } from "@/types/core";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

const DAILY_SCRUM_SYSTEM_PROMPT = `Eres un asistente de Daily Scrum para un equipo de trabajo. Tu objetivo es:

1. Hacer 3 preguntas clave (una por turno):
   - ¿Qué hiciste ayer?
   - ¿Qué harás hoy?
   - ¿Tienes algún bloqueo?

2. Después de recibir las 3 respuestas, extrae tareas concretas con:
   - Título claro y conciso
   - Descripción detallada
   - Prioridad (critical, high, medium, low)
   - Módulo relacionado si aplica
   - Tiempo estimado

3. Responde SIEMPRE en español.

4. Mantén un tono profesional pero cercano.

5. Cuando tengas toda la información, responde en formato JSON EXACTO:
\`\`\`json
{
  "summary": "Resumen breve del daily scrum",
  "tasks": [
    {
      "title": "Título de la tarea",
      "description": "Descripción detallada",
      "priority": "high",
      "module": "Ventas",
      "estimatedTime": "2h"
    }
  ]
}
\`\`\``;

function getConfig(): AIConfig {
  const provider = (process.env.AI_PROVIDER as any) || "openrouter";
  const model = process.env.AI_MODEL || "google/gemma-3-4b-it:free";
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

  return { provider, model, apiKey, baseUrl };
}

export async function callAI(messages: ChatMessage[]): Promise<AIResponse> {
  const config = getConfig();

  if (config.provider === "openrouter") {
    return callOpenRouter(messages, config);
  }

  if (config.provider === "ollama") {
    return callOllama(messages, config);
  }

  throw new Error("AI provider not configured. Set AI_PROVIDER to 'openrouter' or 'ollama'");
}

async function callOpenRouter(messages: ChatMessage[], config: AIConfig): Promise<AIResponse> {
  if (!config.apiKey) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
      "X-Title": "Palmera",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "system", content: DAILY_SCRUM_SYSTEM_PROMPT }, ...messages],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || "",
    usage: data.usage,
  };
}

async function callOllama(messages: ChatMessage[], config: AIConfig): Promise<AIResponse> {
  const baseUrl = config.baseUrl || "http://localhost:11434";
  const model = config.model || "llama3";

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: DAILY_SCRUM_SYSTEM_PROMPT }, ...messages],
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 2000,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.message?.content || "",
  };
}

export function parseTasksFromResponse(content: string) {
  const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      // Try without code block
    }
  }

  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function callGeneralAI(messages: ChatMessage[], systemPrompt?: string): Promise<AIResponse> {
  const config = getConfig();
  const sysPrompt = systemPrompt || "Eres un asistente de inteligencia de negocios experto.";
  const allMessages = [{ role: "system" as const, content: sysPrompt }, ...messages];

  if (config.provider === "openrouter") {
    if (!config.apiKey) {
      throw new Error("OPENROUTER_API_KEY no configurado");
    }
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
        "X-Title": "Palmera",
      },
      body: JSON.stringify({
        model: config.model,
        messages: allMessages,
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || "",
      usage: data.usage,
    };
  }

  if (config.provider === "ollama") {
    const baseUrl = config.baseUrl || "http://localhost:11434";
    const model = config.model || "llama3";
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: allMessages,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 2000,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      content: data.message?.content || "",
    };
  }

  throw new Error("No hay un proveedor de IA activo configurado (configura AI_PROVIDER).");
}
