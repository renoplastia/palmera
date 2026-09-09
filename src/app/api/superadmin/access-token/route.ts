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

    if (!tenantId || role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Parámetros inválidos" }, { status: 400 });
    }

    // 1. Verificar que el tenant existe
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: { users: { where: { role: "ADMIN" }, take: 1 } }
    });

    if (!tenant) {
      return NextResponse.json({ success: false, error: "Instancia no encontrada" }, { status: 404 });
    }

    if (!tenant.users || tenant.users.length === 0) {
      return NextResponse.json({ success: false, error: "Administrador no encontrado en la instancia" }, { status: 404 });
    }

    const adminUser = tenant.users[0];

    // 2. Generar un token efímero y firmado
    const token = crypto.randomBytes(32).toString("hex");
    
    // Guardamos el token temporalmente en la base de datos del Tenant (expira lógicamente en 60s, validado en auth.ts)
    await db.setting.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: "superadmin_access_token" } },
      update: { value: token },
      create: { tenantId: tenant.id, key: "superadmin_access_token", value: token },
    });

    // 3. Construir la URL de acceso directo (compatible Vercel wildcard)
    const reqUrl = new URL(req.url);
    const platformUrl = process.env.PALMERA_PLATFORM_URL || `${reqUrl.protocol}//${reqUrl.host}`;
    const baseHost = new URL(platformUrl).host;
    // En localhost usa subdominio localhost, en producción usa wildcard del dominio base
    const isLocal = baseHost.includes("localhost") || baseHost.includes("127.0.0.1");
    const targetHost = isLocal ? `${tenant.slug}.localhost:3000` : `${tenant.slug}.${baseHost.replace(/^www\./, "")}`;
    const targetProtocol = isLocal ? reqUrl.protocol : "https:";
    const accessUrl = `${targetProtocol}//${targetHost}/login?bypass_token=${token}&user=${adminUser.id}`;

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
