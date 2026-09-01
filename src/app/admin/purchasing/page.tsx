import React from "react";
import PurchasingDashboard from "@/modules/purchasing/components/PurchasingDashboard";

export const metadata = {
  title: "Compras Inteligentes | Palmera Core",
  description: "Gestión predictiva de compras por cadencia histórica y velocidad de consumo.",
};

export default function PurchasingPage() {
  return <PurchasingDashboard />;
}
