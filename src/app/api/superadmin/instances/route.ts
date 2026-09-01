import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getMockTenants, saveMockTenants } from "@/lib/mockDb";
import { ProvisioningService } from "@/lib/provisioning";

const provisioningService = new ProvisioningService();

export async function GET() {
  try {
    // Try to fetch from real database
    const tenants = await db.tenant.findMany({
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        settings: {
          select: {
            key: true,
            value: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const auditLogs = await db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      tenants,
      auditLogs,
      source: "database",
    });
  } catch (error) {
    console.warn("Database connection failed in superadmin API, returning mock data from local JSON db:", error);

    // Fallback Mock Data from our persistent helper
    const mockTenants = getMockTenants();

    const mockAuditLogs = [
      {
        id: "al-1",
        tenant: "gastroshows",
        action: "USER_LOGIN",
        userId: "u2",
        details: "Renato García (admin@gastroshows.es) inició sesión en gastroshows.palmera.io",
        ipAddress: "192.168.1.45",
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
      {
        id: "al-2",
        tenant: "sport2live",
        action: "CRM_CONTACT_CREATED",
        userId: "u4",
        details: "Alex Ruiz creó el contacto 'Federación de Tenis' (CIF: A88372619)",
        ipAddress: "82.34.12.98",
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
      {
        id: "al-3",
        tenant: "gastroshows",
        action: "MODE_ACTIVATED",
        userId: "u2",
        details: "El sector Atención al cliente fue activado por el administrador.",
        ipAddress: "192.168.1.45",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "al-4",
        tenant: "delish-catering",
        action: "INSTANCE_SUSPENDED",
        userId: "SYSTEM",
        details: "Instancia suspendida temporalmente por falta de pago.",
        ipAddress: "127.0.0.1",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    return NextResponse.json({
      success: true,
      tenants: mockTenants,
      auditLogs: mockAuditLogs,
      source: "mock",
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Si el body contiene 'deploymentType', tratamos esto como una creación de nueva instancia
    if (body.deploymentType) {
      const result = await provisioningService.provision({
        slug: body.slug,
        name: body.name,
        adminEmail: body.adminEmail,
        adminName: body.adminName,
        adminPassword: body.adminPassword,
        domain: body.domain,
        timezone: body.timezone,
        modes: body.modes,
        deploymentType: body.deploymentType,
      });

      if (!result.success) {
        return NextResponse.json({ success: false, error: "Provisioning failed" }, { status: 500 });
      }

      return NextResponse.json(result);
    }

    // Fallback al comportamiento anterior: Sincronización masiva de tenants (Mock DB)
    const { tenants } = body;

    if (!Array.isArray(tenants)) {
      return NextResponse.json({ success: false, error: "Invalid tenants data" }, { status: 400 });
    }

    // Always persist to local mock database helper first for local prototyping
    saveMockTenants(tenants);

    // Try to update real database if connected
    try {
      for (const t of tenants) {
        await db.tenant.update({
          where: { id: t.id },
          data: {
            isActive: t.isActive,
          },
        });
      }
    } catch (e) {
      console.warn("Could not sync with Prisma on POST, fallback mock db used.");
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { tenantId, name, domain, isActive, maintenanceMode } = body;

    if (!tenantId || typeof tenantId !== "string") {
      return NextResponse.json({ success: false, error: "Missing tenantId" }, { status: 400 });
    }

    const mockTenants = getMockTenants();
    const updatedMockTenants = mockTenants.map((tenant) => {
      if (tenant.id !== tenantId) return tenant;
      return {
        ...tenant,
        name: typeof name === "string" ? name : tenant.name,
        domain: typeof domain === "string" ? domain : tenant.domain,
        isActive: typeof isActive === "boolean" ? isActive : tenant.isActive,
      };
    });
    saveMockTenants(updatedMockTenants);

    try {
      const tenant = await db.tenant.update({
        where: { id: tenantId },
        data: {
          ...(typeof name === "string" ? { name } : {}),
          ...(typeof domain === "string" ? { domain: domain || null } : {}),
          ...(typeof isActive === "boolean" ? { isActive } : {}),
        },
      });

      if (typeof maintenanceMode === "boolean") {
        await db.setting.upsert({
          where: { tenantId_key: { tenantId, key: "maintenance_mode" } },
          update: { value: String(maintenanceMode) },
          create: { tenantId, key: "maintenance_mode", value: String(maintenanceMode) },
        });
      }

      return NextResponse.json({ success: true, tenant });
    } catch (error) {
      console.warn("Could not patch tenant in Prisma, fallback mock db used.", error);
      return NextResponse.json({ success: true, source: "mock" });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Missing tenantId" }, { status: 400 });
    }

    const mockTenants = getMockTenants();
    saveMockTenants(mockTenants.filter((tenant) => tenant.id !== tenantId));

    try {
      await db.tenant.delete({
        where: { id: tenantId },
      });
      return NextResponse.json({ success: true });
    } catch (error) {
      console.warn("Could not delete tenant in Prisma, fallback mock db used.", error);
      return NextResponse.json({ success: true, source: "mock" });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
