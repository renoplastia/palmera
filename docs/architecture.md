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

3. **Base de Datos Desacoplada (Prisma)**:
   - Los modelos del Core en `prisma/schema.prisma` son:
     - `User`: Administradores y staff general de la empresa.
     - `Contact`: Personas o empresas asociadas. Reemplaza al modelo `Customer` de Gastroshows pero sin campos específicos de restaurante.
     - `Setting`: Parámetros globales clave-valor. Aquí se registra el estado activo/inactivo de los módulos.
     - `AuditLog`: Registro de operaciones críticas del sistema.

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

## 3. Qué NO hacer

- ❌ **No importes** tipos o componentes de `/src/modules/` en carpetas comunes de `/src/components/` o `/src/core/`. El Core debe compilar y ejecutarse al 100% incluso si vacías la carpeta `/src/modules/`.
- ❌ **No ensucies** el esquema de Prisma con tablas específicas de restaurante a nivel del Core. Si se requieren tablas específicas de un módulo en Prisma, se diseñarán dentro del esquema pero agrupadas y comentadas, o se inyectarán de manera aislada.
- ❌ **No utilices** blanco puro (`#FFFFFF`) ni negro puro (`#000000`) en la interfaz. Aunque usemos Tailwind CSS v4 con una paleta neutra premium corporativa, respetaremos las escalas cromáticas suaves en modo oscuro y claro para que la aplicación se sienta premium.
