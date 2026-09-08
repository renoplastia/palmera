import { NextResponse } from "next/server";
import crypto from "node:crypto";
import db from "@/lib/db";

/**
 * Endpoint de Acceso Privilegiado para Superadmin.
 * Genera un "Magic Link" efímero que permite saltar la autenticación 
 * de contraseña para el usuario Administrador de una instancia.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tenantId, role } = body;

    console.log("[Superadmin Access] Request received:", { tenantId, role });

    if (!tenantId || role !== "ADMIN") {
      console.warn("[Superadmin Access] Invalid parameters:", { tenantId, role });
      return NextResponse.json({ success: false, error: "Parámetros inválidos" }, { status: 400 });
    }

    // 1. Verificar que el tenant existe
    console.log("[Superadmin Access] Searching for tenant:", tenantId);
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: { users: { where: { role: "ADMIN" }, take: 1 } }
    });

    if (!tenant) {
      console.error("[Superadmin Access] Tenant not found:", tenantId);
      return NextResponse.json({ success: false, error: "Instancia no encontrada" }, { status: 404 });
    }

    if (!tenant.users || tenant.users.length === 0) {
      console.error("[Superadmin Access] No ADMIN user found for tenant:", tenant.slug);
      return NextResponse.json({ success: false, error: "Administrador no encontrado en la instancia" }, { status: 404 });
    }

    const adminUser = tenant.users[0];
    console.log("[Superadmin Access] Admin user found:", adminUser.email);

    // 2. Generar un token efímero y firmado
    const token = crypto.randomBytes(32).toString("hex");
    console.log("[Superadmin Access] Generated token:", token);
    
    // Guardamos el token temporalmente en la base de datos del Tenant
    await db.setting.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: "superadmin_access_token" } },
      update: { value: token },
      create: { tenantId: tenant.id, key: "superadmin_access_token", value: token },
    });
    console.log("[Superadmin Access] Token saved to DB Settings");

    // 3. Construir la URL de acceso directo
    const protocol = "http"; 
    const host = "localhost:3000"; 
    const accessUrl = `${protocol}//${tenant.slug}.${host}/login?bypass_token=${token}&user=${adminUser.id}`;
    console.log("[Superadmin Access] Generated URL:", accessUrl);

    return NextResponse.json({
      success: true,
      url: accessUrl,
      expiresIn: "60s"
    });

  } catch (error: any) {
    console.error("[Superadmin Access] FATAL ERROR:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor: " + error.message }, { status: 500 });
  }
}
