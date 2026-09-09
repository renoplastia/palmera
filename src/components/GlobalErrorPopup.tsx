"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as Icons from "lucide-react";

export interface AppError {
  id: string;
  message: string;
  stack?: string;
  source?: string;
  category: "js" | "promise" | "fetch" | "react" | "manual";
  statusCode?: number;
  url?: string;
  timestamp: string;
  extra?: string;
}

interface ErrorContextValue {
  showError: (error: unknown, extra?: string) => void;
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextValue | null>(null);

export function useErrorPopup() {
  const ctx = useContext(ErrorContext);
  if (!ctx) throw new Error("useErrorPopup must be used within GlobalErrorProvider");
  return ctx;
}

function normalizeError(error: unknown, category: AppError["category"], extra?: string): AppError {
  let message = "Error desconocido";
  let stack: string | undefined;
  let source: string | undefined;
  let statusCode: number | undefined;
  let url: string | undefined;

  if (error instanceof Error) {
    message = error.message || error.name || "Error";
    stack = error.stack;
    // @ts-ignore optional fields
    source = (error as any).source || (error as any).filename;
    statusCode = (error as any).status || (error as any).statusCode;
    url = (error as any).url;
  } else if (typeof error === "string") {
    message = error;
  } else if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    if (typeof e.message === "string") message = e.message;
    else if (typeof e.error === "string") message = e.error as string;
    else message = JSON.stringify(e).slice(0, 2000);
    if (typeof e.stack === "string") stack = e.stack as string;
    if (typeof e.source === "string") source = e.source as string;
    if (typeof e.status === "number") statusCode = e.status as number;
    if (typeof e.url === "string") url = e.url as string;
  }

  return {
    id: Math.random().toString(36).slice(2, 9),
    message,
    stack,
    source,
    category,
    statusCode,
    url: url || (typeof window !== "undefined" ? window.location.href : undefined),
    timestamp: new Date().toISOString(),
    extra,
  };
}

