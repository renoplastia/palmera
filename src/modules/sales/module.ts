import { PalmModeConfig } from "@/types/core";

export const salesModule: PalmModeConfig = {
  id: "VENTAS",
  name: "Ventas",
  description: "Gestión de contactos, clientes y proveedores (CRM), catálogo de productos, embudo de ventas y e-commerce.",
  icon: "DollarSign",
  category: "Operaciones",
  menuItems: [
    { label: "Dashboard de Ventas", path: "/admin/sales" },
    { label: "Catálogo de Productos", path: "/admin/products" },
    { label: "E-Commerce / Pedidos", path: "/admin/sales/ecommerce" },
    { label: "Todos los Contactos", path: "/admin/contacts" },
    { label: "Embudo de Ventas", path: "/admin/crm/pipeline" },
    { label: "Oportunidades", path: "/admin/crm/opportunities" },
  ],
};