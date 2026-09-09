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

function getConfig(overrideConfig?: Partial<AIConfig>): AIConfig {
  const provider = (overrideConfig?.provider || process.env.AI_PROVIDER as any) || "openrouter";
  const model = overrideConfig?.model || process.env.AI_MODEL || "google/gemma-3-4b-it:free";
  const apiKey = overrideConfig?.apiKey || process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.NVIDIA_API_KEY;
  const baseUrl = overrideConfig?.baseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434";

  return { provider, model, apiKey, baseUrl };
}

export async function callAI(messages: ChatMessage[], overrideConfig?: Partial<AIConfig>): Promise<AIResponse> {
  const config = getConfig(overrideConfig);

  if (config.provider === "openrouter") {
    return callOpenRouter(messages, config);
  }

  if (config.provider === "ollama") {
    return callOllama(messages, config);
  }

  if (config.provider === "anthropic") {
    return callAnthropic(messages, config);
  }

  if (config.provider === "openai") {
    return callOpenAI(messages, config);
  }

  if (config.provider === "nvidia") {
    return callNvidia(messages, config);
  }

  throw new Error("AI provider not configured properly.");
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
      "HTTP-Referer": process.env.NEXTAUTH_URL || "https://palmerp.es",
      "X-Title": "Palmera ERP",
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

async function callAnthropic(messages: ChatMessage[], config: AIConfig): Promise<AIResponse> {
  if (!config.apiKey) {
    throw new Error("API key de Anthropic no configurada");
  }

  const systemMsg = messages.find((m) => m.role === "system")?.content || DAILY_SCRUM_SYSTEM_PROMPT;
  const userAssistantMsgs = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model || "claude-3-5-sonnet-20241022",
      system: systemMsg,
      messages: userAssistantMsgs.length > 0 ? userAssistantMsgs : [{ role: "user", content: "Hola" }],
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.content?.[0]?.text || "",
  };
}

async function callOpenAI(messages: ChatMessage[], config: AIConfig): Promise<AIResponse> {
  if (!config.apiKey) {
    throw new Error("API key de OpenAI no configurada");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || "gpt-4o",
      messages: [{ role: "system", content: DAILY_SCRUM_SYSTEM_PROMPT }, ...messages],
      max_tokens: 3000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || "",
    usage: data.usage,
  };
}

async function callNvidia(messages: ChatMessage[], config: AIConfig): Promise<AIResponse> {
  if (!config.apiKey) {
    throw new Error("API key de NVIDIA NIM no configurada");
  }

  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || "meta/llama-3.1-70b-instruct",
      messages: [{ role: "system", content: DAILY_SCRUM_SYSTEM_PROMPT }, ...messages],
      max_tokens: 3000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`NVIDIA API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || "",
    usage: data.usage,
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

export async function callGeneralAI(messages: ChatMessage[], systemPrompt?: string, overrideConfig?: Partial<AIConfig>): Promise<AIResponse> {
  const config = getConfig(overrideConfig);
  const sysPrompt = systemPrompt || "Eres un asistente de inteligencia de negocios experto.";
  const allMessages = [{ role: "system" as const, content: sysPrompt }, ...messages];

  if (config.provider === "openrouter") {
    return callOpenRouter(allMessages, config);
  }

  if (config.provider === "ollama") {
    return callOllama(allMessages, config);
  }

  if (config.provider === "anthropic") {
    return callAnthropic(allMessages, config);
  }

  if (config.provider === "openai") {
    return callOpenAI(allMessages, config);
  }

  if (config.provider === "nvidia") {
    return callNvidia(allMessages, config);
  }

  throw new Error("No hay un proveedor de IA activo configurado.");
}

export async function callShopBuilderAI(
  userMessages: ChatMessage[],
  businessContext: string,
  overrideConfig?: Partial<AIConfig>
): Promise<{ message: string; customHtml?: string; customCss?: string }> {
  const systemPrompt = `Eres un diseñador web experto e IA especializada en construir e-commerce conversacionales para comercios locales.
Tu objetivo es ayudar al comerciante a diseñar y adaptar su página web pública de ventas.

DATOS DEL NEGOCIO:
${businessContext}

REGLAS DE GENERACIÓN DE CÓDIGO HTML/CSS:
1. Genera HTML semántico, moderno, elegante y responsive (mobile-first).
2. Debes dejar un contenedor <div id="palmera-order-section"></div> en el lugar adecuado donde se incrustará automáticamente el widget interactivo de productos y selección de punto de recogida.
3. Responde SIEMPRE en formato JSON estructurado EXACTAMENTE así:
{
  "message": "Respuesta cercana explicándole los cambios al usuario en español",
  "customHtml": "<header><h1>...</h1></header>...",
  "customCss": "body { font-family: sans-serif; }..."
}`;

  const res = await callGeneralAI(userMessages, systemPrompt, overrideConfig);
  const parsed = parseTasksFromResponse(res.content);
  if (parsed && (parsed.message || parsed.customHtml)) {
    return {
      message: parsed.message || "Aquí tienes el diseño propuesto para tu web.",
      customHtml: parsed.customHtml,
      customCss: parsed.customCss,
    };
  }

  return {
    message: res.content,
  };
}

