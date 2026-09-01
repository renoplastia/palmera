import { PalmModule, PalmModeConfig } from "@/types/core";

export const purchasingModuleConfig: PalmModeConfig = {
  id: "COMPRAS_INTELIGENTES",
  name: "Compras Inteligentes",
  description: "Gestión de compras proyectadas por velocidad de consumo, 1-click order dispatch y auditoría de proveedores.",
  icon: "ShoppingBag",
  category: "Operaciones",
  menuItems: [
    { label: "Dashboard de Compras", path: "/admin/purchasing" },
    { label: "Sugerencias de Compra IA", path: "/admin/purchasing?tab=predictive" },
    { label: "Pedidos a Proveedores", path: "/admin/purchasing?tab=orders" },
    { label: "Auditoría de Albaranes", path: "/admin/purchasing?tab=audit" },
  ],
};