export function GlobalErrorProvider({ children }: { children: React.ReactNode }) {
  const [currentError, setCurrentError] = useState<AppError | null>(null);
  const [copied, setCopied] = useState(false);

  const showError = useCallback((error: unknown, extra?: string) => {
    const normalized = normalizeError(error, "manual", extra);
    setCurrentError(normalized);
    console.error("[GlobalErrorPopup]", normalized, error);
  }, []);

  const clearError = useCallback(() => setCurrentError(null), []);

  // Global listeners: js errors + unhandled rejections
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const normalized = normalizeError(event.error || event.message, "js");
      normalized.source = event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : normalized.source;
      normalized.extra = event.message;
      setCurrentError(normalized);
      console.error("[GlobalErrorPopup][js]", event);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const normalized = normalizeError(event.reason, "promise");
      setCurrentError(normalized);
      console.error("[GlobalErrorPopup][promise]", event.reason);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  // Intercept fetch to surface server errors automatically (non-2xx with json error)
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        // Only auto-popup for API routes that return json error with non-ok
        if (!response.ok) {
          const clone = response.clone();
          // don't block response consumption — clone for inspection
          let bodyText = "";
          try {
            bodyText = await clone.text();
            // try to parse json
            const json = JSON.parse(bodyText);
            if (json?.error) {
              const stackParts = [json.stack, json.code ? `code: ${json.code}` : null, json.hint ? `hint: ${json.hint}` : null].filter(Boolean).join("\n\n");
              const normalized: AppError = {
                id: Math.random().toString(36).slice(2, 9),
                message: json.error,
                stack: stackParts || bodyText.slice(0, 4000),
                category: "fetch",
                statusCode: response.status,
                url: typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url,
                timestamp: new Date().toISOString(),
                extra: `${response.status} ${response.statusText} — ${typeof args[0] === "string" ? args[0] : ""}${json.code ? ` — ${json.code}` : ""}${json.hint ? ` — ${json.hint}` : ""}`,
              };
              setCurrentError(normalized);
            }
          } catch {
            // if not json, still surface if it's an API route
            const reqUrl = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url || "";
            if (reqUrl.includes("/api/")) {
              const normalized: AppError = {
                id: Math.random().toString(36).slice(2, 9),
                message: `Error ${response.status} en ${reqUrl}: ${bodyText.slice(0, 500) || response.statusText}`,
                category: "fetch",
                statusCode: response.status,
                url: reqUrl,
                timestamp: new Date().toISOString(),
              };
              setCurrentError(normalized);
            }
          }
        }
        return response;
      } catch (fetchError) {
        const normalized = normalizeError(fetchError, "fetch", `fetch failed: ${String(args[0])}`);
        setCurrentError(normalized);
        throw fetchError;
      }
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const buildShareText = (err: AppError) => {
    return [
      `# Error Palmera — para compartir con IA`,
      ``,
      `**Mensaje:** ${err.message}`,
      `**Categoría:** ${err.category}`,
      `**URL:** ${err.url || "n/a"}`,
      `**Timestamp:** ${err.timestamp}`,
      err.statusCode ? `**Status:** ${err.statusCode}` : null,
      err.source ? `**Origen:** ${err.source}` : null,
      err.extra ? `**Extra:** ${err.extra}` : null,
      ``,
      `**Stack:**`,
      "```",
      err.stack || "(sin stack disponible — copia el mensaje y la URL)",
      "```",
      ``,
      `**Contexto navegador:**`,
      `- User-Agent: ${typeof navigator !== "undefined" ? navigator.userAgent : "n/a"}`,
      `- Plataforma: ${typeof navigator !== "undefined" ? navigator.platform : "n/a"}`,
      `- Idioma: ${typeof navigator !== "undefined" ? navigator.language : "n/a"}`,
      ``,
      `**Instrucciones para la IA:** Analiza el stack y el mensaje, identifica el archivo:línea, y propón un fix exacto (diff/patch) sin suposiciones.`,
    ]
      .filter(Boolean)
      .join("\n");
  };

  const handleCopy = async () => {
    if (!currentError) return;
    const text = buildShareText(currentError);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: select via textarea
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <ErrorContext.Provider value={{ showError, clearError }}>
      {children}
      {currentError && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-red-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-red-500/20 bg-red-500/10 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-500 text-white flex items-center justify-center shrink-0">
                  <Icons.TriangleAlert className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-red-600 dark:text-red-400 flex items-center gap-2">
                    ¡Ups! Algo falló
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white uppercase tracking-wider">
                      {currentError.category}
                    </span>
                    {currentError.statusCode && (
                      <span className="text-[10px] font-mono bg-card border border-red-500/20 px-1.5 py-0.5 rounded">
                        {currentError.statusCode}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">Copia este reporte y pégalo a tu IA para que lo solucione al instante.</p>
                </div>
              </div>
              <button
                onClick={clearError}
                className="h-8 w-8 rounded-xl bg-card border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 space-y-2">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mensaje</div>
                <div className="text-sm font-bold text-foreground break-words">{currentError.message}</div>
                {currentError.url && (
                  <div className="text-[11px] font-mono text-muted-foreground break-all bg-card border border-border/30 rounded-lg px-2 py-1.5">
                    {currentError.url}
                  </div>
                )}
                {currentError.extra && (
                  <div className="text-xs text-muted-foreground break-words">{currentError.extra}</div>
                )}
                <div className="text-[10px] text-muted-foreground">{currentError.timestamp}</div>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Icons.Code2 className="h-3.5 w-3.5" />
                  Stack / Detalles técnicos
                </div>
                <pre className="w-full max-h-[260px] overflow-auto text-[11px] font-mono bg-muted/40 border border-border/30 rounded-xl p-3 whitespace-pre-wrap break-words">
                  {currentError.stack || "(sin stack — el servidor devolvió solo el mensaje. Copia el mensaje + URL + timestamp)"}
                </pre>
              </div>

              {currentError.source && (
                <div className="text-[11px] text-muted-foreground">
                  <span className="font-bold">Origen:</span> <span className="font-mono break-all">{currentError.source}</span>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t border-border/30 bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <span className="text-[11px] text-muted-foreground hidden sm:block">Tip: pégalo tal cual a Muse/ChatGPT con el archivo:línea.</span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={clearError}
                  className="h-9 px-4 rounded-xl border border-border/40 bg-card text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  Cerrar
                </button>
                <button
                  onClick={handleCopy}
                  className="h-9 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-md"
                >
                  {copied ? <Icons.Check className="h-4 w-4" /> : <Icons.Copy className="h-4 w-4" />}
                  <span>{copied ? "¡Copiado!" : "Copiar para IA"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ErrorContext.Provider>
  );
}
