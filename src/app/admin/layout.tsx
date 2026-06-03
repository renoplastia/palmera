import React from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { CustomizerProvider } from "@/context/CustomizerContext";

export const metadata = {
  title: "Consola Administrativa - Palmera Core",
  description: "Núcleo de control modular de Palmera para administración de negocios.",
};

export default function NextAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CustomizerProvider>
      <AdminLayout>{children}</AdminLayout>
    </CustomizerProvider>
  );
}