"use client";

import React from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { coreModules } from "@/modules/registry";

// Helper to resolve Icons dynamically inside the page
const PageIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = (Icons as any)[name];
  if (!IconComponent) return <Icons.HelpCircle className={className} />;
  return <IconComponent className={className} />;
};

export default function AdminDashboard() {
  // Hardcoded stats representing our basic core
  const stats = [
    {
      label: "Contactos",
      value: "148",
      change: "+12% esta semana",
      icon: "Users",
      color: "from-blue-500/10 to-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    {
      label: "Mensajes Recibidos",
      value: "42",
      change: "5 pendientes",
      icon: "MessageSquare",
      color: "from-green-500/10 to-green-600/10 text-green-600 dark:text-green-400 border-green-500/20",
    },
    {
      label: "Módulos Habilitados",
      value: "3 / 3",
      change: "Núcleo estable",
      icon: "Settings",
      color: "from-amber-500/10 to-amber-600/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
  ];

  const recentLogs = [
    {
      id: "1",
      action: "Inicialización de base de datos",
      details: "Esquema relacional de Prisma verificado y compilado.",
      time: "Hace 10 min",
      type: "success",
    },
    {
      id: "2",
      action: "Render de UI Shell",
      details: "Sidebar dinámico cargado exitosamente.",
      time: "Hace 2 min",
      type: "info",
    },
    {
      id: "3",
      action: "Cambio de tema",
      details: "Dark mode preferido cargado por defecto en local storage.",
      time: "Ahora mismo",
      type: "warning",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/15 bg-linear-to-tr from-amber-500/15 via-amber-500/5 to-transparent p-6 md:p-8 shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-500">
              <Icons.Sparkles className="h-3 w-3" />
              Núcleo Listo
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              ¡Bienvenido a <span className="text-amber-500 font-bold">Palmera</span>!
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Has iniciado el arnés de desarrollo del Core funcional. Desde aquí gestionas el directorio de contactos, las conversaciones y alertas en tiempo real, y los ajustes de configuración de tu SaaS empresarial.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/superadmin"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-stone-800 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-150 hover:bg-stone-700 hover:shadow-lg"
            >
              <Icons.Layers className="h-4 w-4" />
              <span>Consola</span>
            </Link>
            <Link
              href="/admin/settings/modules"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-amber-500/20 transition-all duration-150 hover:bg-amber-600 hover:shadow-lg hover:shadow-amber-500/30"
            >
              <Icons.LayoutGrid className="h-4 w-4" />
              <span>Ver Módulos</span>
            </Link>
            <a
              href="file:///c:/Users/renat/Documents/Github/palm/AGENTS.md"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <Icons.BookOpen className="h-4 w-4 text-muted-foreground" />
              <span>Documentación</span>
            </a>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between rounded-2xl border border-border/40 bg-card p-6 shadow-xs hover:border-amber-500/30 hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
              <h3 className="text-3xl font-extrabold text-foreground tracking-tight">
                {stat.value}
              </h3>
              <p className="text-xs font-medium text-amber-500">
                {stat.change}
              </p>
            </div>
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-tr border shadow-xs group-hover:scale-110 transition-transform duration-300 ${stat.color}`}>
              <PageIcon name={stat.icon} className="h-6 w-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Core Modules Quick Launch */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold tracking-tight text-foreground">
          Módulos del Núcleo Activos
        </h3>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {coreModules.map((mod) => (
            <div
              key={mod.id}
              className="flex flex-col justify-between rounded-2xl border border-border/50 bg-card p-6 shadow-xs hover:border-amber-500/40 hover:shadow-md hover:shadow-amber-500/5 transition-all duration-300"
            >
              <div className="space-y-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-500">
                  <PageIcon name={mod.icon} className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">{mod.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Gestiona y administra todas las opciones del canal {mod.name.toLowerCase()} del sistema.
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t border-border/40 pt-4 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Cat: {mod.category}
                </span>
                <Link
                  href={mod.menuItems[0].path}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-muted px-3 text-xs font-semibold text-foreground hover:bg-amber-500 hover:text-white transition-colors duration-200"
                >
                  <span>Abrir</span>
                  <Icons.ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Logs & System Stats */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Activity Logs */}
        <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground">Registro de Auditoría de Hoy</h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md border border-border/50">
              Live Feed
            </span>
          </div>

          <div className="divide-y divide-border/40">
            {recentLogs.map((log) => (
              <div key={log.id} className="py-3.5 flex items-start gap-4 first:pt-0 last:pb-0">
                <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-500">
                  <Icons.Activity className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-foreground">{log.action}</h5>
                    <span className="text-[10px] text-muted-foreground">{log.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{log.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Diagnostics */}
        <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-foreground">Diagnóstico del Core</h3>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-muted-foreground">Uso de Memoria (Heap)</span>
                  <span className="text-foreground font-bold">142 MB / 512 MB</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: "27%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-muted-foreground">Latencia de Base de Datos</span>
                  <span className="text-foreground font-bold">12ms (Prisma 7 Pool)</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: "8%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-muted-foreground">Compilación TypeScript</span>
                  <span className="text-foreground font-bold">Exitoso (tsc check)</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: "100%" }} />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border/40 pt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>Next.js App Router (v16.2.6)</span>
            <span>React Server Components (v19)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
