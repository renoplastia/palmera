import React from "react";
import TeamDashboard from "@/modules/team/components/TeamDashboard";

export const metadata = {
  title: "Gestión de Equipo & Turnos | Palmera Core",
  description: "Cuadrantes semanales de trabajo, masa salarial, ratio de coste laboral y solicitudes de vacaciones.",
};

export default function ShiftsPage() {
  return <TeamDashboard />;
}
