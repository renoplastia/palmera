"use client";

import React from "react";
import * as Icons from "lucide-react";

interface Props {
  children: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  info: React.ErrorInfo | null;
}

export class GlobalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ info });
    this.props.onError?.(error, info);
    console.error("[GlobalErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const err = this.state.error;
      const shareText = [
        `# Error React Palmera — para compartir con IA`,
        ``,
        `**Mensaje:** ${err.message}`,
        `**Stack:**`,
        "```",
        err.stack || "(sin stack)",
        "```",
        ``,
        `**ComponentStack:**`,
        "```",
        this.state.info?.componentStack || "(n/a)",
        "```",
        ``,
        `**URL:** ${typeof window !== "undefined" ? window.location.href : "n/a"}`,
        `**Timestamp:** ${new Date().toISOString()}`,
      ].join("\n");

      const copy = async () => {
        try {
          await navigator.clipboard.writeText(shareText);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = shareText;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
      };

      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-red-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-red-500/20 bg-red-500/10 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-500 text-white flex items-center justify-center">
                  <Icons.Bug className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-red-600 dark:text-red-400">Error de renderizado</h2>
                  <p className="text-xs text-muted-foreground mt-1">La UI se rompió. Copia y pásale esto a la IA.</p>
                </div>
              </div>
              <button
                onClick={() => this.setState({ hasError: false, error: null, info: null })}
                className="h-8 w-8 rounded-xl bg-card border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
                <div className="text-sm font-bold text-foreground break-words">{err.message}</div>
                <div className="text-[11px] font-mono text-muted-foreground mt-2 break-all">{typeof window !== "undefined" ? window.location.href : ""}</div>
              </div>
              <pre className="max-h-[260px] overflow-auto text-[11px] font-mono bg-muted/40 border border-border/30 rounded-xl p-3 whitespace-pre-wrap break-words">
                {err.stack}
                {this.state.info?.componentStack ? `\n\n--- componentStack ---\n${this.state.info.componentStack}` : ""}
              </pre>
            </div>
            <div className="p-4 border-t border-border/30 bg-muted/20 flex items-center justify-end gap-2">
              <button onClick={() => this.setState({ hasError: false, error: null, info: null })} className="h-9 px-4 rounded-xl border border-border/40 bg-card text-xs font-bold">
                Reintentar
              </button>
              <button onClick={copy} className="h-9 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold flex items-center gap-2">
                <Icons.Copy className="h-4 w-4" /> Copiar para IA
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
