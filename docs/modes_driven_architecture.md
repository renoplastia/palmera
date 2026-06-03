# Arquitectura Basada en Modos (Sectores de Trabajo) — Palm ERP

Este documento define la nueva visión estratégica y técnica de **Palm ERP**, donde el núcleo del sistema se adapta dinámicamente mediante **"Modos" (Sectores o Perspectivas)** en lugar de instalaciones fragmentadas de aplicaciones individuales.

---

## 1. El Concepto de "Modos" (Sectores de Trabajo)

Un **Modo** en Palm ERP no es solo un interruptor de encendido/apagado para una sola pantalla; es una **perspectiva funcional completa** que adapta los campos de datos, la barra lateral, los cuadros de mando (dashboards) y las automatizaciones al sector del usuario.

```text
               ┌─────────────────────────────────────────────┐
               │              PALM ERP GENERAL               │
               │ (Core CRM, Auth, Auditoría, Configuración)  │
               └──────────────────────┬──────────────────────┘
                                      │
                 ¿Qué Modos están Activos en la Empresa?
                 [✔] Modo Hotel   [✔] Modo Restaurante
                                      │
                                      ▼
               ┌─────────────────────────────────────────────┐
               │          PERSPECTIVA UNIFICADA (UI)          │
               ├─────────────────────────────────────────────┤
               │ • Sidebar: Carga items de Hotel + Rest.     │
               │ • CRM: Campos de Huéspedes y Comensales.    │
               │ • Dashboard: Check-ins de hoy + Reservas.   │
               └─────────────────────────────────────────────┘
```

### Los 8 Modos Fundamentales y sus Atributos:

1. **Modo Restaurante**: Gestión de mesas, comandas, reservas de mesa, recetas/escandallos, proveedores de alimentación, y punto de venta (TPV/POS).
2. **Modo Hotel**: Recepción de huéspedes, asignación de habitaciones, tarifas por temporada, check-in/check-out, y limpieza/mantenimiento.
3. **Modo Logística**: Control de stock de almacenes, envíos, albaranes, control de trazabilidad, lotes de materiales y transportistas.
4. **Modo Finanzas**: Contabilidad general, tesorería, conciliación bancaria, presupuestos, flujo de caja (Cash Flow), y facturación reglamentaria.
5. **Modo Creativo**: Inventario estético (obras de arte, diseños, catálogo visual), salas de venta privadas VIP, control de depósitos/consignaciones y emisión de certificados de autenticidad.
6. **Modo Tecnológico**: Gestión de proyectos de desarrollo (Sprints, tickets, incidencias), API Keys para integraciones, webhooks, y control de despliegues.
7. **Modo Dirección**: Cuadros de mando analíticos (Business Intelligence), reporting cruzado de múltiples modos, control de objetivos (OKRs) e informes financieros ejecutivos.
8. **Modo Gestión equipo**: Registro de jornada laboral (fichajes), nóminas, organigrama, reclutamiento, evaluaciones de desempeño y turnos de personal.

---

## 2. Coexistencia y Solapamiento de Modos (Multi-Mode)

El gran valor de Palm ERP es que **un negocio puede activar múltiples modos simultáneamente**. Los modos no compiten entre sí; se **potencian** y **unifican**:

* **Ejemplo 1 (Hotel Boutique con Restaurante)**: Activa `Modo Hotel` + `Modo Restaurante`. El CRM del Core unifica al cliente. Un mismo contacto `Contact` puede tener historial de check-ins en el hotel y alergias alimentarias registradas para el restaurante. Además, las consumiciones del restaurante se pueden cargar directamente a la habitación del hotel.
* **Ejemplo 2 (Artista Digital con Tienda Física/Materiales)**: Activa `Modo Creativo` + `Modo Logística`. Le permite llevar el control visual de sus obras de arte y, a la vez, gestionar el stock de materiales de pintura, marcos y merchandising en diferentes almacenes.

---

## 3. Estructura de Datos en Prisma (`schema.prisma`)

Para soportar los modos sin crear tablas aisladas y repetitivas, el Core actúa como un **hub elástico**. 

### 3.1 Tabla de Modos Activos
Almacenamos los modos activos del inquilino en la tabla `Setting` o en un campo dedicado en la tabla de configuración global de la empresa:

```prisma
model CompanyProfile {
  id           String    @id @default(cuid())
  companyName  String
  activeModes  ModeType[] // Array de enums para los modos activos
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

enum ModeType {
  RESTAURANTE
  HOTEL
  LOGISTICA
  FINANZAS
  CREATIVO
  TECNOLOGICO
  DIRECCION
  GESTION_EQUIPO
}
```

### 3.2 Fichas Dinámicas (Polimorfismo por Modo)
Para que tablas como `Contact` o `Artwork`/`Product` sirvan para múltiples sectores, utilizamos columnas flexibles que se muestran u ocultan según los modos activos:

