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

function normalizeSlug(value: unknown): string {
  const raw = String(value ?? "").trim().toLowerCase();
  return raw.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function serializeError(error: unknown): Record<string, unknown> {
  if (!error) return { message: String(error) };
  if (error instanceof AggregateError) {
    return {
      name: error.name,
      message: error.message,
      stack: (error as Error).stack,
      errors: (error as any).errors?.map((e: unknown) =>
        e instanceof Error ? { name: (e as Error).name, message: (e as Error).message, stack: (e as Error).stack, code: (e as any).code } : String(e)
      ),
      cause: (error as any).cause ? String((error as any).cause) : undefined,
    };
  }
  if (error instanceof Error) {
    const anyErr = error as any;
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: anyErr.code,
      cause: anyErr.cause ? String(anyErr.cause) : undefined,
      errors: Array.isArray(anyErr.errors)
        ? anyErr.errors.map((e: unknown) => (e instanceof Error ? { name: (e as Error).name, message: (e as Error).message, stack: (e as Error).stack } : String(e)))
        : undefined,
    };
  }
  if (typeof error === "object") return error as Record<string, unknown>;
  return { value: String(error) };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Si el body contiene 'deploymentType', tratamos esto como una creación de nueva instancia (SAAS-only en VPS único)
    if (body.deploymentType) {
      if (body.deploymentType !== "SAAS") {
        return NextResponse.json({ success: false, error: "Solo SAAS está habilitado en este VPS. Despliegues externos se habilitarán en el futuro." }, { status: 400 });
      }

      const slug = normalizeSlug(body.slug);
      const name = String(body.name ?? "").trim();
      const adminEmail = String(body.adminEmail ?? "").trim().toLowerCase();
      const adminName = String(body.adminName ?? "").trim();
      const domainRaw = String(body.domain ?? "").trim();
      const timezone = String(body.timezone ?? "Europe/Madrid").trim() || "Europe/Madrid";
      const modes = Array.isArray(body.modes) ? body.modes : typeof body.modes === "string" ? body.modes.split(",").map((m: string) => m.trim()).filter(Boolean) : undefined;

      if (!slug || slug.length < 3) {
        return NextResponse.json({ success: false, error: "Slug inválido: mínimo 3 caracteres (a-z, 0-9, -)." }, { status: 400 });
      }
      if (!name || !adminName || !adminEmail) {
        return NextResponse.json({ success: false, error: "Faltan campos obligatorios: name, adminName, adminEmail." }, { status: 400 });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
        return NextResponse.json({ success: false, error: "Email de administrador no válido." }, { status: 400 });
      }

      // Slug uniqueness check (DB first, fallback to mock)
      try {
        const existing = await db.tenant.findUnique({ where: { slug } });
        if (existing) {
          return NextResponse.json({ success: false, error: `Ya existe una instancia con slug "${slug}".` }, { status: 409 });
        }
      } catch {
        const mockTenants = getMockTenants();
        if (mockTenants.some((t) => t.slug.toLowerCase() === slug.toLowerCase())) {
          return NextResponse.json({ success: false, error: `Ya existe una instancia con slug "${slug}" (mock).` }, { status: 409 });
        }
      }

      // Intentar provisioning real en el mismo VPS (DB palmera_<slug> en PALMERA_PLATFORM_DATABASE_URL)
      try {
        const result = await provisioningService.provision({
          slug,
          name,
          adminEmail,
          adminName,
          adminPassword: body.adminPassword,
          domain: domainRaw || undefined,
          timezone,
          modes,
          deploymentType: "SAAS",
        });

        if (!result.success) {
          return NextResponse.json({ success: false, error: "Provisioning failed", details: { message: "Provisioning returned success:false", result } }, { status: 500 });
        }

        return NextResponse.json(result);
      } catch (provisionError: any) {
        const details = serializeError(provisionError);
        const msg = (details.message as string) || String(provisionError);
        console.error("[Superadmin SAAS] Provisioning AggregateError / failure:", JSON.stringify(details, null, 2));
        const detailsStr = JSON.stringify(details);
        const isInfraMissing =
          /PLATFORM_DATABASE_URL|DATABASE_URL|ECONNREFUSED|connect ECONNREFUSED|5432|AggregateError|ensureDatabase|Postgres no disponible/i.test(
            msg + " " + detailsStr
          ) || (details as any).code === "ECONNREFUSED";

        if (isInfraMissing) {
          // Fallback dev: crear tenant en mock_db.json (mismo VPS, sin DB real)
          console.warn("[Superadmin SAAS] Infra VPS no disponible, fallback a mock:", msg);
          const mockTenants = getMockTenants();
          const newId = `t-${Date.now()}`;
          const now = new Date().toISOString();
          const newTenant = {
            id: newId,
            slug,
            name,
            domain: domainRaw || `${slug}.palmera.io`,
            isActive: true,
            createdAt: now,
            users: [
              {
                id: `u-${Date.now()}`,
                name: adminName,
                email: adminEmail,
                role: "ADMIN" as const,
                createdAt: now,
                password: body.adminPassword || undefined,
              },
            ],
          };
          const next = [newTenant, ...mockTenants];
          saveMockTenants(next as any);

          return NextResponse.json({
            success: true,
            tenantId: newId,
            databaseName: `palmera_${slug.replace(/-/g, "_")}`,
            source: "mock",
            warning: "Instancia creada en mock (sin DB). Configura PALMERA_PLATFORM_DATABASE_URL en el VPS para provisioning real.",
            details,
          });
        }

        return NextResponse.json({ success: false, error: msg, details }, { status: 500 });
      }
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
    const details = serializeError(error);
    console.error("[Superadmin SAAS] Top-level AggregateError:", JSON.stringify(details, null, 2));
    return NextResponse.json({ success: false, error: (details.message as string) || String(error), details }, { status: 500 });
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
