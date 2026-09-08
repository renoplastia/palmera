# Arquitectura del Sistema — Palm ERP Core

> Este documento define el estándar arquitectónico y de calidad de Palm. Los revisores evalúan el código basándose en estas directrices.

## 1. Principios del Núcleo (Core)

1. **Agnóstico al Dominio**: El núcleo de Palm no conoce nada de restaurantes, reservas de Gastroshows ni entrenamientos de Sport2Live. Contiene únicamente las abstracciones horizontales de negocio:
   - Gestión de usuarios y credenciales (Auth).
   - Gestión de fichas de clientes/empresas (CRM central).
   - Ajustes del ERP y gestor de módulos.
   - Auditoría y logs de correo.

2. **Modularidad Estricta (Alternativa B)**:
   - Todo código específico de un vertical (ej. reservas, alérgenos, pasarelas de pago) reside dentro de la carpeta `src/modules/<modulo>/`.
   - El Core no importa código de los módulos. Son los módulos los que se registran a sí mismos en el Core mediante archivos de configuración estándar (`module.ts`).
   - El menú lateral (Sidebar) carga dinámicamente sus items consultando qué módulos están activos en la tabla de configuración.

3. **Base de Datos Desacoplada (Prisma) — SINGLE-DB (Vercel + Supabase):**
    - **Un único proyecto Vercel (`*.tudominio.com` wildcard) + una única DB Supabase compartida.** No hay DB por tenant.
    - Aislamiento por `tenantId` (FK `Tenant.id`) en TODAS las tablas de negocio + **Row Level Security (RLS)** en Postgres (`tenant_id = current_setting('app.tenant_id', true)::uuid`). Ver `prisma/migrations/20260603_rls_tenant_isolation/migration.sql` y `migracion-multitenant-erp.md`.
    - Un único `PrismaClient` singleton (`src/lib/db.ts`). Nunca crear `Map<tenantId, PrismaClient>` ni `DATABASE_URL_<tenant>`.
    - Defensa en profundidad: toda query filtra `where: { tenantId }` ADEMÁS de RLS. Para aislamiento transaccional usar `withTenantContext(tenantId, tx => ...)` con `set_config('app.tenant_id', $1, true)` local a la transacción (evita leak por pooling PgBouncer transaction mode).
    - Los modelos del Core en `prisma/schema.prisma` son:
      - `Tenant`: registro de instancias (slug, domain, isActive) — tabla de control, NO RLS estricta (lista superadmin).
      - `User`: Administradores y staff (tenantId obligatorio).
      - `Contact`: Personas o empresas (tenantId obligatorio).
      - `Setting`: Parámetros clave-valor por tenant (tenantId obligatorio).
      - `AuditLog`: Registro de operaciones (tenantId obligatorio).

---

## 2. Flujo de Datos Modular

```text
                               ┌────────────────────────┐
                               │   Vistas del Core UI   │
                               │ (AdminLayout, Sidebar) │
                               └───────────┬────────────┘
                                           │
                        ¿Qué módulos están habilitados en Setting?
                                           │
                                           ▼
                       ┌────────────────────────────────────────┐
                       │  Cargador Dinámico de Módulos (Core)   │
                       │     (src/modules/registry.ts)          │
                       └───────────┬───────────────────┬────────┘
                                   │                   │
                                   ▼                   ▼
                           ┌──────────────┐     ┌──────────────┐
                           │   Módulo 1   │     │   Módulo 2   │
                           │ (Bookings)   │     │   (CMS UI)   │
                           └──────────────┘     └──────────────┘
```

---

## 3. Infraestructura Single-DB

```
Request → Vercel wildcard *.tudominio.com → middleware.ts (extrae subdominio)
        → x-tenant-slug header → resolve Tenant → tenantId
        → Prisma singleton (DATABASE_URL pooler txn) → Supabase (RLS filtra por app.tenant_id)
```

- Wildcard domain `*.tudominio.com` en Vercel (un deployment para todos los subdominios).
- `middleware.ts` NO hace fallback silencioso: subdominio inexistente → 404 (`/tenant-not-found`), `www` → plataforma.
- `PALMERA_PLATFORM_DATABASE_URL` y `CREATE DATABASE` por tenant están **desmontados** (legacy). Crear instancia = `INSERT INTO Tenant` + seed via `ProvisioningService` single-DB. Ver `src/lib/provisioning.ts`.

## 4. Qué NO hacer

- ❌ **No importes** tipos o componentes de `/src/modules/` en carpetas comunes de `/src/components/` o `/src/core/`. El Core debe compilar y ejecutarse al 100% incluso si vacías la carpeta `/src/modules/`.
- ❌ **No ensucies** el esquema de Prisma con tablas específicas de restaurante a nivel del Core. Si se requieren tablas específicas de un módulo en Prisma, se diseñarán dentro del esquema pero agrupadas y comentadas, o se inyectarán de manera aislada.
- ❌ **No utilices** blanco puro (`#FFFFFF`) ni negro puro (`#000000`) en la interfaz. Aunque usemos Tailwind CSS v4 con una paleta neutra premium corporativa, respetaremos las escalas cromáticas suaves en modo oscuro y claro para que la aplicación se sienta premium.
- ❌ **No crees DB por tenant** ni `DATABASE_URL_<slug>`, ni `Map<tenantId, PrismaClient>`. Single-DB: todo va por `tenant_id` + RLS.
- ❌ **No uses `set_config(..., false)`** (global) ni reutilices conexión pooled sin resetear `app.tenant_id` — fuga cross-tenant.
