import { PalmModeConfig } from "@/types/core";

export const salesModule: PalmModeConfig = {
  id: "VENTAS",
  name: "Ventas",
  description: "Gestión de contactos, clientes y proveedores (CRM), embudo de ventas y oportunidades comerciales.",
  icon: "DollarSign",
  category: "Operaciones",
  menuItems: [
    { label: "Dashboard de Ventas", path: "/admin/sales" },
    { label: "Todos los Contactos", path: "/admin/contacts" },
    { label: "Embudo de Ventas", path: "/admin/crm/pipeline" },
    { label: "Oportunidades", path: "/admin/crm/opportunities" },
  ],
};