```prisma
model Contact {
  id             String      @id @default(cuid())
  name           String
  email          String?     @unique
  phone          String?
  
  // Atributos de Modo Creativo (Solo se muestran/usan si CREATIVO está activo)
  isCollector    Boolean     @default(false)
  collectorPrefs String?     // Preferencias estéticas
  
  // Atributos de Modo Restaurante (Solo si RESTAURANTE está activo)
  allergies      String[]    // Alergias del comensal
  favoriteTable  String?
  
  // Atributos de Modo Hotel (Solo si HOTEL está activo)
  passportNumber String?
  loyaltyPoints  Int         @default(0)
  
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
}
```

---

## 4. Arquitectura UI y Sidebar Dinámico en Next.js

La interfaz de usuario del panel de administración (`src/components/admin/AdminSidebar.tsx`) se adaptará en tiempo real consultando los modos activos en el perfil de la compañía.

### Estructura de Registro de Modos (`src/modes/registry.ts`)

Definimos los modos como conjuntos de características:

```typescript
// src/modes/registry.ts
import { LucideIcon } from "lucide-react";

export interface ModeMenuItem {
  label: string;
  path: string;
  requiredRole?: "ADMIN" | "STAFF";
}

export interface PalmModeConfig {
  id: string;
  name: string;
  description: string;
  icon: string; // Nombre del icono de Lucide
  category: "Operaciones" | "Soporte" | "Estrategia";
  menuItems: ModeMenuItem[];
}

export const PalmModesRegistry: Record<string, PalmModeConfig> = {
  CREATIVO: {
    id: "CREATIVO",
    name: "Modo Creativo",
    description: "Gestión de catálogo de obras artísticas, salas VIP y certificados",
    icon: "Palette",
    category: "Operaciones",
    menuItems: [
      { label: "Catálogo de Obras", path: "/admin/creative/artworks" },
      { label: "Consignaciones", path: "/admin/creative/consignments" },
      { label: "Salas Privadas VIP", path: "/admin/creative/private-rooms" },
      { label: "Certificados QR", path: "/admin/creative/certificates" },
    ]
  },
  RESTAURANTE: {
    id: "RESTAURANTE",
    name: "Modo Restaurante",
    description: "Gestión de mesas, comandas, reservas y escandallos",
    icon: "Utensils",
    category: "Operaciones",
    menuItems: [
      { label: "Mapa de Mesas", path: "/admin/restaurant/tables" },
      { label: "Reservas", path: "/admin/restaurant/bookings" },
      { label: "Escandallos / Menú", path: "/admin/restaurant/recipes" },
      { label: "Punto de Venta (POS)", path: "/admin/restaurant/pos" },
    ]
  },
  HOTEL: {
    id: "HOTEL",
    name: "Modo Hotel",
    description: "Huéspedes, check-in, asignación de habitaciones y limpieza",
    icon: "Bed",
    category: "Operaciones",
    menuItems: [
      { label: "Planning de Habitaciones", path: "/admin/hotel/rooms" },
      { label: "Check-in / Check-out", path: "/admin/hotel/front-desk" },
      { label: "Servicio de Limpieza", path: "/admin/hotel/housekeeping" },
    ]
  },
  // ... Resto de modos
};
```

### Lógica de Renderizado del Sidebar

Cuando el componente `AdminSidebar` se monta, realiza los siguientes pasos:
1. Consulta los modos activos de la sesión del usuario (ej: `["CREATIVO", "LOGISTICA"]`).
2. Mapea y unifica los `menuItems` de todos los modos activos.
3. Genera un menú lateral limpio y coherente agrupado por categorías lógicas.

---

## 5. El Modelo de Negocio de los Modos: Simplicidad que Vende

El cliente final no quiere lidiar con la complejidad de instalar y configurar 15 plugins diferentes. Entiende su negocio a través de su sector.

### 5.1 Pricing por Volumen de Modos Activos (SaaS Administrado)
En lugar de cobrar por aplicación individual, cobras por la combinación y uso de modos:
* **Plan Single Mode ($9 - $15/mes)**: Perfecto para un artista independiente (`Modo Creativo`) o un pequeño restaurante local (`Modo Restaurante`).
* **Plan Multi-Mode ($29 - $49/mes)**: Para negocios cruzados como Hoteles con Restaurante (`Modo Hotel` + `Modo Restaurante`) o empresas que combinan operaciones con distribución logística.
* **Plan Business Suite ($99/mes)**: Acceso total e ilimitado a todos los 8 modos, incluyendo `Modo Dirección` para analítica de múltiples sedes y `Modo Gestión equipo` para plantillas grandes.

### 5.2 El Gancho del Consultor: El "Configurador Inicial"
Al crear una cuenta en Palm ERP, lo primero que ve el usuario es un asistente interactivo elegante:
> **"Cuéntanos sobre tu negocio. ¿A qué te dedicas?"**
> * [ ] Tengo un restaurante o bar.
> * [ ] Gestiono un hotel, hostal o casa rural.
> * [ ] Soy artista, diseñador o galerista.
> * [ ] Fabricamos o distribuimos mercancía física.
>
> *Al seleccionar tu opción, Palm activa automáticamente los modos recomendados y pre-configura la interfaz para que parezca hecha a medida.*

Este onboarding sin fricciones engancha al cliente inmediatamente, facilitando la venta de consultoría B2B personalizada para optimizar su configuración sectorial.
